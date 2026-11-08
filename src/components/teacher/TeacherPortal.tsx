import React, { useState, useEffect } from 'react';
import {
  Users, CheckCircle2, AlertTriangle, FileText, Download,
  Play, Plus, Award, ShieldAlert,
  ArrowRight, UserCheck, MessageSquare, BookOpen, Clock, Lock
} from 'lucide-react';
import {
  ClassGroup, Student, AssessmentTask, Submission,
  Evaluation, AppealRequest, AuditLog, SystemStats
} from '../../types';
import { RUBRIC_CRITERIA, ORAL_DEFENSE_QUESTIONS } from '../../data/seedData';
import { api } from '../../services/api';
import { TestBenchModal } from '../common/TestBenchModal';
import { FirebaseGuideModal } from '../common/FirebaseGuideModal';
import { TaskManager } from './TaskManager';

interface Props {
  currentTeacher: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  tasks: AssessmentTask[];
  onExit: () => void;
  onRoleSwitch?: (role: string) => void;
}

export const TeacherPortal: React.FC<Props> = ({
  currentTeacher,
  tasks,
  onExit,
  onRoleSwitch
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classes' | 'tasks' | 'submissions' | 'grading' | 'double-grading' | 'appeals' | 'audit' | 'users'>('dashboard');

  // Data states
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [appeals, setAppeals] = useState<AppealRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modals
  const [isTestBenchOpen, setIsTestBenchOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Class creation modal
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('8');

  // Add student modal
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [targetClassId, setTargetClassId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');

  // Grading Workspace State
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number>(0);
  const [rubricGrades, setRubricGrades] = useState<Record<string, { level: number; reason?: string; evidence: string; comment: string }>>({
    R1: { level: 3, evidence: 'Học sinh phân tích rõ Input và Output của bài toán.', comment: 'Phân tích tốt.' },
    R2: { level: 3, evidence: 'Giả mã mô tả rõ các bước tuần tự và vòng lặp.', comment: 'Thuật toán mạch lạc.' },
    R3: { level: 3, evidence: 'Mã nguồn chạy đúng các test case thông thường.', comment: 'Mã chuẩn, dễ đọc.' },
    R4: { level: 3, evidence: 'Giải thích được các dòng lệnh then chốt.', comment: 'Nắm được bản chất.' },
    R5: { level: 3, evidence: 'Có tự kiểm tra và ghi chú phản tư.', comment: 'Ý thức tự đánh giá tốt.' },
    R6: { level: 3, evidence: 'Tuân thủ đúng quy định về AI của nhiệm vụ.', comment: 'Khai báo trung thực.' }
  });
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [recommendations, setRecommendations] = useState('');

  // Oral defense questioning state
  const [oralQuestionsSelected, setOralQuestionsSelected] = useState<{
    questionId: string;
    questionText: string;
    studentAnswerSummary: string;
    understandingScore: 1 | 2 | 3 | 4;
    teacherNote: string;
  }[]>([
    {
      questionId: 'Q1',
      questionText: 'Vì sao trong điều kiện đếm ngày đọc sách, em sử dụng phép so sánh ">= 15" thay vì "> 15"?',
      studentAnswerSummary: 'Học sinh giải thích: "Vì đề bài yêu cầu ít nhất 15 trang nên bao gồm cả ngày đọc đúng 15 trang."',
      understandingScore: 4,
      teacherNote: 'Học sinh nắm vững ý nghĩa của điều kiện biên.'
    }
  ]);
  const [oralOverallConclusion, setOralOverallConclusion] = useState('Học sinh làm chủ mã nguồn, trả lời tự tin và chính xác.');
  const [isOwnershipConfirmed, setIsOwnershipConfirmed] = useState(true);

  // Double grading state
  const [doubleGradingData, setDoubleGradingData] = useState<any>(null);
  const [reconciledScoreInput, setReconciledScoreInput] = useState<string>('8.5');
  const [reconciledNotesInput, setReconciledNotesInput] = useState<string>('Hội đồng thống nhất mức điểm sau khi thảo luận tiêu chí R3.');

  // Appeals handling state
  const [selectedAppeal, setSelectedAppeal] = useState<AppealRequest | null>(null);
  const [appealTeacherResponse, setAppealTeacherResponse] = useState('');
  const [appealScoreAdjustment, setAppealScoreAdjustment] = useState('');

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [statsData, classesData, subsData, evalsData, appealsData, logsData, usersData] = await Promise.all([
        api.getStats(),
        api.getClasses(),
        api.getSubmissions(),
        api.getEvaluations(),
        api.getAppeals(),
        api.getAuditLogs(),
        api.getUsers()
      ]);

      setStats(statsData);
      setClasses(classesData);
      setSubmissions(subsData);
      setEvaluations(evalsData);
      setAppeals(appealsData);
      setAuditLogs(logsData);
      setUsers(usersData);

      // Load students for first class if available
      if (classesData.length > 0) {
        const stds = await api.getClassStudents(classesData[0].id);
        setStudents(stds);
        setTargetClassId(classesData[0].id);
      }
    } catch (err: any) {
      console.error('Lỗi nạp dữ liệu giáo viên:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    try {
      await api.updateUserStatus(userId, newStatus, currentTeacher.id);
      showNotification('success', `Đã cập nhật trạng thái tài khoản thành công (${newStatus})!`);
      loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Lỗi cập nhật trạng thái.');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole, currentTeacher.id);
      showNotification('success', `Đã phân quyền thành công (${newRole})!`);
      loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Lỗi phân quyền.');
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filter submissions
  const filteredSubmissions = submissions.filter(s => {
    if (selectedClassFilter !== 'all' && s.classId !== selectedClassFilter) return false;
    if (selectedTaskFilter !== 'all' && s.taskId !== selectedTaskFilter) return false;
    if (selectedStatusFilter !== 'all' && s.status !== selectedStatusFilter) return false;
    return true;
  });

  // Open Grading Workspace for a submission
  const handleOpenGrading = async (sub: Submission) => {
    setSelectedSubmission(sub);
    setSelectedVersionIdx(sub.versions.length - 1);

    // Check if evaluation already exists for this submission and current grader
    const existingEval = evaluations.find(
      e => e.submissionId === sub.id && e.graderId === currentTeacher.id
    ) || evaluations.find(e => e.submissionId === sub.id);

    if (existingEval) {
      const gMap: any = {};
      existingEval.criterionGrades.forEach(cg => {
        gMap[cg.criterionId] = {
          level: cg.selectedLevel,
          reason: cg.zeroReason,
          evidence: cg.evidence,
          comment: cg.comment
        };
      });
      setRubricGrades(gMap);
      setGeneralFeedback(existingEval.generalFeedback || '');
      setStrengths(existingEval.strengths || '');
      setWeaknesses(existingEval.weaknesses || '');
      setRecommendations(existingEval.recommendations || '');

      if (existingEval.oralDefense) {
        setOralQuestionsSelected(existingEval.oralDefense.questions || []);
        setOralOverallConclusion(existingEval.oralDefense.overallOralConclusion || '');
        setIsOwnershipConfirmed(Boolean(existingEval.oralDefense.ownershipConfirmed));
      }
    } else {
      // Defaults
      setRubricGrades({
        R1: { level: 3, evidence: 'Phân tích rõ dữ liệu đầu vào và đầu ra.', comment: 'Đạt yêu cầu.' },
        R2: { level: 3, evidence: 'Giả mã mô tả rõ vòng lặp và điều kiện.', comment: 'Thuật toán tốt.' },
        R3: { level: 3, evidence: 'Mã nguồn chạy đúng trên Thonny.', comment: 'Đạt chuẩn.' },
        R4: { level: 3, evidence: 'Giải thích được các biến và phép toán logic.', comment: 'Hiểu bài.' },
        R5: { level: 3, evidence: 'Có tự kiểm thử và phản tư.', comment: 'Tốt.' },
        R6: { level: 3, evidence: 'Tuân thủ đúng quy định AI của nhiệm vụ.', comment: 'Trung thực.' }
      });
      setGeneralFeedback('');
      setStrengths('');
      setWeaknesses('');
      setRecommendations('');
    }

    // Also fetch double-grading comparison
    try {
      const dg = await api.getDoubleGrading(sub.id, currentTeacher.id);
      setDoubleGradingData(dg);
    } catch (e) {
      console.error(e);
    }

    setActiveTab('grading');
  };

  // Helper to open grading by submission ID from TaskManager
  const handleOpenGradingById = async (submissionId: string) => {
    const sub = submissions.find(s => s.id === submissionId);
    if (sub) {
      await handleOpenGrading(sub);
    } else {
      try {
        const allSubs: Submission[] = await api.getSubmissions();
        const found = allSubs.find((s: Submission) => s.id === submissionId);
        if (found) {
          await handleOpenGrading(found);
        }
      } catch (e) {
        console.error('Không tìm thấy bài nộp:', e);
      }
    }
  };

  // Calculate current weighted score (10 scale)
  const calculateCurrentScore = () => {
    const weights: Record<string, number> = {
      R1: 0.15, R2: 0.20, R3: 0.25, R4: 0.20, R5: 0.10, R6: 0.10
    };
    let ratioSum = 0;
    for (const [cid, g] of Object.entries(rubricGrades)) {
      const w = weights[cid] || 0.15;
      const r = g.level === 0 ? 0 : g.level / 4;
      ratioSum += r * w;
    }
    return Math.round(ratioSum * 10 * 10) / 10;
  };

  // Save Rubric Evaluation
  const handleSaveEvaluation = async (isFinalDecision: boolean) => {
    if (!selectedSubmission) return;

    // Validate level 0 reason
    for (const [cid, g] of Object.entries(rubricGrades)) {
      if (g.level === 0 && (!g.reason || !g.reason.trim())) {
        showNotification('error', `Tiêu chí ${cid} chọn Mức 0: BẮT BUỘC phải ghi rõ lý do cụ thể.`);
        return;
      }
    }

    try {
      const criterionGradesPayload = Object.entries(rubricGrades).map(([cid, g]) => ({
        criterionId: cid as any,
        selectedLevel: g.level as any,
        zeroReason: g.level === 0 ? g.reason : undefined,
        evidence: g.evidence,
        comment: g.comment
      }));

      const payload = {
        submissionId: selectedSubmission.id,
        graderId: currentTeacher.id,
        graderName: currentTeacher.name,
        graderRole: currentTeacher.role === 'second_grader' ? 'second_grader' : 'teacher',
        criterionGrades: criterionGradesPayload,
        generalFeedback,
        strengths,
        weaknesses,
        recommendations,
        oralDefense: {
          conductedAt: new Date().toISOString(),
          teacherId: currentTeacher.id,
          teacherName: currentTeacher.name,
          questions: oralQuestionsSelected,
          overallOralConclusion: oralOverallConclusion,
          ownershipConfirmed: isOwnershipConfirmed
        },
        isFinalDecision
      };

      await api.saveEvaluation(payload);
      showNotification('success', 'Đã lưu đánh giá Rubric và biên bản vấn đáp thành công!');
      loadAllData();

      // Refresh double grading
      const dg = await api.getDoubleGrading(selectedSubmission.id, currentTeacher.id);
      setDoubleGradingData(dg);
    } catch (err: any) {
      showNotification('error', err.message || 'Lỗi lưu đánh giá.');
    }
  };

  // Create Class
  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      showNotification('error', 'Vui lòng nhập tên lớp học.');
      return;
    }

    try {
      await api.createClass({
        name: newClassName.trim(),
        grade: Number(newClassGrade) || 8,
        academicYear: '2025-2026',
        teacherName: currentTeacher.name
      });
      showNotification('success', `Đã tạo ${newClassName} thành công!`);
      setIsCreateClassOpen(false);
      setNewClassName('');
      loadAllData();
    } catch (err: any) {
      showNotification('error', 'Lỗi tạo lớp học.');
    }
  };

  // Add Student
  const handleAddStudent = async () => {
    if (!newStudentName.trim() || !targetClassId) {
      showNotification('error', 'Vui lòng nhập họ tên học sinh và chọn lớp.');
      return;
    }

    try {
      const newStd = await api.addStudent(targetClassId, {
        fullName: newStudentName.trim(),
        studentCode: newStudentCode.trim() || undefined
      });
      showNotification('success', `Đã thêm học sinh ${newStd.fullName} với mã phiên: ${newStd.sessionCode}`);
      setIsAddStudentOpen(false);
      setNewStudentName('');
      setNewStudentCode('');
      // Reload students for this class
      const stds = await api.getClassStudents(targetClassId);
      setStudents(stds);
      loadAllData();
    } catch (err: any) {
      showNotification('error', 'Lỗi thêm học sinh.');
    }
  };

  // Renew Sessions for Class
  const handleRenewSessions = async (classId: string) => {
    try {
      const res = await api.renewSessions(classId);
      showNotification('success', `Đã cấp lại mã phiên mới cho ${res.updatedCount} học sinh trong lớp!`);
      const stds = await api.getClassStudents(classId);
      setStudents(stds);
    } catch (err: any) {
      showNotification('error', 'Lỗi cấp lại mã phiên.');
    }
  };

  // Respond to Appeal
  const handleRespondAppeal = async (status: 'accepted' | 'rejected') => {
    if (!selectedAppeal) return;
    try {
      await api.respondAppeal(selectedAppeal.id, {
        teacherResponse: appealTeacherResponse,
        status,
        scoreAdjustment: appealScoreAdjustment ? Number(appealScoreAdjustment) : undefined
      });
      showNotification('success', `Đã xử lý yêu cầu xem lại (Trạng thái: ${status})!`);
      setSelectedAppeal(null);
      setAppealTeacherResponse('');
      setAppealScoreAdjustment('');
      loadAllData();
    } catch (err: any) {
      showNotification('error', 'Lỗi xử lý yêu cầu.');
    }
  };

  // Reconcile Double Grading
  const handleReconcileDoubleGrading = async () => {
    if (!selectedSubmission) return;
    try {
      await api.reconcileDoubleGrading({
        submissionId: selectedSubmission.id,
        reconciledScore: Number(reconciledScoreInput),
        reconciliationNotes: reconciledNotesInput,
        reconciledBy: currentTeacher.name
      });
      showNotification('success', 'Đã lưu điểm thống nhất của hội đồng chấm!');
      const dg = await api.getDoubleGrading(selectedSubmission.id, currentTeacher.id);
      setDoubleGradingData(dg);
      loadAllData();
    } catch (err: any) {
      showNotification('error', 'Lỗi lưu biên bản thống nhất.');
    }
  };

  const currentScore = calculateCurrentScore();
  const currentVersion = selectedSubmission?.versions[selectedVersionIdx];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            AC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">AuthentiCode</span>
              <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                {currentTeacher.role === 'admin' ? 'Quản trị viên' : currentTeacher.role === 'second_grader' ? 'Giám khảo 2' : 'Phân hệ Giáo viên'}
              </span>
            </div>
            <p className="text-xs text-slate-500">Đánh giá xác thực năng lực lập trình Python THCS trong bối cảnh GenAI</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Role Switcher for Testing */}
          {onRoleSwitch && (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => onRoleSwitch('teacher')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  currentTeacher.role === 'teacher' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Giáo viên 1
              </button>
              <button
                onClick={() => onRoleSwitch('second_grader')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  currentTeacher.role === 'second_grader' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Giám khảo 2 (Độc lập)
              </button>
              <button
                onClick={() => onRoleSwitch('admin')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  currentTeacher.role === 'admin' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin
              </button>
            </div>
          )}


          {/* Test bench */}
          <button
            onClick={() => setIsTestBenchOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-slate-800" />
            Bàn kiểm thử
          </button>

          <button
            onClick={onExit}
            className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2 animate-bounce ${
          notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : 'bg-red-50 border-red-300 text-red-900'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Left Navigation Sidebar */}
        <aside className="w-64 shrink-0 hidden md:block space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Dashboard tổng quan</span>
            </button>

            <button
              onClick={() => setActiveTab('submissions')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'submissions' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Quản lý & Chấm bài</span>
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-800 font-mono px-1.5 py-0.2 rounded">
                {submissions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('classes')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                activeTab === 'classes' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Quản lý lớp học & Mã phiên</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                activeTab === 'tasks' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Quản lý nhiệm vụ (Ngân hàng, Giao bài, Theo dõi)</span>
            </button>

            <div className="pt-2 pb-1 px-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Xác thực chuyên sâu
            </div>

            <button
              onClick={() => setActiveTab('double-grading')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                activeTab === 'double-grading' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Chấm hai người độc lập</span>
            </button>

            <button
              onClick={() => setActiveTab('appeals')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'appeals' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4" />
                <span>Yêu cầu xem lại (Phúc khảo)</span>
              </div>
              {appeals.filter(a => a.status === 'pending').length > 0 && (
                <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.2 rounded-full">
                  {appeals.filter(a => a.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                activeTab === 'audit' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Nhật ký kiểm toán (Audit)</span>
            </button>

            {currentTeacher.role === 'admin' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  activeTab === 'users' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4" />
                  <span>Quản trị tài khoản (Admin)</span>
                </div>
                {users.filter(u => u.status === 'pending').length > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
                    {users.filter(u => u.status === 'pending').length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Quick Export Tools */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 text-xs">
            <span className="font-bold text-slate-900 block">Xuất dữ liệu & Báo cáo:</span>
            <div className="space-y-1.5">
              <a
                href="/api/export/csv"
                download="authenticode_bang_diem.csv"
                className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 flex items-center justify-between transition-colors"
              >
                <span>Xuất bảng điểm (CSV)</span>
                <Download className="w-3.5 h-3.5 text-slate-500" />
              </a>
              <a
                href="/api/export/json"
                download="authenticode_export.json"
                className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 flex items-center justify-between transition-colors"
              >
                <span>Xuất hồ sơ đầy đủ (JSON)</span>
                <Download className="w-3.5 h-3.5 text-slate-500" />
              </a>
            </div>
          </div>
        </aside>

        {/* Center Main View */}
        <main className="flex-1 space-y-6">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
                <div className="max-w-2xl space-y-2">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Bảng Điều Khiển Đánh Giá Năng Lực
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Chào mừng, {currentTeacher.name}
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Hệ thống đang theo dõi dữ liệu đánh giá 3 nhiệm vụ Python xác thực. Không sử dụng công cụ AI detection tự động để quy kết gian lận; giáo viên nắm quyền quyết định cuối cùng dựa trên bằng chứng và vấn đáp.
                  </p>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Số lớp học</span>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono">
                    {classes.length}
                  </div>
                  <span className="text-[11px] text-slate-400">Khối 8 THCS</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Tổng số học sinh</span>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono">
                    {stats?.studentCount || 5}
                  </div>
                  <span className="text-[11px] text-emerald-600">Có mã phiên cá nhân</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Bài đã nộp</span>
                  <div className="text-2xl font-extrabold text-blue-600 font-mono">
                    {submissions.filter(s => s.status !== 'draft').length}
                  </div>
                  <span className="text-[11px] text-slate-400">Lưu đầy đủ phiên bản</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Chờ vấn đáp</span>
                  <div className="text-2xl font-extrabold text-purple-600 font-mono">
                    {submissions.filter(s => s.status === 'oral_defense_pending').length}
                  </div>
                  <span className="text-[11px] text-purple-700">Kiểm chứng hiểu biết</span>
                </div>
              </div>

              {/* Rubric Overview Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Khung Đánh Giá 6 Tiêu Chí Xác Thực
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tập trung vào tiến trình tư duy, khả năng phát hiện lỗi và trách nhiệm khi sử dụng AI
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    Thang điểm: 10
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {RUBRIC_CRITERIA.map(rc => (
                    <div key={rc.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{rc.code}. {rc.name}</span>
                        <span className="text-[11px] font-bold font-mono text-emerald-700">{rc.weightPercentText}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                        {rc.levels[3].description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Submissions Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Bài Nộp Cần Đánh Giá Gần Đây
                  </h3>
                  <button
                    onClick={() => setActiveTab('submissions')}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Xem tất cả ({submissions.length})
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Học sinh</th>
                        <th className="py-2.5 px-3">Lớp</th>
                        <th className="py-2.5 px-3">Nhiệm vụ</th>
                        <th className="py-2.5 px-3">Phiên bản</th>
                        <th className="py-2.5 px-3">Trạng thái</th>
                        <th className="py-2.5 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {submissions.slice(0, 5).map(sub => (
                        <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {sub.studentName}
                            <span className="text-slate-400 font-mono text-[11px] ml-1.5">({sub.studentCode})</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">{sub.className}</td>
                          <td className="py-3 px-3 font-medium text-slate-800">Nhiệm vụ {sub.taskNumber}</td>
                          <td className="py-3 px-3 font-mono text-slate-500">v{sub.currentVersion}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              sub.status === 'graded'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'oral_defense_pending'
                                ? 'bg-purple-100 text-purple-800'
                                : sub.status === 'submitted'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {sub.status === 'graded' ? 'Đã chấm' : sub.status === 'oral_defense_pending' ? 'Chờ vấn đáp' : sub.status === 'submitted' ? 'Đã nộp' : 'Bản nháp'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleOpenGrading(sub)}
                              className="px-3 py-1 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                            >
                              Chấm bài
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUBMISSIONS LIST & FILTER */}
          {activeTab === 'submissions' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Quản Lý & Chấm Bài Nộp Của Học Sinh
                  </h3>
                  <p className="text-xs text-slate-500">
                    Xem mã nguồn, kiểm thử, nhật ký AI và chấm điểm theo Rubric 6 tiêu chí
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <select
                    value={selectedClassFilter}
                    onChange={e => setSelectedClassFilter(e.target.value)}
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="all">Tất cả các lớp</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  <select
                    value={selectedTaskFilter}
                    onChange={e => setSelectedTaskFilter(e.target.value)}
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="all">Tất cả nhiệm vụ</option>
                    {tasks.map(t => <option key={t.id} value={t.id}>Nhiệm vụ {t.taskNumber}</option>)}
                  </select>

                  <select
                    value={selectedStatusFilter}
                    onChange={e => setSelectedStatusFilter(e.target.value)}
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="submitted">Đã nộp</option>
                    <option value="oral_defense_pending">Chờ vấn đáp</option>
                    <option value="graded">Đã chấm</option>
                    <option value="draft">Bản nháp</option>
                  </select>
                </div>
              </div>

              {/* Submissions List */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Học sinh</th>
                      <th className="py-3 px-3">Lớp</th>
                      <th className="py-3 px-3">Nhiệm vụ</th>
                      <th className="py-3 px-3">Phiên bản</th>
                      <th className="py-3 px-3">Trạng thái</th>
                      <th className="py-3 px-3">Điểm Rubric</th>
                      <th className="py-3 px-3">Thời gian nộp</th>
                      <th className="py-3 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map(sub => {
                      const evalData = evaluations.find(e => e.submissionId === sub.id);

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-slate-900 block">{sub.studentName}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{sub.studentCode}</span>
                          </td>
                          <td className="py-3.5 px-3 text-slate-600">{sub.className}</td>
                          <td className="py-3.5 px-3 font-semibold text-slate-800">Nhiệm vụ {sub.taskNumber}</td>
                          <td className="py-3.5 px-3 font-mono text-slate-600">v{sub.currentVersion} ({sub.versions.length} bản)</td>
                          <td className="py-3.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              sub.status === 'graded'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'oral_defense_pending'
                                ? 'bg-purple-100 text-purple-800'
                                : sub.status === 'submitted'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {sub.status === 'graded' ? 'Đã chấm' : sub.status === 'oral_defense_pending' ? 'Chờ vấn đáp' : sub.status === 'submitted' ? 'Đã nộp' : 'Bản nháp'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                            {evalData ? `${evalData.weightedScore10}/10` : '—'}
                          </td>
                          <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                            {new Date(sub.updatedAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <button
                              onClick={() => handleOpenGrading(sub)}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors"
                            >
                              Chấm & Vấn đáp
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GRADING & ORAL DEFENSE WORKSPACE */}
          {activeTab === 'grading' && selectedSubmission && (
            <div className="space-y-6">
              {/* Submission Header & Version Selector */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">
                        Chấm bài: {selectedSubmission.studentName} ({selectedSubmission.studentCode})
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        {selectedSubmission.className}
                      </span>
                      <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                        Nhiệm vụ {selectedSubmission.taskNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Ngày nộp: {new Date(selectedSubmission.updatedAt).toLocaleString('vi-VN')}
                    </p>
                  </div>

                  {/* Version picker */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-700">Lịch sử phiên bản bài nộp:</span>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {selectedSubmission.versions.map((ver, idx) => (
                        <button
                          key={ver.versionNumber}
                          onClick={() => setSelectedVersionIdx(idx)}
                          className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                            selectedVersionIdx === idx
                              ? 'bg-white text-slate-900 shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          v{ver.versionNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Student Submission Evidence Viewer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left: Analysis & Algorithm */}
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-900 block">1. Phân tích bài toán (Input/Output):</span>
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                        {currentVersion?.problemAnalysis || '(Học sinh chưa nhập)'}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-900 block">2. Thuật toán / Giả mã:</span>
                      <pre className="text-slate-800 whitespace-pre-wrap leading-relaxed font-mono">
                        {currentVersion?.algorithmPseudocode || '(Học sinh chưa nhập)'}
                      </pre>
                    </div>

                    {/* Test cases of student */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">3. Bộ test case tự lập ({currentVersion?.testCases.length || 0} ca):</span>
                        <button
                          onClick={() => setIsTestBenchOpen(true)}
                          className="text-[11px] text-blue-700 font-semibold hover:underline"
                        >
                          Mở bàn kiểm thử
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {currentVersion?.testCases.map((tc, i) => (
                          <div key={i} className="bg-white p-2 rounded border border-slate-200 font-mono text-[11px]">
                            <div className="font-bold text-slate-800">{tc.name}</div>
                            <div className="text-slate-600">Input: {tc.input.replace(/\n/g, ' ')} | Exp: {tc.expectedOutput.replace(/\n/g, ' ')}</div>
                            <div className="text-emerald-700">Actual: {tc.studentActualOutput?.replace(/\n/g, ' ') || 'Chưa ghi'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Python Source Code & AI Logs */}
                  <div className="space-y-3">
                    <div className="bg-slate-900 p-3.5 rounded-xl text-slate-100 space-y-1">
                      <span className="font-bold text-emerald-400 block text-xs font-mono">
                        {selectedSubmission.taskNumber === 2 ? 'Mã nguồn sau khi sửa lỗi:' : 'Mã nguồn Python của học sinh:'}
                      </span>
                      <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-56">
                        {selectedSubmission.taskNumber === 2
                          ? currentVersion?.fixedPythonCode || currentVersion?.pythonSourceCode
                          : currentVersion?.pythonSourceCode}
                      </pre>
                    </div>

                    {selectedSubmission.taskNumber === 2 && currentVersion?.bugExplanations && (
                      <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 space-y-1 text-slate-800">
                        <span className="font-bold text-amber-900 block">Giải thích 2 lỗi logic của học sinh:</span>
                        <p className="whitespace-pre-wrap">{currentVersion.bugExplanations}</p>
                      </div>
                    )}

                    {/* AI Disclosure in Task 3 */}
                    {selectedSubmission.taskNumber === 3 && currentVersion?.aiDisclosure && (
                      <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 space-y-1 text-slate-800">
                        <span className="font-bold text-blue-900 block">Khai báo sử dụng AI:</span>
                        <p><strong>Công cụ:</strong> {currentVersion.aiDisclosure.toolUsed}</p>
                        <p><strong>Nội dung đã tự kiểm chứng:</strong> {currentVersion.aiDisclosure.whatVerified}</p>
                        <p><strong>Cải tiến của học sinh:</strong> {currentVersion.aiDisclosure.whatImproved}</p>
                        <p><strong>Đóng góp trực tiếp:</strong> {currentVersion.aiDisclosure.studentContribution}</p>
                      </div>
                    )}

                    {/* Self Evaluation */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-900 block">Tự đánh giá của học sinh:</span>
                      <p>Mức hiểu biết: {currentVersion?.selfEvaluation.understandingScore}/4 · Tự tin: {currentVersion?.selfEvaluation.confidenceLevel}</p>
                      <p className="italic text-slate-600">"{currentVersion?.selfEvaluation.reflectionNotes || 'Không có ghi chú'}"</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RUBRIC GRADING SECTION */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Chấm Điểm Theo Rubric 6 Tiêu Chí
                    </h3>
                    <p className="text-xs text-slate-500">
                      Chọn mức độ biểu hiện và ghi nhận xét, minh chứng cho từng tiêu chí
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right">
                    <span className="text-[11px] text-emerald-800 font-medium block">Điểm Rubric quy đổi:</span>
                    <span className="text-2xl font-black text-emerald-700 font-mono">
                      {currentScore}
                    </span>
                    <span className="text-xs font-bold text-emerald-600"> / 10</span>
                  </div>
                </div>

                {/* 6 Criteria Selection */}
                <div className="space-y-4">
                  {RUBRIC_CRITERIA.map(rc => {
                    const currentGrade = rubricGrades[rc.id] || { level: 3, evidence: '', comment: '' };

                    return (
                      <div key={rc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {rc.code}. {rc.name} ({rc.weightPercentText})
                          </span>

                          {/* Level selector */}
                          <div className="flex items-center gap-1 bg-white border border-slate-300 p-1 rounded-xl">
                            {rc.levels.map(lvl => (
                              <button
                                key={lvl.level}
                                type="button"
                                onClick={() => setRubricGrades({
                                  ...rubricGrades,
                                  [rc.id]: { ...currentGrade, level: lvl.level }
                                })}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                                  currentGrade.level === lvl.level
                                    ? lvl.level === 0 ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {lvl.level === 0 ? 'Mức 0' : `Mức ${lvl.level}`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Description of current selected level */}
                        <div className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                          <strong>Mô tả mức {currentGrade.level}:</strong>{' '}
                          {rc.levels.find(l => l.level === currentGrade.level)?.description}
                        </div>

                        {/* Level 0 reason requirement */}
                        {currentGrade.level === 0 && (
                          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg space-y-1">
                            <label className="font-bold text-red-900 block">
                              Lý do bắt buộc khi cho Mức 0 (Hoàn toàn không có minh chứng):
                            </label>
                            <input
                              type="text"
                              value={currentGrade.reason || ''}
                              onChange={e => setRubricGrades({
                                ...rubricGrades,
                                [rc.id]: { ...currentGrade, reason: e.target.value }
                              })}
                              placeholder="Ghi rõ lý do tại sao học sinh nhận mức 0..."
                              className="w-full p-2 bg-white border border-red-300 rounded text-xs text-red-900"
                            />
                          </div>
                        )}

                        {/* Evidence & Comment inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="font-semibold text-slate-700 block mb-0.5">Minh chứng bài làm:</label>
                            <input
                              type="text"
                              value={currentGrade.evidence}
                              onChange={e => setRubricGrades({
                                ...rubricGrades,
                                [rc.id]: { ...currentGrade, evidence: e.target.value }
                              })}
                              className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900"
                              placeholder="Trích dẫn đoạn mã hoặc test case..."
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-700 block mb-0.5">Nhận xét của giáo viên:</label>
                            <input
                              type="text"
                              value={currentGrade.comment}
                              onChange={e => setRubricGrades({
                                ...rubricGrades,
                                [rc.id]: { ...currentGrade, comment: e.target.value }
                              })}
                              className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900"
                              placeholder="Góp ý cụ thể cho học sinh..."
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ORAL DEFENSE QUESTIONING & OWNERSHIP VERIFICATION */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-purple-600" />
                      Vấn Đáp Kiểm Chứng Quyền Sở Hữu Hiểu Biết (Oral Defense)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Chọn câu hỏi từ ngân hàng đề, ghi tóm tắt câu trả lời và đánh giá mức độ hiểu biết thực chất
                    </p>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-purple-900 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOwnershipConfirmed}
                      onChange={e => setIsOwnershipConfirmed(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span>Xác nhận quyền sở hữu hiểu biết</span>
                  </label>
                </div>

                {/* Questions selected */}
                <div className="space-y-3">
                  {oralQuestionsSelected.map((q, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/30 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-950">
                          Câu {idx + 1}: {q.questionText}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Mức hiểu biết:</span>
                          <select
                            value={q.understandingScore}
                            onChange={e => {
                              const updated = [...oralQuestionsSelected];
                              updated[idx].understandingScore = Number(e.target.value) as any;
                              setOralQuestionsSelected(updated);
                            }}
                            className="p-1 bg-white border border-slate-300 rounded text-xs"
                          >
                            <option value={1}>Mức 1: Kém</option>
                            <option value={2}>Mức 2: Một phần</option>
                            <option value={3}>Mức 3: Tốt</option>
                            <option value={4}>Mức 4: Sâu sắc</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Tóm tắt câu trả lời của học sinh:</label>
                        <textarea
                          value={q.studentAnswerSummary}
                          onChange={e => {
                            const updated = [...oralQuestionsSelected];
                            updated[idx].studentAnswerSummary = e.target.value;
                            setOralQuestionsSelected(updated);
                          }}
                          rows={2}
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs text-slate-900"
                          placeholder="Ghi nhận câu trả lời thực tế của học sinh trong buổi vấn đáp..."
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add question from bank */}
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-slate-600 font-semibold">Thêm câu hỏi từ ngân hàng:</span>
                  <select
                    onChange={e => {
                      if (!e.target.value) return;
                      const qMeta = ORAL_DEFENSE_QUESTIONS.find(q => q.id === e.target.value);
                      if (qMeta && !oralQuestionsSelected.some(o => o.questionId === qMeta.id)) {
                        setOralQuestionsSelected([
                          ...oralQuestionsSelected,
                          {
                            questionId: qMeta.id,
                            questionText: qMeta.questionText,
                            studentAnswerSummary: '',
                            understandingScore: 3,
                            teacherNote: qMeta.idealAnswerGuidelines
                          }
                        ]);
                      }
                      e.target.value = '';
                    }}
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                  >
                    <option value="">-- Chọn câu hỏi vấn đáp --</option>
                    {ORAL_DEFENSE_QUESTIONS.map(q => (
                      <option key={q.id} value={q.id}>
                        {q.id}: {q.questionText}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-900 text-xs block">
                    Kết luận chung của giáo viên về quyền sở hữu mã nguồn:
                  </label>
                  <input
                    type="text"
                    value={oralOverallConclusion}
                    onChange={e => setOralOverallConclusion(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    placeholder="Ví dụ: Học sinh nắm chắc các khối lệnh, giải thích rõ ràng và trả lời chính xác các câu hỏi then chốt..."
                  />
                </div>
              </div>

              {/* GENERAL FEEDBACK & RECOMMENDATIONS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
                <h3 className="font-bold text-slate-900 text-sm">
                  Nhận Xét Tổng Thể & Khuyến Nghị
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Điểm mạnh:</label>
                    <textarea
                      value={strengths}
                      onChange={e => setStrengths(e.target.value)}
                      rows={2}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                      placeholder="Mã nguồn gọn gàng, tư duy thuật toán tốt..."
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Điểm cần cải thiện:</label>
                    <textarea
                      value={weaknesses}
                      onChange={e => setWeaknesses(e.target.value)}
                      rows={2}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                      placeholder="Cần chú thích rõ hơn, cẩn trọng với các trường hợp biên..."
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Khuyến nghị:</label>
                    <textarea
                      value={recommendations}
                      onChange={e => setRecommendations(e.target.value)}
                      rows={2}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                      placeholder="Thử thách với các bài toán mở rộng..."
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nhận xét chung gửi học sinh:</label>
                  <textarea
                    value={generalFeedback}
                    onChange={e => setGeneralFeedback(e.target.value)}
                    rows={2}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                    placeholder="Nhận xét tổng thể..."
                  />
                </div>
              </div>

              {/* ACTION BAR: SAVE EVALUATION */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between sticky bottom-4 z-20">
                <button
                  onClick={() => setActiveTab('submissions')}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Quay lại danh sách
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSaveEvaluation(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors"
                  >
                    Lưu bản nháp đánh giá
                  </button>

                  <button
                    onClick={() => handleSaveEvaluation(true)}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Xác nhận kết quả cuối cùng
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOUBLE GRADING RECONCILIATION */}
          {activeTab === 'double-grading' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                    Đánh Giá Độc Lập Bởi Hai Người Chấm (Double Grading)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Người chấm 2 chấm độc lập không nhìn thấy điểm người chấm 1; tự động tính độ đồng thuận và đối chiếu chênh lệch
                  </p>
                </div>
              </div>

              {doubleGradingData ? (
                <div className="space-y-6">
                  {/* Consensus and Delta Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs text-slate-500 font-medium">Tỷ lệ đồng thuận Rubric:</span>
                      <div className="text-2xl font-black text-emerald-600 font-mono">
                        {doubleGradingData.consensusRatePercent}%
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {doubleGradingData.consensusRatePercent >= 80 ? 'Độ tin cậy cao' : 'Cần thảo luận đối chiếu'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs text-slate-500 font-medium">Chênh lệch điểm tổng hợp:</span>
                      <div className="text-2xl font-black text-slate-900 font-mono">
                        {doubleGradingData.scoreDelta} điểm
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {doubleGradingData.scoreDelta <= 0.5 ? 'Chênh lệch trong giới hạn cho phép' : 'Cần hội đồng thống nhất'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs text-slate-500 font-medium">Trạng thái chấm độc lập:</span>
                      <div className="text-sm font-bold text-slate-800 mt-1">
                        {doubleGradingData.isGrader2Finished ? 'Cả 2 giám khảo đã chấm xong' : 'Người chấm 2 đang chấm (ẩn điểm)'}
                      </div>
                      <span className="text-[11px] text-slate-500">Bảo mật thang điểm</span>
                    </div>
                  </div>

                  {/* Divergent Criteria List */}
                  {doubleGradingData.divergentCriteria && doubleGradingData.divergentCriteria.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 text-xs">
                      <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-700" />
                        Các tiêu chí có sự bất đồng cần đối chiếu ({doubleGradingData.divergentCriteria.length} tiêu chí):
                      </h4>
                      <div className="space-y-2">
                        {doubleGradingData.divergentCriteria.map((dc: any) => (
                          <div key={dc.criterionId} className="bg-white p-2.5 rounded-lg border border-amber-200 flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{dc.criterionName}</span>
                            <div className="flex items-center gap-3 font-mono font-bold">
                              <span className="text-blue-700">Người chấm 1: Mức {dc.grader1Level}</span>
                              <span>·</span>
                              <span className="text-purple-700">Người chấm 2: Mức {dc.grader2Level}</span>
                              <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Lệch {dc.difference} mức</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reconciliation Form */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Biên Bản Thống Nhất Điểm Sau Đối Chiếu Của Hội Đồng:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-slate-800 block mb-1">Điểm thống nhất cuối cùng (thang 10):</label>
                        <input
                          type="number"
                          step="0.1"
                          value={reconciledScoreInput}
                          onChange={e => setReconciledScoreInput(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-800 block mb-1">Người đại diện ghi nhận:</label>
                        <input
                          type="text"
                          value={currentTeacher.name}
                          disabled
                          className="w-full p-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-800 block mb-1">Nội dung thảo luận & kết luận thống nhất:</label>
                      <textarea
                        value={reconciledNotesInput}
                        onChange={e => setReconciledNotesInput(e.target.value)}
                        rows={2}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>

                    <button
                      onClick={handleReconcileDoubleGrading}
                      className="px-5 py-2 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors"
                    >
                      Lưu kết quả thống nhất của hội đồng
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                  <UserCheck className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Hãy chọn một bài nộp từ tab "Quản lý & Chấm bài" để xem đối chiếu hai người chấm.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CLASSES & SESSION CODES */}
          {activeTab === 'classes' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Quản Lý Lớp Học & Mã Phiên Học Sinh
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cấp mã phiên có thời hạn, học sinh không cần tài khoản Google vẫn có thể đăng nhập bảo mật
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCreateClassOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tạo lớp mới
                  </button>
                </div>
              </div>

              {/* Classes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {classes.map(c => (
                  <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                      <span className="text-[11px] font-mono text-slate-500 font-semibold">{c.studentCount} học sinh</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p>Khối {c.grade} · Năm học: {c.academicYear}</p>
                      <p>Giáo viên phụ trách: {c.teacherName}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={async () => {
                          setTargetClassId(c.id);
                          const stds = await api.getClassStudents(c.id);
                          setStudents(stds);
                        }}
                        className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        Xem danh sách học sinh
                      </button>

                      <button
                        onClick={() => handleRenewSessions(c.id)}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        Cấp lại mã phiên
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Students in Selected Class */}
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Danh Sách Học Sinh & Mã Phiên Hiện Tại:
                  </h4>
                  <button
                    onClick={() => setIsAddStudentOpen(true)}
                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    + Thêm học sinh
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Mã số</th>
                        <th className="py-2.5 px-3">Họ và tên</th>
                        <th className="py-2.5 px-3">Mã phiên đăng nhập</th>
                        <th className="py-2.5 px-3">Thời hạn</th>
                        <th className="py-2.5 px-3">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{s.studentCode}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{s.fullName}</td>
                          <td className="py-2.5 px-3 font-mono text-emerald-700 font-bold">
                            <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              {s.sessionCode}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">30 ngày</td>
                          <td className="py-2.5 px-3 text-slate-500">{s.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: TASK MANAGER (Ngân hàng bài tập, Giao bài, Theo dõi bài nộp) */}
          {activeTab === 'tasks' && (
            <TaskManager
              currentTeacher={currentTeacher}
              classes={classes}
              onOpenGrading={handleOpenGrading}
              onRefreshData={loadAllData}
            />
          )}

          {/* TAB 7: APPEALS MANAGEMENT */}
          {activeTab === 'appeals' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Quản Lý Yêu Cầu Xem Lại Kết Quả (Phúc Khảo)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bảo đảm quyền lợi học sinh: giáo viên xem xét các minh chứng bổ sung và giải thích công khai
                  </p>
                </div>
              </div>

              {appeals.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Hiện không có yêu cầu xem lại nào từ học sinh.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appeals.map(a => (
                    <div key={a.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{a.studentName}</span>
                          <span className="text-slate-500 ml-2 font-mono">({a.taskTitle})</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          a.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : a.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {a.status === 'accepted' ? 'Đã duyệt' : a.status === 'rejected' ? 'Từ chối' : 'Chờ xử lý'}
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                        <span className="font-semibold text-slate-800">Lý do học sinh đề nghị:</span>
                        <p className="text-slate-700">{a.studentReason}</p>
                        {a.studentEvidence && (
                          <p className="text-slate-500 font-mono text-[11px] mt-1">Minh chứng: {a.studentEvidence}</p>
                        )}
                      </div>

                      {a.teacherResponse ? (
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1">
                          <span className="font-semibold text-emerald-900">Phản hồi của giáo viên:</span>
                          <p className="text-emerald-800">{a.teacherResponse}</p>
                          {a.scoreAdjustment && (
                            <span className="font-bold font-mono text-emerald-700">Điểm sau điều chỉnh: {a.scoreAdjustment}/10</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedAppeal(a);
                              setAppealTeacherResponse('Giáo viên đã rà soát lại minh chứng test case và đồng ý điều chỉnh điểm.');
                            }}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                          >
                            Xử lý yêu cầu này
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ghi vết toàn bộ hành vi nộp bài, chấm điểm, sửa điểm và đối chiếu
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs flex items-start justify-between gap-4 font-mono">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{log.action}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-sans">
                          {log.actorName} ({log.actorRole})
                        </span>
                      </div>
                      <p className="text-slate-600 font-sans text-[11px]">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: ADMIN USER MANAGEMENT */}
          {activeTab === 'users' && currentTeacher.role === 'admin' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Quản Trị Tài Khoản Giáo Viên & Phân Quyền (Admin)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phê duyệt tài khoản đăng ký mới, khóa/mở khóa tài khoản và phân vai trò hệ thống
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-100 text-slate-800 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Họ và tên</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Vai trò</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3">Ngày đăng ký</th>
                      <th className="p-3 text-right">Thao tác quản trị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{u.name}</td>
                        <td className="p-3 font-mono text-slate-600">{u.email}</td>
                        <td className="p-3">
                          <select
                            value={u.role || 'teacher'}
                            onChange={e => handleUpdateUserRole(u.id, e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800"
                          >
                            <option value="teacher">Giáo viên (Teacher)</option>
                            <option value="second_grader">Giám khảo 2 (Second Grader)</option>
                            <option value="admin">Quản trị (Admin)</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            u.status === 'approved' || u.isApproved
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : u.status === 'locked'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            {u.status === 'approved' || u.isApproved ? 'Đã duyệt' : u.status === 'pending' ? 'Chờ duyệt' : u.status === 'locked' ? 'Đã khóa' : u.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {new Date(u.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {(!u.status || u.status === 'pending') && (
                            <button
                              onClick={() => handleUpdateUserStatus(u.id, 'approved')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                            >
                              Phê duyệt
                            </button>
                          )}
                          {u.status !== 'locked' ? (
                            <button
                              onClick={() => handleUpdateUserStatus(u.id, 'locked')}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold"
                            >
                              Khóa
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateUserStatus(u.id, 'approved')}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                            >
                              Mở khóa
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Appeal Response Modal */}
      {selectedAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Phản Hồi Yêu Cầu Xem Lại: {selectedAppeal.studentName}
            </h3>
            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              "{selectedAppeal.studentReason}"
            </p>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-800 block">Nội dung giải thích của giáo viên:</label>
              <textarea
                value={appealTeacherResponse}
                onChange={e => setAppealTeacherResponse(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-800 block">Điểm điều chỉnh mới (nếu có, thang 10):</label>
              <input
                type="number"
                step="0.1"
                value={appealScoreAdjustment}
                onChange={e => setAppealScoreAdjustment(e.target.value)}
                placeholder="Để trống nếu giữ nguyên điểm cũ"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedAppeal(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={() => handleRespondAppeal('rejected')}
                className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
              >
                Giữ nguyên điểm
              </button>
              <button
                onClick={() => handleRespondAppeal('accepted')}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Chấp nhận & Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {isCreateClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Tạo Lớp Học Mới</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">Tên lớp:</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  placeholder="Ví dụ: Lớp 8A3"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-800 block mb-1">Khối lớp:</label>
                <select
                  value={newClassGrade}
                  onChange={e => setNewClassGrade(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="6">Khối 6</option>
                  <option value="7">Khối 7</option>
                  <option value="8">Khối 8</option>
                  <option value="9">Khối 9</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCreateClassOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateClass}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Tạo lớp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Thêm Học Sinh Vào Lớp</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">Họ và tên học sinh:</label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Tuấn Anh"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-800 block mb-1">Mã học sinh (tùy chọn):</label>
                <input
                  type="text"
                  value={newStudentCode}
                  onChange={e => setNewStudentCode(e.target.value)}
                  placeholder="Ví dụ: HS06"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleAddStudent}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Thêm & Cấp mã phiên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <TestBenchModal
        isOpen={isTestBenchOpen}
        onClose={() => setIsTestBenchOpen(false)}
        defaultTaskNumber={(selectedSubmission?.taskNumber as 1 | 2 | 3) || 1}
      />

      <FirebaseGuideModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />
    </div>
  );
};
