import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  AUTHENTIC_TASKS,
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_ASSIGNMENTS,
  RUBRIC_CRITERIA,
  ORAL_DEFENSE_QUESTIONS,
  TECHNICAL_TEST_CASES
} from './src/data/seedData';
import { compareOutputs } from './src/services/testEngine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure data folder exists
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'authenticode_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load Firebase applet configuration
const firebaseConfigFile = path.join(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = {
  projectId: 'authenticode1305',
  apiKey: '',
  firestoreDatabaseId: '(default)'
};

if (fs.existsSync(firebaseConfigFile)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigFile, 'utf-8'));
  } catch (e) {
    console.error('Error reading firebase-applet-config.json', e);
  }
}

// Database state schema
interface DatabaseSchema {
  users: any[];
  classes: any[];
  students: any[];
  tasks: any[];
  assignments: any[];
  submissions: any[];
  evaluations: any[];
  secondGraderEvaluations: any[];
  appeals: any[];
  aiLogs: any[];
  auditLogs: any[];
}

function initializeDatabase(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (!parsed.assignments) {
        parsed.assignments = INITIAL_ASSIGNMENTS;
      }
      // Ensure tasks have proper aiLevel
      parsed.tasks = (parsed.tasks || []).map((t: any) => ({
        ...t,
        status: t.status || 'assigned',
        aiLevel: t.aiLevel || (t.taskNumber === 1 ? 'T1' : t.taskNumber === 2 ? 'T2' : 'T3')
      }));
      // Ensure classes have classCode
      parsed.classes = (parsed.classes || []).map((c: any) => ({
        ...c,
        classCode: c.classCode || (c.id === 'class-8a1' ? '8A1-2026' : c.id === 'class-8a2' ? '8A2-2026' : `${c.name.replace(/\s+/g, '').toUpperCase()}-2026`)
      }));
      // Remove any leftover plaintext passwordHash
      parsed.users = (parsed.users || []).map((u: any) => {
        const { passwordHash, ...cleanUser } = u;
        return cleanUser;
      });

      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      return parsed;
    } catch (err) {
      console.error('Failed to read db file, initializing fresh db:', err);
    }
  }

  // Initial Seed
  const initialDb: DatabaseSchema = {
    users: [
      {
        id: 'user-admin',
        email: 'admin@authenticode.edu.vn',
        name: 'Quản trị viên Hệ thống',
        role: 'admin',
        isApproved: true,
        status: 'approved',
        emailVerified: true,
        createdAt: '2026-09-01T08:00:00Z'
      },
      {
        id: 'user-bongnguyen',
        email: 'Bongnguyen446@gmail.com',
        name: 'Cô Bống Nguyễn',
        role: 'teacher',
        isApproved: true,
        status: 'approved',
        emailVerified: true,
        createdAt: '2026-09-01T08:00:00Z'
      },
      {
        id: 'user-second-grader',
        email: 'thay.hoang@authenticode.edu.vn',
        name: 'Thầy Hoàng Văn Hải (Giám khảo 2)',
        role: 'second_grader',
        isApproved: true,
        status: 'approved',
        emailVerified: true,
        createdAt: '2026-09-01T08:00:00Z'
      }
    ],
    classes: INITIAL_CLASSES,
    students: INITIAL_STUDENTS,
    tasks: AUTHENTIC_TASKS,
    assignments: INITIAL_ASSIGNMENTS,
    submissions: [],
    evaluations: [],
    secondGraderEvaluations: [],
    appeals: [],
    aiLogs: [],
    auditLogs: [
      {
        id: 'log-init',
        timestamp: new Date().toISOString(),
        actorId: 'system',
        actorName: 'AuthentiCode Security System',
        actorRole: 'admin',
        action: 'HỆ_THỐNG_KHỞI_TẠO',
        targetId: 'system',
        details: 'Cơ sở dữ liệu xác thực bảo mật AuthentiCode đã được tải thành công'
      }
    ]
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  return initialDb;
}

let db = initializeDatabase();

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Lỗi lưu cơ sở dữ liệu:', err);
  }
}

// Server Session Token Security (HMAC-SHA256)
// Phase 1, Requirement 6: Must not use static hardcoded secret. Generate random bytes if not set in environment.
const SERVER_SESSION_SECRET = process.env.SESSION_SECRET || (() => {
  const generated = crypto.randomBytes(32).toString('hex');
  process.env.SESSION_SECRET = generated;
  return generated;
})();

function generateServerSessionToken(user: any): string {
  const payload = JSON.stringify({
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days validity
  });
  const signature = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + signature;
}

function verifyServerSessionToken(token: string): any | null {
  if (!token || !token.includes('.')) return null;
  const [b64, signature] = token.split('.');
  try {
    const payload = Buffer.from(b64, 'base64').toString('utf-8');
    const expectedSig = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(payload).digest('hex');
    if (signature !== expectedSig) return null;
    const parsed = JSON.parse(payload);
    if (parsed.exp < Date.now()) return null;
    const user = db.users.find(u => u.id === parsed.userId && u.email.toLowerCase() === parsed.email.toLowerCase());
    if (!user || user.status !== 'approved' || !user.isApproved) return null;
    return user;
  } catch {
    return null;
  }
}

// Phase 1, Requirement 3: Cryptographically signed student session tokens with 24h expiration
function generateStudentSessionToken(student: any, classId: string): string {
  const payload = JSON.stringify({
    studentId: student.id,
    classId: classId,
    studentCode: student.studentCode,
    fullName: student.fullName,
    role: 'student',
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24h validity
  });
  const signature = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + signature;
}

function verifyStudentSessionToken(token: string): any | null {
  if (!token || !token.includes('.')) return null;
  const [b64, signature] = token.split('.');
  try {
    const payload = Buffer.from(b64, 'base64').toString('utf-8');
    const expectedSig = crypto.createHmac('sha256', SERVER_SESSION_SECRET).update(payload).digest('hex');
    if (signature !== expectedSig) return null;
    const parsed = JSON.parse(payload);
    if (parsed.exp < Date.now()) return null;
    if (parsed.role !== 'student') return null;
    return parsed;
  } catch {
    return null;
  }
}

// Server-side RBAC Middleware
interface AuthenticatedRequest extends express.Request {
  user?: any;
  studentAuth?: {
    studentId: string;
    classId: string;
    studentCode: string;
    fullName: string;
    role: 'student';
    exp: number;
  };
}

function resolveOptionalAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const studentHeader = req.headers['x-student-token'] as string;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : studentHeader;

  if (token) {
    const teacherUser = verifyServerSessionToken(token);
    if (teacherUser) {
      req.user = teacherUser;
    } else {
      const studentData = verifyStudentSessionToken(token);
      if (studentData) {
        req.studentAuth = studentData;
      }
    }
  }
  next();
}

function requireTeacherAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập tài khoản giáo viên được cấp quyền.' });
  }
  const token = authHeader.split(' ')[1];
  const user = verifyServerSessionToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Phiên làm việc đã hết hạn hoặc tài khoản chưa được phê duyệt. Vui lòng đăng nhập lại.' });
  }
  if (user.role !== 'teacher' && user.role !== 'second_grader' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập chức năng này.' });
  }
  req.user = user;
  next();
}

function requireAdminAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yêu cầu quyền Quản trị viên.' });
  }
  const token = authHeader.split(' ')[1];
  const user = verifyServerSessionToken(token);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ Quản trị viên hệ thống mới có quyền thực hiện thao tác này.' });
  }
  req.user = user;
  next();
}

function requireStudentAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const studentHeader = req.headers['x-student-token'] as string;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : studentHeader;

  if (!token) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập vào lớp học để thực hiện thao tác này.' });
  }
  const studentData = verifyStudentSessionToken(token);
  if (!studentData) {
    return res.status(401).json({ error: 'Phiên học sinh đã hết hạn hoặc không hợp lệ. Vui lòng tham gia lại lớp.' });
  }
  req.studentAuth = studentData;
  next();
}

function requireAnyAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const studentHeader = req.headers['x-student-token'] as string;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : studentHeader;

  if (!token) {
    return res.status(401).json({ error: 'Yêu cầu xác thực tài khoản hoặc phiên học sinh.' });
  }
  const teacherUser = verifyServerSessionToken(token);
  if (teacherUser) {
    req.user = teacherUser;
    return next();
  }
  const studentData = verifyStudentSessionToken(token);
  if (studentData) {
    req.studentAuth = studentData;
    return next();
  }
  return res.status(401).json({ error: 'Phiên làm việc không hợp lệ hoặc đã hết hạn.' });
}

// Gemini AI client initialization
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Live Firestore Connection Test
async function testFirestoreHealth(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
    return { connected: false, error: 'Thiếu cấu hình Firebase applet' };
  }

  const start = Date.now();
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/test/connection?key=${firebaseConfig.apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    // Phase 3, Requirement 6: Only report connected: true if read operation actually succeeds.
    // HTTP 403 must NOT be considered successful connection.
    if (res.status === 200) {
      return { connected: true, latencyMs: Date.now() - start };
    }
    const errData = await res.json().catch(() => ({}));
    if (res.status === 403) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        error: 'Chưa cấp quyền đọc/ghi trên Cloud Firestore (HTTP 403 Permission Denied - cần Publish firestore.rules lên database)'
      };
    }
    return {
      connected: false,
      error: errData.error?.message || `HTTP ${res.status}`
    };
  } catch (err: any) {
    return { connected: false, error: err.message || 'Lỗi mạng khi kết nối Firestore' };
  }
}

// --- API ROUTES ---

// Health & Status
app.get('/api/health', async (req, res) => {
  const firestoreHealth = await testFirestoreHealth();

  res.json({
    status: 'ok',
    appName: 'AuthentiCode',
    firebaseConnected: firestoreHealth.connected,
    firestoreLatencyMs: firestoreHealth.latencyMs || null,
    firestoreError: firestoreHealth.error || null,
    firebaseProjectId: firebaseConfig.projectId || null,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || null,
    serverPersistence: 'Active (Cloud Firestore Primary & Secure Local Sync)',
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

// Teacher Authentication with Firebase ID Token Verification
app.post('/api/auth/verify-teacher-token', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'Thiếu mã xác thực Firebase ID Token.' });
  }

  try {
    // Verify ID token cryptographically using Google Identity Toolkit API
    const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`;
    const verifyRes = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    if (!verifyRes.ok) {
      return res.status(401).json({ error: 'Mã xác thực Firebase không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.' });
    }

    const verifyData = await verifyRes.json();
    const firebaseUser = verifyData.users?.[0];
    if (!firebaseUser) {
      return res.status(401).json({ error: 'Không tìm thấy tài khoản người dùng trên Firebase.' });
    }

    const email = (firebaseUser.email || '').toLowerCase();
    const uid = firebaseUser.localId;
    const isEmailVerified = Boolean(firebaseUser.emailVerified);

    // Phase 1, Requirement 8: Require verified email
    if (!isEmailVerified) {
      return res.status(403).json({
        error: 'Tài khoản email chưa được xác minh trên Firebase. Vui lòng xác thực email của bạn trước khi đăng nhập hệ thống.'
      });
    }

    let user = db.users.find(u => u.email.toLowerCase() === email || u.id === uid);

    if (!user) {
      // Phase 1, Requirement 7: First-time login defaults to pending teacher. Admin must be granted through secure admin process.
      user = {
        id: uid,
        email,
        name: firebaseUser.displayName || email.split('@')[0],
        role: 'teacher',
        status: 'pending',
        isApproved: false,
        emailVerified: true,
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      db.auditLogs.push({
        id: `audit-${Date.now()}`,
        timestamp: user.createdAt,
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'ĐĂNG_KÝ_TÀI_KHOẢN_FIREBASE',
        targetId: user.id,
        details: `Giáo viên ${user.name} (${user.email}) đăng ký qua Firebase Auth và đang chờ Admin phê duyệt.`
      });
      saveDatabase();
    } else {
      user.emailVerified = true;
      saveDatabase();
    }

    // Require admin approval
    if (user.status === 'pending' || !user.isApproved) {
      return res.status(403).json({
        error: 'Tài khoản của bạn đang ở trạng thái "Chờ phê duyệt" từ Quản trị viên hệ thống. Vui lòng liên hệ Admin.',
        status: 'pending'
      });
    }

    if (user.status === 'locked' || user.status === 'rejected') {
      return res.status(403).json({
        error: 'Tài khoản của bạn đã bị khóa hoặc từ chối truy cập bởi Quản trị viên.',
        status: user.status
      });
    }

    // Issue cryptographic server session token
    const token = generateServerSessionToken(user);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        isApproved: user.isApproved
      },
      token
    });
  } catch (err: any) {
    console.error('Lỗi xác thực Firebase token:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi xác thực token: ' + err.message });
  }
});

// Legacy login & register blocked with clear migration notice
app.post('/api/auth/login', (req, res) => {
  res.status(400).json({
    error: 'Hệ thống đã nâng cấp bảo mật xác thực qua Firebase Authentication. Vui lòng đăng nhập qua Cổng xác thực Firebase (Google hoặc Email xác minh).'
  });
});

app.post('/api/auth/register', (req, res) => {
  res.status(400).json({
    error: 'Đăng ký tài khoản giáo viên hiện yêu cầu xác thực qua Firebase Authentication.'
  });
});

// User Management (Admin Only)
app.get('/api/users', requireAdminAuth, (req, res) => {
  const safeUsers = db.users.map(({ passwordHash, ...u }: any) => u);
  res.json(safeUsers);
});

// Admin update user status (approve, reject, lock, unlock)
app.put('/api/users/:id/status', requireAdminAuth, (req: AuthenticatedRequest, res) => {
  const { status } = req.body; // 'approved' | 'rejected' | 'locked' | 'pending'
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Người dùng không tồn tại.' });

  const oldStatus = user.status;
  user.status = status;
  user.isApproved = status === 'approved';

  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'admin',
    action: 'CẬP_NHẬT_TRẠNG_THÁI_NGƯỜI_DÙNG',
    targetId: user.id,
    details: `Admin ${req.user.name} thay đổi trạng thái tài khoản ${user.email} từ ${oldStatus} sang ${status}`
  });

  saveDatabase();
  const { passwordHash, ...safeUser } = user as any;
  res.json({ success: true, user: safeUser });
});

// Admin update user role (teacher, second_grader, admin)
app.put('/api/users/:id/role', requireAdminAuth, (req: AuthenticatedRequest, res) => {
  const { role } = req.body;
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Người dùng không tồn tại.' });

  const oldRole = user.role;
  user.role = role;

  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'admin',
    action: 'PHÂN_QUYỀN_NGƯỜI_DÙNG',
    targetId: user.id,
    details: `Admin ${req.user.name} thay đổi vai trò tài khoản ${user.email} từ ${oldRole} sang ${role}`
  });

  saveDatabase();
  const { passwordHash, ...safeUser } = user as any;
  res.json({ success: true, user: safeUser });
});

// --- STUDENT SESSION & CLASS JOIN (REQUIREMENT 5) ---
// Each class has a shared classCode. Students enter fullName, select classId, and provide classCode.
app.post('/api/sessions/join-class', (req, res) => {
  const { fullName, classId, classCode, studentCode } = req.body;
  if (!fullName || !classId || !classCode) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ Họ và tên, chọn Lớp và nhập Mã tham gia lớp.' });
  }

  const classGroup = db.classes.find(c => c.id === classId);
  if (!classGroup) {
    return res.status(404).json({ error: 'Lớp học không tồn tại trên hệ thống.' });
  }

  // Verify class code
  const inputCode = classCode.trim().toUpperCase();
  const actualCode = (classGroup.classCode || '').trim().toUpperCase();
  if (inputCode !== actualCode) {
    return res.status(401).json({ error: 'Mã lớp không chính xác. Vui lòng hỏi lại giáo viên phụ trách.' });
  }

  // Search students in class by name
  const cleanName = fullName.trim().toLowerCase();
  const studentsInClass = db.students.filter(s => s.classId === classId);
  const matchingStudents = studentsInClass.filter(s => s.fullName.trim().toLowerCase() === cleanName);

  let student: any = null;
  if (matchingStudents.length > 1) {
    // Duplicate names: require studentCode
    if (!studentCode) {
      return res.status(409).json({
        requireStudentCode: true,
        error: 'Phát hiện có nhiều học sinh cùng tên trong lớp. Vui lòng nhập thêm Mã học sinh (ví dụ: HS01) để xác thực.'
      });
    }
    student = matchingStudents.find(s => s.studentCode.trim().toUpperCase() === studentCode.trim().toUpperCase());
    if (!student) {
      return res.status(401).json({ error: 'Mã học sinh không khớp với họ tên trong danh sách lớp.' });
    }
  } else if (matchingStudents.length === 1) {
    student = matchingStudents[0];
  } else {
    // Phase 2, Requirement 7: Do not auto-create student in roster. Must be added by teacher.
    return res.status(404).json({
      error: 'Họ và tên của em không có trong danh sách lớp này. Vui lòng liên hệ giáo viên phụ trách để được thêm vào danh sách lớp trước khi vào làm bài.'
    });
  }

  // Phase 1, Requirement 3: Cryptographically signed student session token (valid 24h)
  const studentToken = generateStudentSessionToken(student, classGroup.id);

  // Strip classCode from response to prevent unauthorized leakage
  const { classCode: _cCode, ...safeClassGroup } = classGroup;

  res.json({
    student,
    classGroup: safeClassGroup,
    studentToken,
    tasks: db.tasks
  });
});

// Verify individual assignment code (Phase 2, Requirement 4)
app.post('/api/assignments/verify-individual-code', resolveOptionalAuth, (req: AuthenticatedRequest, res) => {
  const { assignmentId, studentId, individualCode } = req.body;
  const effectiveStudentId = req.studentAuth?.studentId || studentId;

  if (!assignmentId || !individualCode || !effectiveStudentId) {
    return res.status(400).json({ error: 'Thiếu thông tin xác thực bài tập cá nhân.' });
  }

  const assignment = (db.assignments || []).find((a: any) => a.id === assignmentId);
  if (!assignment) {
    return res.status(404).json({ error: 'Bài tập không tồn tại.' });
  }

  if (assignment.targetType !== 'individual_students' || !assignment.individualAssignmentCode) {
    return res.json({ valid: true, message: 'Bài tập này áp dụng chung cho lớp, không yêu cầu mã cá nhân.' });
  }

  // Check student membership in targeted student list
  if (Array.isArray(assignment.targetStudentIds) && !assignment.targetStudentIds.includes(effectiveStudentId)) {
    return res.status(403).json({
      valid: false,
      error: 'Bạn không thuộc danh sách học sinh được giao bài tập cá nhân này.'
    });
  }

  // Check code match
  const inputCode = (individualCode || '').trim().toUpperCase();
  const actualCode = (assignment.individualAssignmentCode || '').trim().toUpperCase();

  if (inputCode !== actualCode) {
    return res.status(403).json({
      valid: false,
      error: 'Mã bài tập cá nhân không chính xác. Vui lòng kiểm tra lại mã được giáo viên cấp.'
    });
  }

  res.json({
    valid: true,
    message: 'Xác thực mã bài tập cá nhân thành công.'
  });
});

// Legacy verify session
app.post('/api/sessions/verify', (req, res) => {
  const { sessionCode } = req.body;
  if (!sessionCode) {
    return res.status(400).json({ error: 'Vui lòng nhập mã phiên.' });
  }

  const cleanCode = sessionCode.trim().toUpperCase();
  const student = db.students.find(s => (s.sessionCode || '').toUpperCase() === cleanCode);

  if (!student) {
    return res.status(401).json({
      error: 'Mã phiên không tồn tại. Vui lòng tham gia bằng Họ tên và Mã lớp.'
    });
  }

  const studentClass = db.classes.find(c => c.id === student.classId);

  res.json({
    student,
    classGroup: studentClass,
    tasks: db.tasks
  });
});

// --- CLASSES & STUDENTS ---
// Phase 1, Requirement 1 & 9: Do not expose classCode publicly. Only return classCode to the teacher in charge or admin.
app.get('/api/classes', resolveOptionalAuth, (req: AuthenticatedRequest, res) => {
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'second_grader')) {
    const isSystemAdmin = req.user.role === 'admin';
    return res.json(db.classes.map(c => {
      const isOwnerTeacher = isSystemAdmin || c.teacherId === req.user.id || c.teacherName === req.user.name;
      return {
        id: c.id,
        name: c.name,
        grade: c.grade,
        academicYear: c.academicYear,
        teacherId: c.teacherId,
        teacherName: c.teacherName,
        studentCount: c.studentCount,
        classCode: isOwnerTeacher ? c.classCode : undefined
      };
    }));
  }

  // Public/Student view: never expose classCode!
  res.json(db.classes.map(c => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    academicYear: c.academicYear,
    studentCount: c.studentCount
  })));
});

app.post('/api/classes', requireTeacherAuth, (req: AuthenticatedRequest, res) => {
  const { name, grade, academicYear, classCode } = req.body;
  const newClass = {
    id: `class-${Date.now()}`,
    name: name || 'Lớp mới',
    grade: Number(grade) || 8,
    academicYear: academicYear || '2025-2026',
    classCode: classCode ? classCode.trim().toUpperCase() : `${(name || 'LOP').replace(/\s+/g, '').toUpperCase()}-${new Date().getFullYear()}`,
    teacherId: req.user.id,
    teacherName: req.user.name,
    studentCount: 0,
    createdAt: new Date().toISOString()
  };
  db.classes.push(newClass);
  saveDatabase();
  res.status(201).json(newClass);
});

// Phase 1, Requirement 2 & 9: Protect students list with class ownership check
app.get('/api/classes/:id/students', requireTeacherAuth, (req: AuthenticatedRequest, res) => {
  const classGroup = db.classes.find(c => c.id === req.params.id);
  if (!classGroup) {
    return res.status(404).json({ error: 'Lớp học không tồn tại.' });
  }

  const isAdmin = req.user.role === 'admin';
  const isClassTeacher = classGroup.teacherId === req.user.id || classGroup.teacherName === req.user.name;
  if (!isAdmin && !isClassTeacher) {
    return res.status(403).json({ error: 'Bạn không phụ trách lớp này nên không thể xem danh sách học sinh.' });
  }

  const students = db.students.filter(s => s.classId === req.params.id);
  res.json(students);
});

app.post('/api/classes/:id/students', requireTeacherAuth, (req, res) => {
  const { fullName, studentCode, notes } = req.body;
  const classGroup = db.classes.find(c => c.id === req.params.id);
  if (!classGroup) return res.status(404).json({ error: 'Lớp không tồn tại.' });

  const newStudent = {
    id: `student-${Date.now()}`,
    classId: classGroup.id,
    studentCode: studentCode || `HS${String(db.students.length + 1).padStart(2, '0')}`,
    fullName: fullName || 'Học sinh mới',
    notes: notes || ''
  };

  db.students.push(newStudent);
  classGroup.studentCount = db.students.filter(s => s.classId === classGroup.id).length;
  saveDatabase();

  res.status(201).json(newStudent);
});

// Generate Class Sessions / Code
app.post('/api/classes/:id/generate-sessions', requireTeacherAuth, (req, res) => {
  const classGroup = db.classes.find(c => c.id === req.params.id);
  if (!classGroup) return res.status(404).json({ error: 'Lớp không tồn tại.' });

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  classGroup.classCode = `${classGroup.name.replace(/\s+/g, '').toUpperCase()}-${randomDigits}`;

  saveDatabase();
  res.json({ success: true, classCode: classGroup.classCode, classGroup });
});

// --- TASKS MANAGEMENT & BANK ---
app.get('/api/tasks', (req, res) => {
  const { status, aiLevel } = req.query;
  let result = [...db.tasks];

  if (status) {
    result = result.filter(t => t.status === status);
  }
  if (aiLevel) {
    result = result.filter(t => t.aiLevel === aiLevel);
  }

  res.json(result);
});

app.get('/api/tasks/:id', (req, res) => {
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Nhiệm vụ không tồn tại.' });
  res.json(task);
});

app.post('/api/tasks', requireTeacherAuth, (req: AuthenticatedRequest, res) => {
  const {
    title,
    subtitle,
    objective,
    aiLevel,
    problemStatement,
    inputDescription,
    outputDescription,
    sampleInput,
    sampleOutput,
    requirements,
    mandatoryTestCases,
    starterCode,
    allowedAIPromptingRules,
    status
  } = req.body;

  if (!title || !problemStatement) {
    return res.status(400).json({ error: 'Tên bài tập và đề bài là bắt buộc.' });
  }

  const cleanAiLevel = (aiLevel as 'T1' | 'T2' | 'T3') || 'T1';
  let aiMode: 'none' | 'guided_hints_only' | 'open_with_disclosure' = 'none';
  let aiModeLabel = 'Nghiêm cấm dùng AI (T1)';

  if (cleanAiLevel === 'T2') {
    aiMode = 'guided_hints_only';
    aiModeLabel = 'AI gợi mở sư phạm (T2)';
  } else if (cleanAiLevel === 'T3') {
    aiMode = 'open_with_disclosure';
    aiModeLabel = 'Bắt buộc dùng AI & Minh bạch (T3)';
  }

  const defaultPromptRules = cleanAiLevel === 'T1'
    ? 'Trong nhiệm vụ này, trợ lý AI bị vô hiệu hóa hoàn toàn trên hệ thống. Học sinh phải tự tư duy và lập trình độc lập.'
    : cleanAiLevel === 'T2'
    ? 'Gemini chỉ được đóng vai trò giáo viên gợi mở Socratic, gợi ý kiểm tra điều kiện biên và cấu trúc lệnh, tuyệt đối không cung cấp mã hoàn chỉnh.'
    : 'Học sinh được phép yêu cầu AI hỗ trợ nhưng bắt buộc phải lưu toàn bộ lịch sử Prompt & Response và chứng minh đóng góp cá nhân.';

  const now = new Date().toISOString();
  const newTask = {
    id: `task-${Date.now()}`,
    taskNumber: db.tasks.length + 1,
    title: title.trim(),
    subtitle: subtitle || (cleanAiLevel === 'T1' ? 'Lập trình độc lập không dùng AI' : cleanAiLevel === 'T2' ? 'Sử dụng AI có giới hạn (Sửa lỗi)' : 'Bắt buộc sử dụng AI và công khai'),
    objective: objective || 'Đánh giá năng lực giải quyết vấn đề bằng Python của học sinh.',
    aiMode,
    aiLevel: cleanAiLevel,
    aiModeLabel,
    problemStatement: problemStatement.trim(),
    inputDescription: inputDescription || '',
    outputDescription: outputDescription || '',
    sampleInput: sampleInput || '',
    sampleOutput: sampleOutput || '',
    requirements: Array.isArray(requirements) && requirements.length > 0 ? requirements : [
      'Phân tích dữ liệu đầu vào và đầu ra.',
      'Thiết kế thuật toán / giả mã trước khi viết mã.',
      'Viết mã nguồn Python có chú thích rõ ràng.',
      'Xây dựng các test case tự kiểm thử.',
      'Tự đánh giá mức độ hiểu biết.'
    ],
    mandatoryTestCases: Array.isArray(mandatoryTestCases) && mandatoryTestCases.length > 0 ? mandatoryTestCases : [
      {
        input: sampleInput || '',
        expectedOutput: sampleOutput || '',
        description: 'Test case mẫu'
      }
    ],
    starterCode: starterCode || '',
    allowedAIPromptingRules: allowedAIPromptingRules || defaultPromptRules,
    status: (status as 'draft' | 'published') || 'draft',
    createdAt: now,
    updatedAt: now,
    authorTeacherId: req.user.id,
    authorTeacherName: req.user.name
  };

  db.tasks.push(newTask);
  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: now,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: newTask.status === 'published' ? 'XUẤT_BẢN_BÀI_TẬP' : 'TẠO_BÀI_TẬP_NHÁP',
    targetId: newTask.id,
    details: `Giáo viên ${req.user.name} tạo bài tập "${newTask.title}" (Mức AI: ${newTask.aiLevel}, Trạng thái: ${newTask.status})`
  });

  saveDatabase();
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', requireTeacherAuth, (req: AuthenticatedRequest, res) => {
  const taskIndex = db.tasks.findIndex(t => t.id === req.params.id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Nhiệm vụ không tồn tại.' });
  }

  const existing = db.tasks[taskIndex];
  const {
    title,
    subtitle,
    objective,
    aiLevel,
    problemStatement,
    inputDescription,
    outputDescription,
    sampleInput,
    sampleOutput,
    requirements,
    mandatoryTestCases,
    starterCode,
    allowedAIPromptingRules,
    status
  } = req.body;

  const now = new Date().toISOString();
  let aiMode = existing.aiMode;
  let aiModeLabel = existing.aiModeLabel;

  if (aiLevel) {
    if (aiLevel === 'T1') {
      aiMode = 'none';
      aiModeLabel = 'Nghiêm cấm dùng AI (T1)';
    } else if (aiLevel === 'T2') {
      aiMode = 'guided_hints_only';
      aiModeLabel = 'AI gợi mở sư phạm (T2)';
    } else if (aiLevel === 'T3') {
      aiMode = 'open_with_disclosure';
      aiModeLabel = 'Bắt buộc dùng AI & Minh bạch (T3)';
    }
  }

  const updatedTask = {
    ...existing,
    title: title !== undefined ? title.trim() : existing.title,
    subtitle: subtitle !== undefined ? subtitle : existing.subtitle,
    objective: objective !== undefined ? objective : existing.objective,
    aiLevel: aiLevel || existing.aiLevel,
    aiMode,
    aiModeLabel,
    problemStatement: problemStatement !== undefined ? problemStatement.trim() : existing.problemStatement,
    inputDescription: inputDescription !== undefined ? inputDescription : existing.inputDescription,
    outputDescription: outputDescription !== undefined ? outputDescription : existing.outputDescription,
    sampleInput: sampleInput !== undefined ? sampleInput : existing.sampleInput,
    sampleOutput: sampleOutput !== undefined ? sampleOutput : existing.sampleOutput,
    requirements: requirements !== undefined ? requirements : existing.requirements,
    mandatoryTestCases: mandatoryTestCases !== undefined ? mandatoryTestCases : existing.mandatoryTestCases,
    starterCode: starterCode !== undefined ? starterCode : existing.starterCode,
    allowedAIPromptingRules: allowedAIPromptingRules !== undefined ? allowedAIPromptingRules : existing.allowedAIPromptingRules,
    status: status || existing.status,
    updatedAt: now
  };

  db.tasks[taskIndex] = updatedTask;
  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: now,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'CHỈNH_SỬA_BÀI_TẬP',
    targetId: updatedTask.id,
    details: `Giáo viên ${req.user.name} cập nhật bài tập "${updatedTask.title}"`
  });

  saveDatabase();
  res.json(updatedTask);
});

app.post('/api/tasks/:id/publish', requireTeacherAuth, (req: AuthenticatedRequest, res) => {
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Nhiệm vụ không tồn tại.' });

  task.status = 'published';
  task.updatedAt = new Date().toISOString();

  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: task.updatedAt,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'XUẤT_BẢN_BÀI_TẬP',
    targetId: task.id,
    details: `Giáo viên ${req.user.name} xuất bản bài tập "${task.title}"`
  });

  saveDatabase();
  res.json({ success: true, task });
});

app.delete('/api/tasks/:id', requireTeacherAuth, (req, res) => {
  const taskIndex = db.tasks.findIndex(t => t.id === req.params.id);
  if (taskIndex === -1) return res.status(404).json({ error: 'Nhiệm vụ không tồn tại.' });

  const task = db.tasks[taskIndex];
  const hasSubmissions = db.submissions.some(s => s.taskId === task.id);
  if (hasSubmissions) {
    return res.status(400).json({ error: 'Không thể xóa bài tập đã có học sinh nộp bài.' });
  }

  db.tasks.splice(taskIndex, 1);
  saveDatabase();
  res.json({ success: true });
});

// --- ASSIGNMENTS MANAGEMENT ---
app.get('/api/assignments', requireTeacherAuth, (req, res) => {
  res.json(db.assignments || []);
});

app.post('/api/assignments', requireTeacherAuth, (req: AuthenticatedRequest, res) => {
  const {
    taskId,
    targetType,
    targetClassIds,
    targetStudentIds,
    startTime,
    dueTime,
    teacherNotes
  } = req.body;

  if (!taskId) {
    return res.status(400).json({ error: 'Vui lòng chọn bài tập cần giao.' });
  }

  const task = db.tasks.find(t => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: 'Bài tập không tồn tại trong ngân hàng.' });
  }

  let classIds: string[] = [];
  let classNames: string[] = [];

  if (targetType === 'all_classes') {
    classIds = db.classes.map(c => c.id);
    classNames = db.classes.map(c => c.name);
  } else if (Array.isArray(targetClassIds) && targetClassIds.length > 0) {
    classIds = targetClassIds;
    classNames = db.classes
      .filter(c => targetClassIds.includes(c.id))
      .map(c => c.name);
  } else if (targetType === 'individual_students' && Array.isArray(targetStudentIds) && targetStudentIds.length > 0) {
    const assignedStudents = db.students.filter(s => targetStudentIds.includes(s.id));
    classIds = Array.from(new Set(assignedStudents.map(s => s.classId)));
    classNames = db.classes.filter(c => classIds.includes(c.id)).map(c => c.name);
  } else {
    return res.status(400).json({ error: 'Vui lòng chọn đối tượng giao bài (lớp hoặc học sinh).' });
  }

  // Generate individual code if target is individual students
  let individualAssignmentCode: string | undefined = undefined;
  if (targetType === 'individual_students') {
    const rand = Math.floor(1000 + Math.random() * 9000);
    individualAssignmentCode = `TASK-IND-${rand}`;
  }

  const now = new Date().toISOString();
  const newAssignment = {
    id: `assign-${Date.now()}`,
    taskId: task.id,
    taskTitle: task.title,
    taskNumber: task.taskNumber,
    aiLevel: task.aiLevel || 'T1',
    targetType: targetType || 'single_class',
    targetClassIds: classIds,
    targetClassNames: classNames,
    targetStudentIds: targetType === 'individual_students' ? targetStudentIds : undefined,
    individualAssignmentCode,
    startTime: startTime || now,
    dueTime: dueTime || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    teacherNotes: teacherNotes || '',
    assignedAt: now,
    assignedByTeacherId: req.user.id,
    assignedByTeacherName: req.user.name,
    status: 'assigned' as const
  };

  if (!db.assignments) db.assignments = [];
  db.assignments.push(newAssignment);

  task.status = 'assigned';
  task.updatedAt = now;

  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: now,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'GIAO_BÀI_TẬP',
    targetId: newAssignment.id,
    details: `Giáo viên ${req.user.name} giao bài "${task.title}" cho ${classNames.join(', ')}`
  });

  saveDatabase();
  res.status(201).json(newAssignment);
});

// Student's Assigned Tasks
app.get('/api/assignments/my-tasks', resolveOptionalAuth, (req: AuthenticatedRequest, res) => {
  let effectiveStudentId = '';
  let effectiveClassId = '';

  if (req.studentAuth) {
    effectiveStudentId = req.studentAuth.studentId;
    effectiveClassId = req.studentAuth.classId;
  } else if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin')) {
    effectiveStudentId = String(req.query.studentId || '');
    effectiveClassId = String(req.query.classId || '');
  } else {
    return res.status(401).json({ error: 'Cần phiên xác thực học sinh hoặc tài khoản giáo viên để xem bài tập.' });
  }

  if (!effectiveStudentId || !effectiveClassId) {
    return res.status(400).json({ error: 'Thiếu studentId hoặc classId.' });
  }

  const now = new Date();
  const allAssignments = db.assignments || [];

  const studentAssignments = allAssignments.filter((a: any) => {
    if (a.status !== 'assigned') return false;

    // Giai đoạn 2, Yêu cầu 2: Nếu targetType là individual_students, chỉ trả bài cho studentId thuộc targetStudentIds
    if (a.targetType === 'individual_students') {
      if (!Array.isArray(a.targetStudentIds) || !a.targetStudentIds.includes(effectiveStudentId)) {
        return false;
      }
    } else {
      const isClassMatch = Array.isArray(a.targetClassIds) && a.targetClassIds.includes(effectiveClassId);
      if (!isClassMatch) return false;
    }

    const start = new Date(a.startTime);
    return start <= now;
  });

  const result = studentAssignments.map((a: any) => {
    const task = db.tasks.find(t => t.id === a.taskId);
    const sub = db.submissions.find(s => s.taskId === a.taskId && s.studentId === effectiveStudentId);
    const isOverdue = new Date(a.dueTime) < now;

    let studentStatus = 'not_started';
    if (sub) {
      studentStatus = sub.status;
    }

    // Giai đoạn 2, Yêu cầu 3: Không trả individualAssignmentCode trong API học sinh
    const safeAssignment = { ...a };
    const requiresIndividualCode = Boolean(safeAssignment.individualAssignmentCode);
    delete safeAssignment.individualAssignmentCode;

    return {
      assignment: safeAssignment,
      task,
      submission: sub || null,
      studentStatus,
      isOverdue,
      requiresIndividualCode
    };
  }).filter((item: any) => item.task != null);

  res.json(result);
});

// Assignment Tracker (Teacher only)
app.get('/api/assignments/:id/tracker', requireTeacherAuth, (req, res) => {
  const assignment = (db.assignments || []).find((a: any) => a.id === req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: 'Đợt giao bài không tồn tại.' });
  }

  const task = db.tasks.find(t => t.id === assignment.taskId);

  let targetedStudents: any[] = [];
  if (assignment.targetType === 'individual_students' && Array.isArray(assignment.targetStudentIds)) {
    targetedStudents = db.students.filter(s => assignment.targetStudentIds.includes(s.id));
  } else if (Array.isArray(assignment.targetClassIds)) {
    targetedStudents = db.students.filter(s => assignment.targetClassIds.includes(s.classId));
  }

  const now = new Date();
  const dueDate = new Date(assignment.dueTime);

  const roster = targetedStudents.map(student => {
    const classGroup = db.classes.find(c => c.id === student.classId);
    const sub = db.submissions.find(s => s.taskId === assignment.taskId && s.studentId === student.id);
    const evalData = sub ? db.evaluations.find(e => e.submissionId === sub.id) : null;

    let status = 'not_started';
    let isLate = false;

    if (sub) {
      status = sub.status;
      if (sub.status === 'submitted' || sub.status === 'graded') {
        const subDate = new Date(sub.updatedAt);
        isLate = subDate > dueDate;
      }
    } else if (now > dueDate) {
      status = 'overdue';
    }

    return {
      studentId: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      classId: student.classId,
      className: classGroup?.name || 'Lớp',
      status,
      isLate,
      submission: sub || null,
      currentVersion: sub?.currentVersion || 0,
      submittedAt: sub?.updatedAt || null,
      score: evalData ? evalData.weightedScore10 : null,
      oralConfirmed: Boolean(evalData?.oralDefense?.ownershipConfirmed)
    };
  });

  const total = roster.length;
  const submitted = roster.filter(r => r.status === 'submitted' || r.status === 'graded' || r.status === 'oral_defense_pending').length;
  const graded = roster.filter(r => r.status === 'graded').length;
  const notStarted = roster.filter(r => r.status === 'not_started' || r.status === 'overdue').length;
  const submissionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

  res.json({
    assignment,
    task,
    stats: {
      totalStudents: total,
      submittedCount: submitted,
      gradedCount: graded,
      notStartedCount: notStarted,
      submissionRate
    },
    roster
  });
});

// --- SUBMISSIONS ---
app.get('/api/submissions', requireAnyAuth, (req: AuthenticatedRequest, res) => {
  let result = [...db.submissions];

  if (req.studentAuth) {
    // Giai đoạn 1, Yêu cầu 5: Học sinh chỉ được xem bài nộp của chính mình
    result = result.filter(s => s.studentId === req.studentAuth!.studentId);
  } else if (req.user?.role === 'teacher') {
    // Giáo viên chỉ xem được các bài nộp của lớp mình phụ trách (trừ admin)
    if (req.user.role !== 'admin') {
      const teacherClassIds = new Set(
        db.classes.filter(c => c.teacherId === req.user!.id || c.teacherName === req.user!.name).map(c => c.id)
      );
      if (teacherClassIds.size > 0) {
        result = result.filter(s => teacherClassIds.has(s.classId));
      }
    }
    const { studentId, classId, taskId, status } = req.query;
    if (studentId) result = result.filter(s => s.studentId === studentId);
    if (classId) result = result.filter(s => s.classId === classId);
    if (taskId) result = result.filter(s => s.taskId === taskId);
    if (status) result = result.filter(s => s.status === status);
  } else if (req.user?.role === 'admin' || req.user?.role === 'second_grader') {
    const { studentId, classId, taskId, status } = req.query;
    if (studentId) result = result.filter(s => s.studentId === studentId);
    if (classId) result = result.filter(s => s.classId === classId);
    if (taskId) result = result.filter(s => s.taskId === taskId);
    if (status) result = result.filter(s => s.status === status);
  }

  res.json(result);
});

app.get('/api/submissions/:id', requireAnyAuth, (req: AuthenticatedRequest, res) => {
  const sub = db.submissions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Bài nộp không tồn tại.' });

  // Giai đoạn 1, Yêu cầu 5: Học sinh không thể xem bài nộp của học sinh khác
  if (req.studentAuth && sub.studentId !== req.studentAuth.studentId) {
    return res.status(403).json({ error: 'Không có quyền truy cập bài nộp của học sinh khác.' });
  }

  res.json(sub);
});

app.post('/api/submissions', requireAnyAuth, (req: AuthenticatedRequest, res) => {
  let studentId = '';
  let studentName = '';
  let studentCode = '';
  let classId = '';
  let className = '';

  if (req.studentAuth) {
    // Giai đoạn 1, Yêu cầu 4: Xác minh studentId từ phiên máy chủ, không tin dữ liệu do client gửi
    studentId = req.studentAuth.studentId;
    studentName = req.studentAuth.fullName;
    studentCode = req.studentAuth.studentCode;
    classId = req.studentAuth.classId;
    className = db.classes.find(c => c.id === classId)?.name || 'Lớp';
  } else if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin')) {
    studentId = req.body.studentId;
    studentName = req.body.studentName || 'Học sinh';
    studentCode = req.body.studentCode || 'HS';
    classId = req.body.classId || 'class-8a1';
    className = req.body.className || 'Lớp';
  } else {
    return res.status(401).json({ error: 'Cần phiên xác thực học sinh hợp lệ để nộp bài.' });
  }

  const {
    taskId,
    taskNumber,
    submissionData,
    isFinalSubmission
  } = req.body;

  if (!taskId) {
    return res.status(400).json({ error: 'Thiếu thông tin taskId.' });
  }

  const task = db.tasks.find(t => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: 'Bài tập không tồn tại trong hệ thống.' });
  }

  // Giai đoạn 2, Yêu cầu 5: Kiểm tra quyền mở bài, nộp bài và thời hạn ở máy chủ
  const now = new Date();
  const assignment = (db.assignments || []).find(
    (a: any) => a.taskId === taskId && a.status === 'assigned' &&
      (a.targetType === 'individual_students' ? (a.targetStudentIds || []).includes(studentId) : (a.targetClassIds || []).includes(classId))
  );

  if (assignment) {
    if (new Date(assignment.startTime) > now) {
      return res.status(403).json({ error: 'Chưa đến thời gian bắt đầu làm bài tập này.' });
    }
  }

  // Giai đoạn 4, Yêu cầu 6: Enforce mandatory AI disclosure for T3 tasks on final submission
  const aiLevel = assignment?.aiLevel || task.aiLevel || 'T1';
  if (aiLevel === 'T3' && isFinalSubmission) {
    const disclosure = submissionData?.aiDisclosure;
    if (!disclosure || !disclosure.whatVerified || !disclosure.studentContribution) {
      return res.status(400).json({
        error: 'Bài tập mức độ T3 bắt buộc phải đính kèm Bản công khai và kiểm chứng AI (AI Disclosure & Verification) trước khi nộp chính thức.'
      });
    }
  }

  let existing = db.submissions.find(s => s.taskId === taskId && s.studentId === studentId);
  const timestamp = now.toISOString();

  if (existing) {
    const newVersionNumber = (existing.currentVersion || 1) + 1;
    const newVersion = {
      versionNumber: newVersionNumber,
      submittedAt: timestamp,
      ...submissionData
    };

    existing.versions.push(newVersion);
    existing.currentVersion = newVersionNumber;
    existing.updatedAt = timestamp;
    if (isFinalSubmission) {
      existing.status = 'submitted';
    }

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      timestamp,
      actorId: studentId,
      actorName: studentName,
      actorRole: 'student',
      action: isFinalSubmission ? 'NỘP_PHIÊN_BẢN_MỚI' : 'LƯU_BẢN_NHÁP_PHIÊN_BẢN',
      targetId: existing.id,
      details: `Học sinh ${studentName} đã cập nhật phiên bản ${newVersionNumber} cho Nhiệm vụ "${task.title}"`
    });

    saveDatabase();
    return res.json(existing);
  }

  const newSubmission = {
    id: `sub-${Date.now()}`,
    taskId,
    taskNumber: Number(taskNumber) || task.taskNumber || 1,
    studentId,
    studentName,
    studentCode,
    classId,
    className,
    status: isFinalSubmission ? 'submitted' : 'draft',
    currentVersion: 1,
    versions: [
      {
        versionNumber: 1,
        submittedAt: timestamp,
        ...submissionData
      }
    ],
    createdAt: timestamp,
    updatedAt: timestamp
  };

  db.submissions.push(newSubmission);
  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp,
    actorId: studentId,
    actorName: studentName,
    actorRole: 'student',
    action: isFinalSubmission ? 'NỘP_BÀI_LẦN_ĐẦU' : 'TẠO_BẢN_NHÁP',
    targetId: newSubmission.id,
    details: `Học sinh ${studentName} khởi tạo bài nộp cho nhiệm vụ "${task.title}"`
  });

  saveDatabase();
  res.status(201).json(newSubmission);
});

// --- TEACHER EVALUATIONS & RUBRICS ---
app.get('/api/evaluations', requireAnyAuth, (req: AuthenticatedRequest, res) => {
  const { submissionId, graderRole } = req.query;
  let evals = [...db.evaluations];

  if (submissionId) {
    evals = evals.filter(e => e.submissionId === submissionId);
  }
  if (graderRole) {
    evals = evals.filter(e => e.graderRole === graderRole);
  }

  if (req.studentAuth) {
    // Giai đoạn 1, Yêu cầu 5: Học sinh chỉ xem đánh giá cho bài nộp của chính mình
    const studentSubIds = new Set(
      db.submissions.filter(s => s.studentId === req.studentAuth!.studentId).map(s => s.id)
    );
    evals = evals.filter(e => studentSubIds.has(e.submissionId));
    // Ẩn đánh giá nội bộ của giám khảo 2 trước khi hòa giải
    evals = evals.filter(e => e.isFinalDecision || e.graderRole === 'teacher' || e.graderRole === 'consensus');
  } else if (req.user?.role === 'second_grader') {
    // Giai đoạn 4, Yêu cầu 1: Blind Grading - Giám khảo 2 không được thấy điểm giám khảo 1 trước khi tự chấm
    evals = evals.map(e => {
      if (e.graderRole === 'teacher') {
        const grader2Submitted = db.evaluations.some(
          e2 => e2.submissionId === e.submissionId && e2.graderRole === 'second_grader'
        );
        if (!grader2Submitted) {
          return {
            ...e,
            weightedScore10: -1,
            criterionGrades: [],
            generalFeedback: 'Điểm đang được ẩn để đảm bảo nguyên tắc chấm độc lập (Blind Grading)',
            oralDefense: undefined
          };
        }
      }
      return e;
    });
  }

  res.json(evals);
});

app.post('/api/evaluations', requireTeacherAuth, (req: AuthenticatedRequest, res) => {
  const {
    submissionId,
    criterionGrades,
    generalFeedback,
    strengths,
    weaknesses,
    recommendations,
    oralDefense,
    isFinalDecision
  } = req.body;

  if (!submissionId || !criterionGrades) {
    return res.status(400).json({ error: 'Thiếu dữ liệu đánh giá.' });
  }

  // Giai đoạn 4, Yêu cầu 4: Trọng số Rubric chuẩn hóa R1–R6 (15%, 20%, 25%, 20%, 10%, 10% = 100%)
  const weights: Record<string, number> = {
    R1: 0.15,
    R2: 0.20,
    R3: 0.25,
    R4: 0.20,
    R5: 0.10,
    R6: 0.10
  };

  let totalWeightedRatio = 0;
  for (const cg of criterionGrades) {
    const level = Number(cg.selectedLevel) || 0;
    const clampedLevel = Math.max(0, Math.min(4, level));
    const ratio = clampedLevel / 4;
    const w = weights[cg.criterionId] !== undefined ? weights[cg.criterionId] : 0.15;
    totalWeightedRatio += ratio * w;
  }

  const weightedScore10 = Math.round(totalWeightedRatio * 10 * 10) / 10;

  // Use authenticated identity - do NOT trust client graderId or role!
  const graderId = req.user.id;
  const graderName = req.user.name;
  const graderRole = req.user.role === 'second_grader' ? 'second_grader' : 'teacher';

  const newEval = {
    id: `eval-${Date.now()}`,
    submissionId,
    graderId,
    graderName,
    graderRole,
    gradedAt: new Date().toISOString(),
    criterionGrades,
    weightedScore10,
    generalFeedback: generalFeedback || '',
    strengths: strengths || '',
    weaknesses: weaknesses || '',
    recommendations: recommendations || '',
    oralDefense,
    isFinalDecision: Boolean(isFinalDecision)
  };

  const existingIndex = db.evaluations.findIndex(
    e => e.submissionId === submissionId && e.graderId === graderId
  );
  if (existingIndex >= 0) {
    db.evaluations[existingIndex] = newEval;
  } else {
    db.evaluations.push(newEval);
  }

  const sub = db.submissions.find(s => s.id === submissionId);
  if (sub) {
    // Giai đoạn 4, Yêu cầu 7: Vấn đáp do giáo viên xác nhận trực tiếp
    sub.status = oralDefense?.ownershipConfirmed ? 'graded' : (oralDefense ? 'graded' : 'oral_defense_pending');
    sub.updatedAt = new Date().toISOString();
  }

  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: graderId,
    actorName: graderName,
    actorRole: graderRole,
    action: 'LƯU_ĐÁNH_GIÁ_RUBRIC',
    targetId: submissionId,
    details: `Giáo viên ${graderName} lưu điểm Rubric: ${weightedScore10}/10 cho bài nộp ${submissionId}`
  });

  saveDatabase();
  res.json({ evaluation: newEval, submission: sub });
});

// Double Grading
app.get('/api/double-grading/:submissionId', requireTeacherAuth, (req: AuthenticatedRequest, res) => {
  const { submissionId } = req.params;

  const evals = db.evaluations.filter(e => e.submissionId === submissionId);
  const grader1Eval = evals.find(e => e.graderRole === 'teacher') || evals[0];
  const grader2Eval = evals.find(e => e.graderRole === 'second_grader') || (evals.length > 1 ? evals[1] : undefined);

  if (!grader1Eval) {
    return res.status(404).json({ error: 'Bài nộp chưa có đánh giá lần 1.' });
  }

  const isGrader2Finished = Boolean(grader2Eval);
  let consensusRate = 100;
  let scoreDelta = 0;
  const divergentCriteria: any[] = [];

  if (grader1Eval && grader2Eval) {
    scoreDelta = Math.abs(grader1Eval.weightedScore10 - grader2Eval.weightedScore10);
    scoreDelta = Math.round(scoreDelta * 10) / 10;

    let matchingCount = 0;
    const totalCriteria = grader1Eval.criterionGrades.length;

    grader1Eval.criterionGrades.forEach((g1: any) => {
      const g2 = grader2Eval.criterionGrades.find((c: any) => c.criterionId === g1.criterionId);
      if (g2) {
        const diff = Math.abs(g1.selectedLevel - g2.selectedLevel);
        if (diff === 0) {
          matchingCount++;
        } else {
          divergentCriteria.push({
            criterionId: g1.criterionId,
            criterionName: g1.criterionId,
            grader1Level: g1.selectedLevel,
            grader2Level: g2.selectedLevel,
            difference: diff
          });
        }
      }
    });

    consensusRate = totalCriteria > 0 ? Math.round((matchingCount / totalCriteria) * 100) : 100;
  }

  // Blind grading protection: if user is second_grader and hasn't graded yet, hide grader 1's score
  let safeGrader1Eval = grader1Eval;
  if (req.user.role === 'second_grader' && !grader2Eval) {
    safeGrader1Eval = {
      ...grader1Eval,
      weightedScore10: -1,
      criterionGrades: [],
      generalFeedback: 'Điểm đang được ẩn để đảm bảo nguyên tắc chấm độc lập (Blind Grading)',
      oralDefense: undefined
    };
  }

  res.json({
    submissionId,
    grader1Evaluation: safeGrader1Eval,
    grader2Evaluation: grader2Eval,
    isGrader2Finished,
    consensusRatePercent: consensusRate,
    scoreDelta,
    divergentCriteria
  });
});

app.post('/api/double-grading/reconcile', requireTeacherAuth, (req: AuthenticatedRequest, res) => {
  const { submissionId, reconciledScore, reconciliationNotes } = req.body;
  const sub = db.submissions.find(s => s.id === submissionId);
  if (!sub) return res.status(404).json({ error: 'Bài nộp không tồn tại.' });

  const finalScore = Number(reconciledScore);
  if (isNaN(finalScore) || finalScore < 0 || finalScore > 10) {
    return res.status(400).json({ error: 'Điểm hòa giải phải từ 0 đến 10.' });
  }

  // Giai đoạn 4, Yêu cầu 3: Lưu điểm đồng thuận vào db.evaluations và cập nhật trạng thái bài nộp thành graded
  const now = new Date().toISOString();
  let consensusEval = db.evaluations.find(e => e.submissionId === submissionId && e.graderRole === 'consensus');

  if (consensusEval) {
    consensusEval.weightedScore10 = finalScore;
    consensusEval.isFinalDecision = true;
    consensusEval.reconciledScore = finalScore;
    consensusEval.reconciliationNotes = reconciliationNotes || '';
    consensusEval.gradedAt = now;
  } else {
    const teacherEval = db.evaluations.find(e => e.submissionId === submissionId && e.graderRole === 'teacher');
    if (teacherEval) {
      teacherEval.isFinalDecision = true;
      teacherEval.reconciledScore = finalScore;
      teacherEval.reconciliationNotes = reconciliationNotes || '';
    }

    consensusEval = {
      id: `eval-consensus-${Date.now()}`,
      submissionId,
      graderId: req.user.id,
      graderName: req.user.name,
      graderRole: 'consensus',
      gradedAt: now,
      criterionGrades: teacherEval?.criterionGrades || [],
      weightedScore10: finalScore,
      generalFeedback: `Điểm đồng thuận hội đồng: ${finalScore}/10. ${reconciliationNotes || ''}`,
      strengths: teacherEval?.strengths || '',
      weaknesses: teacherEval?.weaknesses || '',
      recommendations: teacherEval?.recommendations || '',
      oralDefense: teacherEval?.oralDefense,
      isFinalDecision: true,
      reconciledScore: finalScore,
      reconciliationNotes: reconciliationNotes || ''
    };
    db.evaluations.push(consensusEval);
  }

  // Cập nhật trạng thái bài nộp thành graded
  sub.status = 'graded';
  sub.updatedAt = now;

  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: now,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'HÒA_GIẢI_ĐIỂM_CHẤM_HAI_VÒNG',
    targetId: submissionId,
    details: `Hội đồng thống nhất điểm cuối cùng: ${finalScore}/10 cho bài nộp ${submissionId}. Ghi chú: ${reconciliationNotes || 'Không'}`
  });

  saveDatabase();
  res.json({ success: true, finalScore, evaluation: consensusEval, submission: sub });
});

// Appeals
app.get('/api/appeals', requireAnyAuth, (req: AuthenticatedRequest, res) => {
  let result = db.appeals;
  if (req.studentAuth) {
    // Học sinh chỉ xem phúc khảo của chính mình
    result = result.filter(a => a.studentId === req.studentAuth!.studentId);
  } else {
    const { studentId } = req.query;
    if (studentId) {
      result = result.filter(a => a.studentId === studentId);
    }
  }
  res.json(result);
});

app.post('/api/appeals', requireAnyAuth, (req: AuthenticatedRequest, res) => {
  const { submissionId, taskTitle, studentReason, studentEvidence } = req.body;
  if (!submissionId || !studentReason) {
    return res.status(400).json({ error: 'Thiếu lý do hoặc thông tin bài nộp cần xem lại.' });
  }

  let studentId = '';
  let studentName = '';

  if (req.studentAuth) {
    studentId = req.studentAuth.studentId;
    studentName = req.studentAuth.fullName;
  } else if (req.user) {
    studentId = req.body.studentId || req.user.id;
    studentName = req.body.studentName || req.user.name;
  } else {
    return res.status(401).json({ error: 'Cần đăng nhập để gửi phúc khảo.' });
  }

  const sub = db.submissions.find(s => s.id === submissionId);
  if (req.studentAuth && sub && sub.studentId !== req.studentAuth.studentId) {
    return res.status(403).json({ error: 'Chỉ được gửi yêu cầu phúc khảo cho bài nộp của chính mình.' });
  }

  const newAppeal = {
    id: `appeal-${Date.now()}`,
    submissionId,
    studentId,
    studentName,
    taskTitle: taskTitle || (sub ? `Nhiệm vụ ${sub.taskNumber}` : 'Bài tập'),
    requestedAt: new Date().toISOString(),
    studentReason,
    studentEvidence: studentEvidence || '',
    status: 'pending' as const
  };

  db.appeals.push(newAppeal);
  saveDatabase();
  res.status(201).json(newAppeal);
});

app.post('/api/appeals/:id/respond', requireTeacherAuth, (req: AuthenticatedRequest, res) => {
  const { status, teacherResponse, scoreAdjustment } = req.body;
  const appeal = db.appeals.find(a => a.id === req.params.id);
  if (!appeal) return res.status(404).json({ error: 'Yêu cầu không tồn tại.' });

  appeal.status = status;
  appeal.teacherResponse = teacherResponse || '';
  appeal.scoreAdjustment = scoreAdjustment !== undefined ? Number(scoreAdjustment) : undefined;
  appeal.resolvedAt = new Date().toISOString();

  saveDatabase();
  res.json({ success: true, appeal });
});

// Test Cases Runner
app.get('/api/test-cases/technical', (req, res) => {
  res.json(TECHNICAL_TEST_CASES);
});

function normalizeOutput(out: string): string {
  return (out || '')
    .trim()
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

app.post('/api/test-runner/verify', (req, res) => {
  const { taskIdOrNumber, input, studentOutput } = req.body;
  let task = db.tasks.find(t => t.id === taskIdOrNumber || t.taskNumber === Number(taskIdOrNumber));
  let isMatch = false;

  const normInput = normalizeOutput(input || '');
  const normActual = normalizeOutput(studentOutput || '');

  // Giai đoạn 4, Yêu cầu 5: So sánh output chuẩn hóa cho cả bài tập tùy chỉnh do giáo viên tạo theo mandatoryTestCases
  if (task && task.mandatoryTestCases && task.mandatoryTestCases.length > 0) {
    const matchedTc = task.mandatoryTestCases.find(
      (tc: any) => normalizeOutput(tc.input) === normInput
    );
    if (matchedTc) {
      const normExpected = normalizeOutput(matchedTc.expectedOutput);
      isMatch = normActual === normExpected;
    } else {
      const taskNum = (task.taskNumber || 1) as 1 | 2 | 3;
      const compResult = compareOutputs(taskNum, input || '', studentOutput || '');
      isMatch = compResult.isMatch;
    }
  } else if (taskIdOrNumber) {
    const taskNum = Number(taskIdOrNumber) as 1 | 2 | 3;
    const compResult = compareOutputs(taskNum, input || '', studentOutput || '');
    isMatch = compResult.isMatch;
  }

  res.json({
    isMatch,
    normalizedActual: normActual,
    verifiedAt: new Date().toISOString()
  });
});

// --- GEMINI AI ASSISTANT: 3-TIER STRICT PEDAGOGICAL POLICY (REQUIREMENT 6) ---
// Keyed strictly by taskId and assignmentId (never solely hardcoded taskNumber)
app.post('/api/gemini/chat', async (req, res) => {
  const { taskId, assignmentId, taskNumber, prompt, studentId, studentCode } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Thiếu nội dung câu hỏi hoặc yêu cầu gửi tới AI.' });
  }

  // 1. Resolve task
  let task = db.tasks.find(t => t.id === taskId);
  let assignment: any = null;

  if (assignmentId) {
    assignment = (db.assignments || []).find((a: any) => a.id === assignmentId);
    if (!task && assignment) {
      task = db.tasks.find(t => t.id === assignment.taskId);
    }
  }

  if (!task && taskNumber) {
    task = db.tasks.find(t => t.taskNumber === Number(taskNumber));
  }

  // Determine dynamic aiLevel
  const aiLevel = assignment?.aiLevel || task?.aiLevel || 'T1';

  // STRICT T1 RULE: AI is completely blocked server-side!
  if (aiLevel === 'T1') {
    return res.status(403).json({
      error: 'Bài tập này được thiết lập ở mức độ T1 (Lập trình độc lập). Trợ lý AI bị khóa hoàn toàn nhằm đánh giá chính xác năng lực giải quyết vấn đề độc lập của học sinh THCS. Không có cuộc gọi API nào được thực hiện.'
    });
  }

  const taskTitle = task ? task.title : 'Bài tập lập trình';
  const taskObjective = task ? task.objective : 'Giải quyết vấn đề bằng Python';
  const taskRules = task?.allowedAIPromptingRules || '';
  const problemStatement = task?.problemStatement || '';

  let systemInstruction = '';

  if (aiLevel === 'T2') {
    // STRICT T2 RULE: Socratic Guided Hints ONLY. NO COMPLETE SOLUTIONS!
    systemInstruction = `Bạn là Trợ lý Sư phạm Tin học THCS trên hệ thống AuthentiCode.
Học sinh đang thực hiện bài tập ở mức độ T2 (Sử dụng AI có hướng dẫn sư phạm - Socratic hints).
Tên bài tập: ${taskTitle}
Mục tiêu bài tập: ${taskObjective}
Đề bài tham khảo:
${problemStatement}
${taskRules ? `Quy tắc bổ sung của giáo viên: ${taskRules}` : ''}

CÁC NGUYÊN TẮC BẮT BUỘC KHÔNG ĐƯỢC VI PHẠM:
1. TUYỆT ĐỐI KHÔNG cung cấp toàn bộ đoạn mã sửa hoàn chỉnh hoặc đưa ra đáp án trực tiếp.
2. CHỈ ĐƯỢC PHÉP đặt các câu hỏi gợi mở theo phương pháp Socratic, hướng dẫn học sinh tự suy nghĩ và kiểm tra lại:
   - "Hàm range() trong Python chạy từ đâu đến đâu? Có bao gồm giá trị kết thúc không?"
   - "Nếu một ngày đọc đúng giá trị biên thì điều kiện so sánh trả về True hay False?"
3. Khuyến khích học sinh tự dự đoán kết quả trước khi chạy thử trong Thonny.
4. Giữ giọng văn thân thiện, tôn trọng, ngắn gọn, phù hợp với học sinh THCS.`;
  } else if (aiLevel === 'T3') {
    // STRICT T3 RULE: Open AI with mandatory disclosure & critical verification
    systemInstruction = `Bạn là Trợ lý AI môn Tin học THCS trên hệ thống AuthentiCode.
Học sinh đang thực hiện bài tập ở mức độ T3 (Bắt buộc dùng AI & Minh bạch).
Tên bài tập: ${taskTitle}
Mục tiêu bài tập: ${taskObjective}
Đề bài:
${problemStatement}
${taskRules ? `Quy tắc của giáo viên: ${taskRules}` : ''}

Nhiệm vụ của bạn:
1. Đưa ra giải pháp mẫu hoặc giải thích thuật toán theo yêu cầu của học sinh.
2. Luôn nhắc nhở học sinh: "Em hãy kiểm tra kỹ tính đúng đắn của mã này với ít nhất 5 test case, đặc biệt các trường hợp biên, và lưu lại Prompt này vào bản công khai AI."
3. Khuyến khích học sinh tự phát hiện điểm hạn chế để tối ưu mã nguồn.`;
  }

  try {
    const aiClient = getAiClient();
    if (!aiClient) {
      return res.status(503).json({
        error: 'Trợ lý AI chưa được cấu hình khóa API (GEMINI_API_KEY) trên máy chủ.',
        fallbackTip: 'Em có thể dùng bàn kiểm thử của hệ thống để tự kiểm tra kết quả chạy từ Thonny.'
      });
    }

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        seed: 42
      }
    });

    const aiResponseText = response.text || 'Không có phản hồi từ trợ lý AI.';

    const logEntry = {
      id: `ai-${Date.now()}`,
      timestamp: new Date().toISOString(),
      studentId: studentId || 'unknown',
      studentCode: studentCode || 'HS',
      taskId: task?.id || 'unknown',
      aiLevel,
      prompt,
      response: aiResponseText
    };
    db.aiLogs.push(logEntry);
    saveDatabase();

    res.json({
      reply: aiResponseText,
      timestamp: logEntry.timestamp,
      model: 'gemini-3.8-flash',
      aiLevel
    });
  } catch (error: any) {
    console.error('Lỗi Gemini API:', error);
    const errorMsg = error?.message || 'Lỗi kết nối Gemini API';
    res.status(500).json({
      error: `Không thể kết nối với Gemini AI: ${errorMsg}`,
      fallbackTip: 'Em có thể dùng bàn kiểm thử của hệ thống để tự kiểm tra kết quả chạy từ Thonny.'
    });
  }
});

// Dashboard Statistics
app.get('/api/stats', (req, res) => {
  const classCount = db.classes.length;
  const studentCount = db.students.length;
  const taskCount = db.tasks.length;
  const submittedCount = db.submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;
  const pendingCount = db.submissions.filter(s => s.status === 'draft').length;
  const oralPendingCount = db.submissions.filter(s => s.status === 'oral_defense_pending').length;
  const gradedCount = db.evaluations.length;

  const totalScore = db.evaluations.reduce((sum, e) => sum + (e.weightedScore10 || 0), 0);
  const averageScore = gradedCount > 0 ? Math.round((totalScore / gradedCount) * 10) / 10 : 0;

  res.json({
    classCount,
    studentCount,
    taskCount,
    submittedCount,
    pendingCount,
    oralPendingCount,
    needsReviewCount: db.appeals.filter(a => a.status === 'pending').length,
    gradedCount,
    averageScore
  });
});

// Audit Logs (Admin Only)
app.get('/api/audit-logs', requireAdminAuth, (req, res) => {
  res.json(db.auditLogs.slice(-100).reverse());
});

// Export CSV / JSON (Admin Only)
app.get('/api/export/json', requireAdminAuth, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="authenticode_export.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    classes: db.classes,
    students: db.students,
    submissions: db.submissions,
    evaluations: db.evaluations,
    appeals: db.appeals
  });
});

app.get('/api/export/csv', requireAdminAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="authenticode_bang_diem.csv"');

  const headers = ['Mã học sinh', 'Họ và tên', 'Lớp', 'Nhiệm vụ', 'Trạng thái', 'Điểm Rubric (10)', 'Vấn đáp', 'Ngày nộp'];
  const rows = db.submissions.map(s => {
    const evalData = db.evaluations.find(e => e.submissionId === s.id);
    const score = evalData ? evalData.weightedScore10 : 'Chưa chấm';
    const oral = evalData?.oralDefense?.ownershipConfirmed ? 'Đạt' : (s.status === 'oral_defense_pending' ? 'Chờ vấn đáp' : 'Chưa thực hiện');
    return [
      `"${s.studentCode}"`,
      `"${s.studentName}"`,
      `"${s.className}"`,
      `"Nhiệm vụ ${s.taskNumber}"`,
      `"${s.status}"`,
      `"${score}"`,
      `"${oral}"`,
      `"${s.updatedAt}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  res.send(csvContent);
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AuthentiCode Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
