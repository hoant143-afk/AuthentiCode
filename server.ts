import express from 'express';
import path from 'path';
import fs from 'fs';
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
      parsed.tasks = (parsed.tasks || []).map((t: any) => ({
        ...t,
        status: t.status || 'assigned',
        aiLevel: t.aiLevel || (t.taskNumber === 1 ? 'T1' : t.taskNumber === 2 ? 'T2' : 'T3')
      }));
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
        id: 'user-bongnguyen',
        email: 'Bongnguyen446@gmail.com',
        name: 'Cô Bống Nguyễn',
        role: 'teacher',
        isApproved: true,
        createdAt: '2026-09-01T08:00:00Z'
      },
      {
        id: 'user-admin',
        email: 'admin@authenticode.edu.vn',
        name: 'Quản trị viên Hệ thống',
        role: 'admin',
        isApproved: true,
        createdAt: '2026-09-01T08:00:00Z'
      },
      {
        id: 'user-second-grader',
        email: 'thay.hoang@authenticode.edu.vn',
        name: 'Thầy Hoàng Văn Hải (Giám khảo 2)',
        role: 'second_grader',
        isApproved: true,
        createdAt: '2026-09-01T08:00:00Z'
      }
    ],
    classes: INITIAL_CLASSES,
    students: INITIAL_STUDENTS,
    tasks: AUTHENTIC_TASKS,
    assignments: INITIAL_ASSIGNMENTS,
    submissions: [
      {
        id: 'sub-01',
        taskId: 'task-1',
        taskNumber: 1,
        studentId: 'student-01',
        studentName: 'Trần Minh Khang',
        studentCode: 'HS01',
        classId: 'class-8a1',
        className: 'Lớp 8A1',
        status: 'graded',
        currentVersion: 1,
        versions: [
          {
            versionNumber: 1,
            submittedAt: '2026-11-05T14:30:00Z',
            problemAnalysis: 'Input: n = 7 (số ngày) và 7 số nguyên biểu thị số trang sách mỗi ngày. Output: Tổng số trang (số nguyên) và số ngày đọc >= 15 trang. Ràng buộc: số trang là số nguyên không âm.',
            algorithmPseudocode: 'Bước 1: Nhập n = 7\nBước 2: Nhập danh sách pages có n phần tử\nBước 3: Khởi tạo total = 0, count_15 = 0\nBước 4: Duyệt qua từng p trong pages:\n    total = total + p\n    Nếu p >= 15 thì count_15 = count_15 + 1\nBước 5: Xuất total và count_15',
            pythonSourceCode: `# Bài làm Nhiệm vụ 1 - Lập trình độc lập
n = int(input())
pages = list(map(int, input().split()))

total_pages = sum(pages)
count_days = 0

for p in pages:
    if p >= 15:
        count_days += 1

print(total_pages)
print(count_days)`,
            testCases: [
              {
                id: 'tc-sub-1',
                name: 'Test case 1 (Mẫu)',
                input: '7\n12 15 20 0 18 4 15',
                expectedOutput: '84\n4',
                studentActualOutput: '84\n4',
                isMatch: true,
                description: 'Trường hợp thông thường theo đề bài'
              },
              {
                id: 'tc-sub-2',
                name: 'Test case 2 (Biên 15)',
                input: '7\n15 15 15 15 15 15 15',
                expectedOutput: '105\n7',
                studentActualOutput: '105\n7',
                isMatch: true,
                description: 'Tất cả 7 ngày đều đúng 15 trang'
              },
              {
                id: 'tc-sub-3',
                name: 'Test case 3 (Không đạt)',
                input: '7\n0 14 10 5 0 2 14',
                expectedOutput: '45\n0',
                studentActualOutput: '45\n0',
                isMatch: true,
                description: 'Không ngày nào đạt mốc 15'
              }
            ],
            explanation: 'Em dùng hàm sum() trong Python để tính nhanh tổng số trang, và một vòng lặp for đơn giản để kiểm tra từng ngày. Do đề bài ghi "ít nhất 15 trang", em dùng điều kiện p >= 15.',
            selfEvaluation: {
              understandingScore: 4,
              confidenceLevel: 'high',
              reflectionNotes: 'Em tự làm hoàn toàn bài này trong Thonny, chạy thử cả 3 test case đều cho kết quả chính xác.'
            },
            aiLogs: [],
            aiDisclosure: {
              usedAI: false,
              toolUsed: 'Không sử dụng',
              promptsCount: 0,
              whatVerified: 'Tự kiểm thử thủ công',
              whatImproved: 'Tối ưu bằng hàm sum()',
              studentContribution: '100% tự viết'
            }
          }
        ],
        createdAt: '2026-11-05T14:30:00Z',
        updatedAt: '2026-11-06T09:15:00Z'
      },
      {
        id: 'sub-02',
        taskId: 'task-2',
        taskNumber: 2,
        studentId: 'student-02',
        studentName: 'Lê Thảo Nguyên',
        studentCode: 'HS02',
        classId: 'class-8a1',
        className: 'Lớp 8A1',
        status: 'oral_defense_pending',
        currentVersion: 1,
        versions: [
          {
            versionNumber: 1,
            submittedAt: '2026-11-06T10:15:00Z',
            problemAnalysis: 'Phân tích mã lỗi: Chương trình bị thiếu phần tử cuối cùng do vòng lặp duyệt range(n-1), và điều kiện > 15 làm sai lệch khi ngày đọc đúng 15 trang.',
            algorithmPseudocode: 'Thuật toán sửa: Duyệt range(n) hoặc duyệt trực tiếp phần tử trong mảng; so sánh if page >= 15.',
            pythonSourceCode: `# Mã nguồn ban đầu bị lỗi:
n = int(input())
pages = list(map(int, input().split()))
total = 0
count_15 = 0
for i in range(n - 1): # Lỗi 1
    total += pages[i]
    if pages[i] > 15:   # Lỗi 2
        count_15 += 1
print(total)
print(count_15)`,
            fixedPythonCode: `# Mã nguồn sau khi học sinh đã sửa và kiểm thử:
n = int(input())
pages = list(map(int, input().split()))

total = 0
count_15 = 0

for i in range(n): # Đã sửa thành range(n) để duyệt đủ n ngày
    total += pages[i]
    if pages[i] >= 15: # Đã sửa thành >= 15
        count_15 += 1

print(total)
print(count_15)`,
            bugExplanations: 'Lỗi 1: range(n - 1) chỉ chạy từ 0 đến n - 2, do đó phần tử pages[n - 1] (ngày cuối cùng) bị bỏ qua hoàn toàn. Cần đổi thành range(n).\nLỗi 2: pages[i] > 15 sẽ bỏ qua ngày đọc đúng 15 trang, trái với đề bài "ít nhất 15 trang". Cần đổi thành pages[i] >= 15.',
            testCases: [
              {
                id: 'tc-2-1',
                name: 'Test case bắt buộc (n = 1, trang = 15)',
                input: '1\n15',
                expectedOutput: '15\n1',
                studentActualOutput: '15\n1',
                isMatch: true,
                description: 'Test case này bộc lộ cả 2 lỗi ở mã cũ'
              },
              {
                id: 'tc-2-2',
                name: 'Test case 3 ngày',
                input: '3\n10 15 20',
                expectedOutput: '45\n2',
                studentActualOutput: '45\n2',
                isMatch: true,
                description: 'Kiểm tra phần tử giữa và phần tử cuối'
              },
              {
                id: 'tc-2-3',
                name: 'Test case toàn bộ 15',
                input: '4\n15 15 15 15',
                expectedOutput: '60\n4',
                studentActualOutput: '60\n4',
                isMatch: true,
                description: 'Biên 15 liên tục'
              },
              {
                id: 'tc-2-4',
                name: 'Test case số 0',
                input: '2\n0 0',
                expectedOutput: '0\n0',
                studentActualOutput: '0\n0',
                isMatch: true,
                description: 'Ngày không đọc trang nào'
              }
            ],
            explanation: 'Em đã tìm ra 2 lỗi logic nhờ chạy test case bắt buộc (1, 15). Mã cũ in ra (0, 0) vì range(0) không chạy vòng lặp nào.',
            selfEvaluation: {
              understandingScore: 3,
              confidenceLevel: 'medium',
              reflectionNotes: 'Nhờ câu hỏi gợi mở của AI về hàm range(), em hiểu rõ hơn vì sao chỉ số trong Python bắt đầu từ 0 và kết thúc tại stop - 1.'
            },
            aiLogs: [
              {
                id: 'ai-log-1',
                timestamp: '2026-11-06T09:45:00Z',
                aiTool: 'Gemini 3.8 Flash (Chế độ sư phạm gợi mở AuthentiCode)',
                prompt: 'Tại sao khi em nhập 1 và 15 thì chương trình lại in ra 0 và 0?',
                aiResponse: 'Em hãy thử kiểm tra xem khi n = 1 thì lệnh range(n - 1) tương đương với range của giá trị nào? Vòng lặp for sẽ lặp lại bao nhiêu lần trong trường hợp đó?',
                studentVerificationNote: 'Em nhận ra range(0) là rỗng nên vòng lặp không chạy lần nào, cả total và count_15 đều giữ nguyên 0.',
                studentDecision: 'modified_improved',
                decisionRationale: 'Em tự sửa range(n-1) thành range(n) thay vì xin AI sửa hộ.'
              }
            ]
          }
        ],
        createdAt: '2026-11-06T10:15:00Z',
        updatedAt: '2026-11-06T10:15:00Z'
      }
    ],
    evaluations: [
      {
        id: 'eval-01',
        submissionId: 'sub-01',
        graderId: 'user-bongnguyen',
        graderName: 'Cô Bống Nguyễn',
        graderRole: 'teacher',
        gradedAt: '2026-11-06T09:15:00Z',
        criterionGrades: [
          {
            criterionId: 'R1',
            selectedLevel: 4,
            evidence: 'Phân tích đầy đủ Input, Output và các ràng buộc số nguyên không âm.',
            comment: 'Phân tích tốt, rõ ràng.'
          },
          {
            criterionId: 'R2',
            selectedLevel: 3,
            evidence: 'Mô tả giả mã rõ ràng, có đầy đủ 5 bước tuần tự.',
            comment: 'Thuật toán mạch lạc, dễ hiểu.'
          },
          {
            criterionId: 'R3',
            selectedLevel: 4,
            evidence: 'Mã nguồn chạy đúng toàn bộ test case, vượt qua cả 12 test case kỹ thuật của bàn kiểm thử.',
            comment: 'Lập trình chuẩn, có chú thích hữu ích.'
          },
          {
            criterionId: 'R4',
            selectedLevel: 3,
            evidence: 'Giải thích được lý do dùng sum() và điều kiện p >= 15.',
            comment: 'Nắm được bản chất bài toán.'
          },
          {
            criterionId: 'R5',
            selectedLevel: 3,
            evidence: 'Tự đánh giá đúng năng lực độc lập của bản thân.',
            comment: 'Phản tư trung thực.'
          },
          {
            criterionId: 'R6',
            selectedLevel: 4,
            evidence: 'Tuân thủ nghiêm ngặt quy định không sử dụng AI trong Nhiệm vụ 1.',
            comment: 'Ý thức tự giác và trung thực cao.'
          }
        ],
        weightedScore10: 8.8,
        generalFeedback: 'Bài làm xuất sắc! Khang thể hiện năng lực lập trình độc lập vững vàng, mã nguồn gọn gàng và phân tích đề bài chặt chẽ.',
        strengths: 'Tư duy thuật toán tốt, sử dụng cấu trúc mã nguồn tối ưu.',
        weaknesses: 'Nên bổ sung thêm một số chú thích giải thích rõ ràng hơn ở từng biến.',
        recommendations: 'Tiếp tục phát huy ở Nhiệm vụ 2 và 3.',
        oralDefense: {
          conductedAt: '2026-11-06T09:00:00Z',
          teacherId: 'user-bongnguyen',
          teacherName: 'Cô Bống Nguyễn',
          questions: [
            {
              questionId: 'Q1',
              questionText: 'Vì sao em sử dụng ">= 15" thay vì "> 15"?',
              studentAnswerSummary: 'Em trả lời: "Đề bài yêu cầu ít nhất 15 trang nên bao gồm cả ngày đọc đúng 15 trang. Nếu dùng > 15 thì ngày 15 trang sẽ bị bỏ qua."',
              understandingScore: 4,
              teacherNote: 'Học sinh hiểu sâu sắc ý nghĩa của điều kiện biên.'
            },
            {
              questionId: 'Q2',
              questionText: 'Điều gì xảy ra khi n bằng 1?',
              studentAnswerSummary: 'Em giải thích mảng chỉ có 1 phần tử, vòng lặp chạy 1 lần, kết quả in ra đúng số trang đó.',
              understandingScore: 4,
              teacherNote: 'Nắm vững cơ chế hoạt động của mảng và vòng lặp.'
            }
          ],
          overallOralConclusion: 'Học sinh làm chủ hoàn toàn mã nguồn của mình, câu trả lời tự tin, chính xác.',
          ownershipConfirmed: true
        },
        isFinalDecision: true
      }
    ],
    secondGraderEvaluations: [],
    appeals: [],
    aiLogs: [],
    auditLogs: [
      {
        id: 'log-01',
        timestamp: '2026-11-06T09:15:00Z',
        actorId: 'user-bongnguyen',
        actorName: 'Cô Bống Nguyễn',
        actorRole: 'teacher',
        action: 'CHẤM_BÀI_LẦN_1',
        targetId: 'sub-01',
        details: 'Đã hoàn thành đánh giá Rubric và vấn đáp cho học sinh Trần Minh Khang (Điểm: 8.8/10)'
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

// Gemini AI client initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// --- API ROUTES ---

// Health & Status
app.get('/api/health', (req, res) => {
  const firebaseConfigFile = path.join(__dirname, 'firebase-applet-config.json');
  let firebaseInfo: any = null;
  if (fs.existsSync(firebaseConfigFile)) {
    try {
      firebaseInfo = JSON.parse(fs.readFileSync(firebaseConfigFile, 'utf-8'));
    } catch (e) {
      console.error('Error reading firebase-applet-config.json', e);
    }
  }

  res.json({
    status: 'ok',
    appName: 'AuthentiCode',
    firebaseConnected: Boolean(firebaseInfo && firebaseInfo.projectId),
    firebaseProjectId: firebaseInfo?.projectId || null,
    firestoreDatabaseId: firebaseInfo?.firestoreDatabaseId || null,
    serverPersistence: 'Active (/data/authenticode_db.json & Cloud Firestore)',
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

// Teacher Registration
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ họ tên, email và mật khẩu.' });
  }

  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Email này đã được đăng ký trong hệ thống.' });
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    passwordHash: password, // In production use bcrypt, stored safely
    role: 'teacher',
    status: 'pending',
    isApproved: false,
    emailVerified: false,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: newUser.createdAt,
    actorId: newUser.id,
    actorName: newUser.name,
    actorRole: 'teacher',
    action: 'ĐĂNG_KÝ_TÀI_KHOẢN',
    targetId: newUser.id,
    details: `Giáo viên ${newUser.name} (${newUser.email}) đăng ký tài khoản mới (Chờ phê duyệt)`
  });
  saveDatabase();

  // Return user without passwordHash
  const { passwordHash, ...safeUser } = newUser as any;
  res.status(201).json({ success: true, user: safeUser, message: 'Đăng ký thành công. Tài khoản đang chờ Admin phê duyệt.' });
});

// Teacher Login with password & status checks
app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email là bắt buộc.' });
  }

  let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    // Backward compatibility or quick login for demo
    user = {
      id: `user-${Date.now()}`,
      email,
      name: email.split('@')[0],
      passwordHash: password || 'Password123!',
      role: role || 'teacher',
      status: email.toLowerCase() === 'bongnguyen446@gmail.com' ? 'approved' : 'pending',
      isApproved: email.toLowerCase() === 'bongnguyen446@gmail.com',
      emailVerified: true,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    saveDatabase();
  }

  // Check password if set
  if (user.passwordHash && password && user.passwordHash !== password) {
    return res.status(401).json({ error: 'Mật khẩu đăng nhập không chính xác.' });
  }

  // Check status
  if (user.status === 'pending') {
    return res.status(403).json({ error: 'Tài khoản của bạn đang chờ Quản trị viên phê duyệt.' });
  }
  if (!user.isApproved) {
    return res.status(403).json({ error: 'Tài khoản của bạn chưa được phê duyệt.' });
  }
  if (user.status === 'locked') {
    return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa bởi quản trị viên.' });
  }
  if (user.status === 'rejected') {
    return res.status(403).json({ error: 'Tài khoản của bạn đã bị từ chối phê duyệt.' });
  }

  const { passwordHash, ...safeUser } = user as any;
  res.json({ user: safeUser });
});

app.get('/api/users', (req, res) => {
  const safeUsers = db.users.map(({ passwordHash, ...u }: any) => u);
  res.json(safeUsers);
});

// Admin update user status (approve, reject, lock, unlock)
app.put('/api/users/:id/status', (req, res) => {
  const { status, adminId } = req.body; // 'approved' | 'rejected' | 'locked' | 'pending'
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Người dùng không tồn tại.' });

  const oldStatus = user.status;
  user.status = status;
  user.isApproved = status === 'approved';

  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: adminId || 'admin',
    actorName: 'Quản trị viên',
    actorRole: 'admin',
    action: 'CẬP_NHẬT_TRẠNG_THÁI_NGƯỜI_DÙNG',
    targetId: user.id,
    details: `Thay đổi trạng thái tài khoản ${user.email} từ ${oldStatus} sang ${status}`
  });

  saveDatabase();
  const { passwordHash, ...safeUser } = user as any;
  res.json({ success: true, user: safeUser });
});

// Admin update user role (teacher, second_grader, admin)
app.put('/api/users/:id/role', (req, res) => {
  const { role, adminId } = req.body;
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Người dùng không tồn tại.' });

  const oldRole = user.role;
  user.role = role;

  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: adminId || 'admin',
    actorName: 'Quản trị viên',
    actorRole: 'admin',
    action: 'PHÂN_QUYỀN_NGƯỜI_DÙNG',
    targetId: user.id,
    details: `Thay đổi vai trò tài khoản ${user.email} từ ${oldRole} sang ${role}`
  });

  saveDatabase();
  const { passwordHash, ...safeUser } = user as any;
  res.json({ success: true, user: safeUser });
});

// Student Session Verification (Server-authoritative)
app.post('/api/sessions/verify', (req, res) => {
  const { sessionCode } = req.body;
  if (!sessionCode) {
    return res.status(400).json({ error: 'Vui lòng nhập mã phiên.' });
  }

  const cleanCode = sessionCode.trim().toUpperCase();
  const student = db.students.find(s => s.sessionCode.toUpperCase() === cleanCode);

  if (!student) {
    return res.status(401).json({
      error: 'Mã phiên không tồn tại hoặc đã hết hạn. Vui lòng liên hệ giáo viên để được cấp mã.'
    });
  }

  const studentClass = db.classes.find(c => c.id === student.classId);

  res.json({
    student,
    classGroup: studentClass,
    tasks: db.tasks
  });
});

// Classes & Students
app.get('/api/classes', (req, res) => {
  res.json(db.classes);
});

app.post('/api/classes', (req, res) => {
  const { name, grade, academicYear, teacherName } = req.body;
  const newClass = {
    id: `class-${Date.now()}`,
    name: name || 'Lớp mới',
    grade: Number(grade) || 8,
    academicYear: academicYear || '2025-2026',
    teacherId: 'user-bongnguyen',
    teacherName: teacherName || 'Cô Bống Nguyễn',
    studentCount: 0,
    createdAt: new Date().toISOString()
  };
  db.classes.push(newClass);
  saveDatabase();
  res.status(201).json(newClass);
});

app.get('/api/classes/:id/students', (req, res) => {
  const students = db.students.filter(s => s.classId === req.params.id);
  res.json(students);
});

app.post('/api/classes/:id/students', (req, res) => {
  const { fullName, studentCode, notes } = req.body;
  const classGroup = db.classes.find(c => c.id === req.params.id);
  if (!classGroup) return res.status(404).json({ error: 'Lớp không tồn tại.' });

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const classSuffix = classGroup.name.replace(/\s+/g, '').toUpperCase();
  const sessionCode = `AUTH-${classSuffix}-${randomDigits}`;

  const newStudent = {
    id: `student-${Date.now()}`,
    classId: classGroup.id,
    studentCode: studentCode || `HS${String(db.students.length + 1).padStart(2, '0')}`,
    fullName: fullName || 'Học sinh mới',
    sessionCode,
    sessionExpiresAt: '2026-12-31T23:59:59Z',
    notes: notes || ''
  };

  db.students.push(newStudent);
  classGroup.studentCount = db.students.filter(s => s.classId === classGroup.id).length;
  saveDatabase();

  res.status(201).json(newStudent);
});

// Generate or Renew Session Codes
app.post('/api/classes/:id/generate-sessions', (req, res) => {
  const classGroup = db.classes.find(c => c.id === req.params.id);
  if (!classGroup) return res.status(404).json({ error: 'Lớp không tồn tại.' });

  const classSuffix = classGroup.name.replace(/\s+/g, '').toUpperCase();
  const studentsInClass = db.students.filter(s => s.classId === classGroup.id);

  studentsInClass.forEach(student => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    student.sessionCode = `AUTH-${classSuffix}-${randomDigits}`;
    student.sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  });

  saveDatabase();
  res.json({ success: true, updatedCount: studentsInClass.length, students: studentsInClass });
});

// Tasks Management & Bank
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

app.post('/api/tasks', (req, res) => {
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
    status,
    authorTeacherId,
    authorTeacherName
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
    authorTeacherId: authorTeacherId || 'user-bongnguyen',
    authorTeacherName: authorTeacherName || 'Cô Bống Nguyễn'
  };

  db.tasks.push(newTask);
  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: now,
    actorId: newTask.authorTeacherId,
    actorName: newTask.authorTeacherName,
    actorRole: 'teacher',
    action: newTask.status === 'published' ? 'XUẤT_BẢN_BÀI_TẬP' : 'TẠO_BÀI_TẬP_NHÁP',
    targetId: newTask.id,
    details: `Giáo viên tạo bài tập "${newTask.title}" (Mức AI: ${newTask.aiLevel}, Trạng thái: ${newTask.status})`
  });

  saveDatabase();
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
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
    actorId: 'user-bongnguyen',
    actorName: 'Cô Bống Nguyễn',
    actorRole: 'teacher',
    action: 'CHỈNH_SỬA_BÀI_TẬP',
    targetId: updatedTask.id,
    details: `Giáo viên cập nhật bài tập "${updatedTask.title}"`
  });

  saveDatabase();
  res.json(updatedTask);
});

app.post('/api/tasks/:id/publish', (req, res) => {
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Nhiệm vụ không tồn tại.' });

  task.status = 'published';
  task.updatedAt = new Date().toISOString();

  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: task.updatedAt,
    actorId: 'user-bongnguyen',
    actorName: 'Cô Bống Nguyễn',
    actorRole: 'teacher',
    action: 'XUẤT_BẢN_BÀI_TẬP',
    targetId: task.id,
    details: `Giáo viên xuất bản bài tập "${task.title}" vào ngân hàng đề`
  });

  saveDatabase();
  res.json({ success: true, task });
});

app.delete('/api/tasks/:id', (req, res) => {
  const taskIndex = db.tasks.findIndex(t => t.id === req.params.id);
  if (taskIndex === -1) return res.status(404).json({ error: 'Nhiệm vụ không tồn tại.' });

  const task = db.tasks[taskIndex];
  // Check if there are assignments or submissions using this task
  const hasSubmissions = db.submissions.some(s => s.taskId === task.id);
  if (hasSubmissions) {
    return res.status(400).json({ error: 'Không thể xóa bài tập đã có học sinh nộp bài.' });
  }

  db.tasks.splice(taskIndex, 1);
  saveDatabase();
  res.json({ success: true });
});

// Assignments Management
app.get('/api/assignments', (req, res) => {
  res.json(db.assignments || []);
});

app.post('/api/assignments', (req, res) => {
  const {
    taskId,
    targetType, // 'all_classes' | 'single_class' | 'multiple_classes' | 'individual_students'
    targetClassIds,
    targetStudentIds,
    startTime,
    dueTime,
    teacherNotes,
    teacherId,
    teacherName
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
    // Collect classes of these students
    const assignedStudents = db.students.filter(s => targetStudentIds.includes(s.id));
    classIds = Array.from(new Set(assignedStudents.map(s => s.classId)));
    classNames = db.classes.filter(c => classIds.includes(c.id)).map(c => c.name);
  } else {
    return res.status(400).json({ error: 'Vui lòng chọn đối tượng giao bài (lớp hoặc học sinh).' });
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
    individualAssignmentCode: req.body.individualAssignmentCode, // New
    startTime: startTime || now,
    dueTime: dueTime || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    teacherNotes: teacherNotes || '',
    assignedAt: now,
    assignedByTeacherId: teacherId || 'user-bongnguyen',
    assignedByTeacherName: teacherName || 'Cô Bống Nguyễn',
    status: 'assigned' as const
  };

  if (!db.assignments) db.assignments = [];
  db.assignments.push(newAssignment);

  // Update task status to assigned
  task.status = 'assigned';
  task.updatedAt = now;

  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: now,
    actorId: newAssignment.assignedByTeacherId,
    actorName: newAssignment.assignedByTeacherName,
    actorRole: 'teacher',
    action: 'GIAO_BÀI_TẬP',
    targetId: newAssignment.id,
    details: `Giáo viên giao bài "${task.title}" cho ${classNames.join(', ')} (Hạn nộp: ${new Date(newAssignment.dueTime).toLocaleDateString('vi-VN')})`
  });

  saveDatabase();
  res.status(201).json(newAssignment);
});

// Student's Assigned Tasks (Only assigned and opened tasks)
app.get('/api/assignments/my-tasks', (req, res) => {
  const { studentId, classId } = req.query;

  if (!studentId || !classId) {
    return res.status(400).json({ error: 'Thiếu studentId hoặc classId.' });
  }

  const now = new Date();
  const allAssignments = db.assignments || [];

  // Filter assignments targeted at this student or their class
  const studentAssignments = allAssignments.filter((a: any) => {
    if (a.status !== 'assigned') return false;

    // Check target match
    const isClassMatch = Array.isArray(a.targetClassIds) && a.targetClassIds.includes(String(classId));
    const isStudentMatch = Array.isArray(a.targetStudentIds) && a.targetStudentIds.includes(String(studentId));

    if (!isClassMatch && !isStudentMatch) return false;

    // Strict constraint: only tasks that have reached opening time
    const start = new Date(a.startTime);
    return start <= now;
  });

  // Attach task detail & submission status for each assignment
  const result = studentAssignments.map((a: any) => {
    const task = db.tasks.find(t => t.id === a.taskId);
    const sub = db.submissions.find(s => s.taskId === a.taskId && s.studentId === studentId);
    const isOverdue = new Date(a.dueTime) < now;

    let studentStatus = 'not_started';
    if (sub) {
      studentStatus = sub.status; // 'draft', 'submitted', 'oral_defense_pending', 'graded'
    }

    return {
      assignment: a,
      task,
      submission: sub || null,
      studentStatus,
      isOverdue
    };
  }).filter((item: any) => item.task != null);

  res.json(result);
});

// Assignment Submission Tracker (for Teachers)
app.get('/api/assignments/:id/tracker', (req, res) => {
  const assignment = (db.assignments || []).find((a: any) => a.id === req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: 'Đợt giao bài không tồn tại.' });
  }

  const task = db.tasks.find(t => t.id === assignment.taskId);

  // Find all targeted students
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

// Submissions & Revision History
app.get('/api/submissions', (req, res) => {
  const { studentId, classId, taskId, status } = req.query;
  let result = [...db.submissions];

  if (studentId) {
    result = result.filter(s => s.studentId === studentId);
  }
  if (classId) {
    result = result.filter(s => s.classId === classId);
  }
  if (taskId) {
    result = result.filter(s => s.taskId === taskId);
  }
  if (status) {
    result = result.filter(s => s.status === status);
  }

  res.json(result);
});

app.get('/api/submissions/:id', (req, res) => {
  const sub = db.submissions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Bài nộp không tồn tại.' });
  res.json(sub);
});

app.post('/api/submissions', (req, res) => {
  const {
    taskId,
    taskNumber,
    studentId,
    studentName,
    studentCode,
    classId,
    className,
    submissionData, // version payload
    isFinalSubmission
  } = req.body;

  if (!taskId || !studentId) {
    return res.status(400).json({ error: 'Thiếu thông tin taskId hoặc studentId.' });
  }

  let existing = db.submissions.find(s => s.taskId === taskId && s.studentId === studentId);

  const timestamp = new Date().toISOString();

  if (existing) {
    // Create new version, NEVER OVERWRITE WITHOUT HISTORY
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
      actorName: studentName || 'Học sinh',
      actorRole: 'student',
      action: isFinalSubmission ? 'NỘP_PHIÊN_BẢN_MỚI' : 'LƯU_BẢN_NHÁP_PHIÊN_BẢN',
      targetId: existing.id,
      details: `Học sinh đã cập nhật phiên bản ${newVersionNumber} cho Nhiệm vụ ${taskNumber}`
    });

    saveDatabase();
    return res.json(existing);
  }

  // Create new submission with Version 1
  const newSubmission = {
    id: `sub-${Date.now()}`,
    taskId,
    taskNumber: Number(taskNumber) || 1,
    studentId,
    studentName: studentName || 'Học sinh',
    studentCode: studentCode || 'HS',
    classId: classId || 'class-8a1',
    className: className || 'Lớp 8A1',
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
    actorName: studentName || 'Học sinh',
    actorRole: 'student',
    action: isFinalSubmission ? 'NỘP_BÀI_LẦN_ĐẦU' : 'TẠO_BẢN_NHÁP',
    targetId: newSubmission.id,
    details: `Học sinh khởi tạo bài nộp cho Nhiệm vụ ${taskNumber}`
  });

  saveDatabase();
  res.status(201).json(newSubmission);
});

// Teacher Evaluation with Rubric & Oral Defense
app.get('/api/evaluations', (req, res) => {
  const { submissionId, graderRole } = req.query;
  let evals = [...db.evaluations];
  if (submissionId) {
    evals = evals.filter(e => e.submissionId === submissionId);
  }
  if (graderRole) {
    evals = evals.filter(e => e.graderRole === graderRole);
  }
  res.json(evals);
});

app.post('/api/evaluations', (req, res) => {
  const {
    submissionId,
    graderId,
    graderName,
    graderRole,
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

  // Calculate weighted score 10
  // Weights: R1: 0.15, R2: 0.20, R3: 0.25, R4: 0.20, R5: 0.10, R6: 0.10
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
    const level = cg.selectedLevel; // 0, 1, 2, 3, 4
    const ratio = level === 0 ? 0 : level / 4;
    const w = weights[cg.criterionId] || 0.15;
    totalWeightedRatio += ratio * w;
  }

  const weightedScore10 = Math.round(totalWeightedRatio * 10 * 10) / 10;

  const newEval = {
    id: `eval-${Date.now()}`,
    submissionId,
    graderId: graderId || 'user-bongnguyen',
    graderName: graderName || 'Cô Bống Nguyễn',
    graderRole: graderRole || 'teacher',
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

  // Upsert evaluation for this grader & submission
  const existingIndex = db.evaluations.findIndex(
    e => e.submissionId === submissionId && e.graderId === newEval.graderId
  );
  if (existingIndex >= 0) {
    db.evaluations[existingIndex] = newEval;
  } else {
    db.evaluations.push(newEval);
  }

  // Update submission status
  const sub = db.submissions.find(s => s.id === submissionId);
  if (sub) {
    sub.status = oralDefense ? 'graded' : 'oral_defense_pending';
    sub.updatedAt = new Date().toISOString();
  }

  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: newEval.graderId,
    actorName: newEval.graderName,
    actorRole: newEval.graderRole,
    action: 'LƯU_ĐÁNH_GIÁ_RUBRIC',
    targetId: submissionId,
    details: `Giáo viên lưu điểm Rubric: ${weightedScore10}/10 cho bài nộp ${submissionId}`
  });

  saveDatabase();
  res.json({ evaluation: newEval, submission: sub });
});

// Double Grading API (Second Grader - Blind Grading)
app.get('/api/double-grading/:submissionId', (req, res) => {
  const { submissionId } = req.params;
  const currentUserId = req.query.currentUserId as string;

  const sub = db.submissions.find(s => s.id === submissionId);
  if (!sub) return res.status(404).json({ error: 'Bài nộp không tìm thấy.' });

  const g1Eval = db.evaluations.find(e => e.submissionId === submissionId && e.graderRole === 'teacher');
  const g2Eval = db.evaluations.find(e => e.submissionId === submissionId && e.graderRole === 'second_grader');

  // Blind grading protection: If caller is second grader and hasn't finished, hide G1 marks
  const isSecondGrader = currentUserId && currentUserId.includes('second');
  if (isSecondGrader && !g2Eval) {
    return res.json({
      submissionId,
      grader1Evaluation: null, // HIDDEN until Grader 2 submits
      grader2Evaluation: null,
      isGrader2Finished: false,
      message: 'Chế độ chấm độc lập: Điểm của Người chấm 1 được ẩn cho đến khi Người chấm 2 hoàn thành.'
    });
  }

  // Calculate consensus & divergence
  let consensusRatePercent = 0;
  let scoreDelta = 0;
  const divergentCriteria: any[] = [];

  if (g1Eval && g2Eval) {
    scoreDelta = Math.abs(Math.round((g1Eval.weightedScore10 - g2Eval.weightedScore10) * 10) / 10);
    let matchedCriteria = 0;

    for (const c1 of g1Eval.criterionGrades) {
      const c2 = g2Eval.criterionGrades.find((c: any) => c.criterionId === c1.criterionId);
      if (c2) {
        const diff = Math.abs(c1.selectedLevel - c2.selectedLevel);
        if (diff === 0) {
          matchedCriteria++;
        } else {
          const criterionMeta = RUBRIC_CRITERIA.find(rc => rc.id === c1.criterionId);
          divergentCriteria.push({
            criterionId: c1.criterionId,
            criterionName: criterionMeta?.name || c1.criterionId,
            grader1Level: c1.selectedLevel,
            grader2Level: c2.selectedLevel,
            difference: diff
          });
        }
      }
    }
    consensusRatePercent = Math.round((matchedCriteria / 6) * 100);
  }

  res.json({
    submissionId,
    grader1Evaluation: g1Eval || null,
    grader2Evaluation: g2Eval || null,
    isGrader2Finished: Boolean(g2Eval),
    consensusRatePercent,
    scoreDelta,
    divergentCriteria
  });
});

app.post('/api/double-grading/reconcile', (req, res) => {
  const { submissionId, reconciledScore, reconciliationNotes, reconciledBy } = req.body;
  const sub = db.submissions.find(s => s.id === submissionId);
  if (!sub) return res.status(404).json({ error: 'Bài nộp không tồn tại.' });

  const record = {
    submissionId,
    reconciledScore: Number(reconciledScore),
    reconciliationNotes: reconciliationNotes || '',
    reconciledBy: reconciledBy || 'Hội đồng chuyên môn',
    reconciledAt: new Date().toISOString()
  };

  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: 'reconcile-panel',
    actorName: record.reconciledBy,
    actorRole: 'admin',
    action: 'THỐNG_NHẤT_ĐIỂM_CHẤM_HAI_NGƯỜI',
    targetId: submissionId,
    details: `Hội đồng thống nhất điểm cuối cùng: ${record.reconciledScore}/10. Ghi chú: ${record.reconciliationNotes}`
  });

  saveDatabase();
  res.json({ success: true, record });
});

// Appeals API (Học sinh đề nghị xem lại kết quả)
app.get('/api/appeals', (req, res) => {
  const { studentId } = req.query;
  let appeals = [...db.appeals];
  if (studentId) {
    appeals = appeals.filter(a => a.studentId === studentId);
  }
  res.json(appeals);
});

app.post('/api/appeals', (req, res) => {
  const { submissionId, studentId, studentName, taskTitle, studentReason, studentEvidence } = req.body;
  if (!submissionId || !studentReason) {
    return res.status(400).json({ error: 'Thiếu lý do đề nghị xem lại.' });
  }

  const appeal = {
    id: `appeal-${Date.now()}`,
    submissionId,
    studentId,
    studentName: studentName || 'Học sinh',
    taskTitle: taskTitle || 'Nhiệm vụ',
    requestedAt: new Date().toISOString(),
    studentReason,
    studentEvidence: studentEvidence || '',
    status: 'pending'
  };

  db.appeals.push(appeal);
  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: studentId,
    actorName: studentName,
    actorRole: 'student',
    action: 'GỬI_YÊU_CẦU_PHÚC_KHẢO',
    targetId: submissionId,
    details: `Học sinh gửi yêu cầu xem lại kết quả: "${studentReason.slice(0, 50)}..."`
  });

  saveDatabase();
  res.status(201).json(appeal);
});

app.post('/api/appeals/:id/respond', (req, res) => {
  const { teacherResponse, status, scoreAdjustment } = req.body;
  const appeal = db.appeals.find(a => a.id === req.params.id);
  if (!appeal) return res.status(404).json({ error: 'Yêu cầu không tồn tại.' });

  appeal.status = status || 'accepted';
  appeal.teacherResponse = teacherResponse || '';
  appeal.scoreAdjustment = scoreAdjustment ? Number(scoreAdjustment) : undefined;
  appeal.resolvedAt = new Date().toISOString();

  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: 'user-bongnguyen',
    actorName: 'Cô Bống Nguyễn',
    actorRole: 'teacher',
    action: 'PHẢN_HỒI_YÊU_CẦU_PHÚC_KHẢO',
    targetId: appeal.id,
    details: `Giáo viên phản hồi yêu cầu xem lại (Trạng thái: ${appeal.status})`
  });

  saveDatabase();
  res.json(appeal);
});

// Python Test Bench Verification (TypeScript Reference Engine)
app.post('/api/test-runner/verify', (req, res) => {
  const { taskNumber, input, studentOutput } = req.body;
  if (!input) {
    return res.status(400).json({ error: 'Đầu vào kiểm thử không được để trống.' });
  }

  const result = compareOutputs(Number(taskNumber) as 1 | 2 | 3, input, studentOutput || '');
  res.json(result);
});

// Technical Test Cases List
app.get('/api/test-cases/technical', (req, res) => {
  res.json(TECHNICAL_TEST_CASES);
});

// Gemini AI Controlled Assistant Endpoint
app.post('/api/gemini/chat', async (req, res) => {
  const { taskNumber, prompt, studentId, studentCode } = req.body;

  if (!prompt || !taskNumber) {
    return res.status(400).json({ error: 'Thiếu nội dung câu hỏi hoặc số nhiệm vụ.' });
  }

  const taskNum = Number(taskNumber);

  // STRICT RULE 1: Task 1 - AI is completely blocked!
  if (taskNum === 1) {
    return res.status(403).json({
      error: 'Nhiệm vụ 1 nghiêm cấm sử dụng AI để đảm bảo đánh giá năng lực lập trình độc lập của học sinh THCS. Trợ lý AI trên hệ thống đã bị khóa cho nhiệm vụ này.'
    });
  }

  // System instructions according to Task
  let systemInstruction = '';
  if (taskNum === 2) {
    // STRICT RULE 2: Task 2 - Socratic Guided Hints ONLY. NO COMPLETE SOLUTIONS!
    systemInstruction = `Bạn là Trợ lý Sư phạm Tin học THCS trên hệ thống AuthentiCode.
Nhiệm vụ của bạn là hỗ trợ học sinh giải quyết Nhiệm vụ 2: tìm và sửa 2 lỗi logic trong mã Python tính số trang đọc sách:
- Lỗi 1: Vòng lặp range(n - 1) bỏ sót phần tử cuối cùng pages[n - 1].
- Lỗi 2: Điều kiện > 15 bỏ qua ngày đọc đúng 15 trang (đề bài yêu cầu "ít nhất 15 trang").

CÁC NGUYÊN TẮC BẮT BUỘC KHÔNG ĐƯỢC VI PHẠM:
1. TUYỆT ĐỐI KHÔNG cung cấp toàn bộ đoạn mã sửa hoàn chỉnh hoặc đưa ra đáp án trực tiếp.
2. CHỈ ĐƯỢC PHÉP đặt các câu hỏi gợi mở theo phương pháp Socratic, hướng học sinh tự tư duy.
3. Nhắc học sinh kiểm tra điều kiện biên:
   - "Hàm range(n - 1) chạy từ đâu đến đâu? Có đến được n - 1 không?"
   - "Nếu một ngày đọc đúng 15 trang thì điều kiện '> 15' sẽ trả về True hay False?"
4. Khuyến khích học sinh tự dự đoán kết quả trước khi chạy thử trong Thonny.
5. Giữ giọng văn thân thiện, tôn trọng, ngắn gọn, phù hợp với học sinh lớp 8 THCS.`;
  } else if (taskNum === 3) {
    // STRICT RULE 3: Task 3 - Open AI with mandatory disclosure & critical verification
    systemInstruction = `Bạn là Trợ lý AI môn Tin học THCS trên hệ thống AuthentiCode.
Học sinh đang thực hiện Nhiệm vụ 3: Đánh giá, phản biện và cải tiến giải pháp Python theo dõi số trang đọc sách (n ngày, tổng số trang, số ngày >= 15 trang, trang nhiều nhất trong ngày, trung bình 2 chữ số thập phân, và kết luận DAT nếu Tổng >= 75 VÀ có ít nhất 3 ngày >= 15).

Nhiệm vụ của bạn:
1. Đưa ra giải pháp mẫu hoặc giải thích thuật toán theo yêu cầu của học sinh.
2. Luôn nhắc nhở học sinh: "Em hãy kiểm tra kỹ tính đúng đắn của mã này với ít nhất 5 test case, đặc biệt các trường hợp biên như n=0, hoặc tổng đạt 75 nhưng chỉ có 2 ngày >= 15 trang."
3. Khuyến khích học sinh phát hiện điểm hạn chế (ví dụ: chia cho 0, định dạng số thực) để tự cải tiến mã nguồn của mình.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        seed: 42
      }
    });

    const aiResponseText = response.text || 'Không có phản hồi từ trợ lý AI.';

    // Save interaction to server audit log
    const logEntry = {
      id: `ai-${Date.now()}`,
      timestamp: new Date().toISOString(),
      studentId: studentId || 'unknown',
      studentCode: studentCode || 'HS',
      taskNumber: taskNum,
      prompt,
      response: aiResponseText
    };
    db.aiLogs.push(logEntry);
    saveDatabase();

    res.json({
      reply: aiResponseText,
      timestamp: logEntry.timestamp,
      model: 'gemini-3.8-flash'
    });
  } catch (error: any) {
    console.error('Lỗi Gemini API:', error);
    // Return friendly educational fallback if API error
    const errorMsg = error?.message || 'Lỗi kết nối Gemini API';
    res.status(500).json({
      error: `Không thể kết nối với Gemini AI: ${errorMsg}`,
      fallbackTip: 'Em có thể dùng bàn kiểm thử của hệ thống để tự kiểm tra kết quả chạy từ Thonny.'
    });
  }
});

// Dashboard Statistics API
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

// Audit Logs
app.get('/api/audit-logs', (req, res) => {
  res.json(db.auditLogs.slice(-50).reverse());
});

// Export CSV / JSON
app.get('/api/export/json', (req, res) => {
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

app.get('/api/export/csv', (req, res) => {
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
