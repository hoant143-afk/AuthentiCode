import React, { useState, useEffect } from 'react';
import {
  BookOpen, Code, Bot, CheckCircle, Save, Send, AlertCircle,
  HelpCircle, MessageSquare, Play, Sparkles, User, RefreshCw, FileText,
  ClipboardList, Calendar, Clock, CheckCircle2, AlertTriangle, ChevronRight, Lock
} from 'lucide-react';
import { Student, ClassGroup, AssessmentTask, Submission, TestCaseItem, AILogEntry, TaskAssignment } from '../../types';
import { api } from '../../services/api';
import { TestBenchModal } from '../common/TestBenchModal';

interface Props {
  student: Student;
  classGroup?: ClassGroup;
  tasks: AssessmentTask[];
  onExit: () => void;
}

export const StudentPortal: React.FC<Props> = ({
  student,
  classGroup,
  tasks,
  onExit
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'my-tasks' | 'task-1' | 'task-2' | 'task-3' | 'ai-log' | 'feedback'>('my-tasks');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [assignedItems, setAssignedItems] = useState<{
    assignment: TaskAssignment;
    task: AssessmentTask;
    submission: Submission | null;
    isOverdue: boolean;
    studentStatus: string;
  }[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [myTasksFilter, setMyTasksFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTestBenchOpen, setIsTestBenchOpen] = useState(false);
  const [testBenchTask, setTestBenchTask] = useState<1 | 2 | 3>(1);

  // Form states for the currently selected task workspace
  const [problemAnalysis, setProblemAnalysis] = useState('');
  const [algorithmPseudocode, setAlgorithmPseudocode] = useState('');
  const [pythonSourceCode, setPythonSourceCode] = useState('');
  const [fixedPythonCode, setFixedPythonCode] = useState('');
  const [bugExplanations, setBugExplanations] = useState('');
  const [explanation, setExplanation] = useState('');
  const [testCases, setTestCases] = useState<TestCaseItem[]>([]);
  const [selfScore, setSelfScore] = useState<number>(3);
  const [selfConfidence, setSelfConfidence] = useState<'low' | 'medium' | 'high'>('high');
  const [selfNotes, setSelfNotes] = useState('');

  // AI disclosure states for Task 3
  const [aiToolUsed, setAiToolUsed] = useState('Gemini 3.8 Flash (Tích hợp AuthentiCode)');
  const [aiPromptEntered, setAiPromptEntered] = useState('');
  const [aiResponseReceived, setAiResponseReceived] = useState('');
  const [whatVerified, setWhatVerified] = useState('');
  const [whatImproved, setWhatImproved] = useState('');
  const [studentContribution, setStudentContribution] = useState('');
  const [useTeacherSample, setUseTeacherSample] = useState(false);

  // In-workspace interactive AI Assistant chat
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string; time: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Appeal Modal State
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealEvidence, setAppealEvidence] = useState('');

  // Individual assignment code verification modal state
  const [unlockedAssignmentIds, setUnlockedAssignmentIds] = useState<string[]>([]);
  const [individualCodeModalAssignment, setIndividualCodeModalAssignment] = useState<TaskAssignment | null>(null);
  const [individualCodeInput, setIndividualCodeInput] = useState('');
  const [individualCodeError, setIndividualCodeError] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  const handleSelectAssignedItem = (assignment: TaskAssignment, task: AssessmentTask, tabKey: any) => {
    if (assignment.individualAssignmentCode && !unlockedAssignmentIds.includes(assignment.id)) {
      setIndividualCodeModalAssignment(assignment);
      setIndividualCodeInput('');
      setIndividualCodeError('');
      return;
    }
    setSelectedAssignmentId(assignment.id);
    setActiveTaskId(task.id);
    setActiveTab(tabKey);
  };

  const handleVerifyIndividualCode = async () => {
    if (!individualCodeModalAssignment) return;
    if (!individualCodeInput.trim()) {
      setIndividualCodeError('Vui lòng nhập mã bài tập cá nhân.');
      return;
    }
    setIsVerifyingCode(true);
    setIndividualCodeError('');
    try {
      const res = await api.verifyIndividualAssignmentCode(
        individualCodeModalAssignment.id,
        student.id,
        individualCodeInput.trim()
      );
      if (res && res.valid) {
        setUnlockedAssignmentIds(prev => [...prev, individualCodeModalAssignment.id]);
        setSelectedAssignmentId(individualCodeModalAssignment.id);
        setActiveTaskId(individualCodeModalAssignment.taskId);
        setActiveTab(`task-${individualCodeModalAssignment.taskNumber}` as any);
        setIndividualCodeModalAssignment(null);
      } else {
        setIndividualCodeError(res.message || 'Mã bài tập cá nhân không hợp lệ hoặc bạn không thuộc danh sách được giao.');
      }
    } catch (err: any) {
      setIndividualCodeError(err.message || 'Lỗi khi xác minh mã bài tập cá nhân.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Identify current assigned item and active task
  const currentAssignedItem = assignedItems.find(a => a.assignment?.id === selectedAssignmentId)
    || assignedItems.find(a => a.task?.id === activeTaskId)
    || assignedItems.find(a => `task-${a.task?.taskNumber}` === activeTab);

  const activeTask: AssessmentTask | undefined = currentAssignedItem?.task
    || tasks.find(t => `task-${t.taskNumber}` === activeTab)
    || tasks.find(t => t.id === activeTaskId)
    || (assignedItems.length > 0 ? assignedItems[0].task : tasks[0]);

  const activeAssignment = currentAssignedItem?.assignment
    || (activeTask ? assignedItems.find(a => a.task?.id === activeTask.id)?.assignment : undefined);

  // Load student submissions & assigned tasks
  const loadStudentData = async () => {
    setIsLoading(true);
    try {
      const subs = await api.getSubmissions({ studentId: student.id });
      setSubmissions(subs);

      const assigned = await api.getMyAssignedTasks(student.id, student.classId);
      setAssignedItems(assigned);

      const evals = await api.getEvaluations();
      const studentEvals = evals.filter((e: any) => subs.some((s: any) => s.id === e.submissionId));
      setEvaluations(studentEvals);

      const aps = await api.getAppeals(student.id);
      setAppeals(aps);
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu học sinh:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [student.id, student.classId]);

  const filteredAssignedItems = assignedItems.filter(item => {
    if (myTasksFilter === 'pending') {
      return !item.submission || item.submission.status === 'draft';
    }
    if (myTasksFilter === 'submitted') {
      return item.submission && item.submission.status === 'submitted';
    }
    if (myTasksFilter === 'graded') {
      return item.submission && item.submission.status === 'graded';
    }
    return true;
  });

  // When switching task tabs, populate form with existing submission data
  useEffect(() => {
    if (!activeTask) return;

    const existingSub = (activeAssignment ? submissions.find(s => s.assignmentId === activeAssignment.id) : undefined)
      || submissions.find(s => s.taskNumber === activeTask.taskNumber);
    if (existingSub && existingSub.versions.length > 0) {
      const latestVer = existingSub.versions[existingSub.versions.length - 1];
      setProblemAnalysis(latestVer.problemAnalysis || '');
      setAlgorithmPseudocode(latestVer.algorithmPseudocode || '');
      setPythonSourceCode(latestVer.pythonSourceCode || '');
      setFixedPythonCode(latestVer.fixedPythonCode || '');
      setBugExplanations(latestVer.bugExplanations || '');
      setExplanation(latestVer.explanation || '');
      setTestCases(latestVer.testCases || activeTask.mandatoryTestCases.map((tc, idx) => ({
        id: `tc-${idx + 1}`,
        name: `Test case ${idx + 1}`,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        description: tc.description,
        isMandatory: true
      })));
      setSelfScore(latestVer.selfEvaluation?.understandingScore || 3);
      setSelfConfidence(latestVer.selfEvaluation?.confidenceLevel || 'high');
      setSelfNotes(latestVer.selfEvaluation?.reflectionNotes || '');

      if (latestVer.aiDisclosure) {
        setAiToolUsed(latestVer.aiDisclosure.toolUsed || 'Gemini 3.8 Flash');
        setWhatVerified(latestVer.aiDisclosure.whatVerified || '');
        setWhatImproved(latestVer.aiDisclosure.whatImproved || '');
        setStudentContribution(latestVer.aiDisclosure.studentContribution || '');
        setUseTeacherSample(Boolean(latestVer.aiDisclosure.teacherProvidedSampleUsed));
      }
    } else {
      // Initialize with task defaults
      setProblemAnalysis('');
      setAlgorithmPseudocode('');
      setPythonSourceCode(activeTask.starterCode || '');
      setFixedPythonCode('');
      setBugExplanations('');
      setExplanation('');
      setTestCases(activeTask.mandatoryTestCases.map((tc, idx) => ({
        id: `tc-${idx + 1}`,
        name: `Test case ${idx + 1}`,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        description: tc.description,
        isMandatory: true
      })));
      setSelfScore(3);
      setSelfConfidence('high');
      setSelfNotes('');
      setAiToolUsed('Gemini 3.8 Flash (Tích hợp AuthentiCode)');
      setWhatVerified('');
      setWhatImproved('');
      setStudentContribution('');
      setUseTeacherSample(false);
    }

    setChatMessages([]);
  }, [activeTab, submissions]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Add a new custom test case
  const handleAddTestCase = () => {
    const newTc: TestCaseItem = {
      id: `custom-tc-${Date.now()}`,
      name: `Test case tự tạo ${testCases.length + 1}`,
      input: '',
      expectedOutput: '',
      description: 'Ca kiểm thử tự thiết kế của học sinh'
    };
    setTestCases([...testCases, newTc]);
  };

  const handleUpdateTestCase = (id: string, field: keyof TestCaseItem, value: any) => {
    setTestCases(testCases.map(tc => tc.id === id ? { ...tc, [field]: value } : tc));
  };

  const handleDeleteTestCase = (id: string) => {
    setTestCases(testCases.filter(tc => tc.id !== id));
  };

  // Run quick check for a test case
  const handleRunTestCaseCheck = async (tcId: string) => {
    const tc = testCases.find(t => t.id === tcId);
    if (!tc || !tc.input) {
      showNotification('error', 'Vui lòng nhập dữ liệu đầu vào (Input) cho test case.');
      return;
    }

    try {
      const res = await api.verifyTestRunner(
        activeTask?.taskNumber || 1,
        tc.input,
        tc.studentActualOutput || ''
      );

      setTestCases(testCases.map(t => {
        if (t.id === tcId) {
          return {
            ...t,
            expectedOutput: res.expectedOutput,
            isMatch: res.isMatch
          };
        }
        return t;
      }));

      if (res.isMatch) {
        showNotification('success', `Test case "${tc.name}" khớp 100% với thuật toán chuẩn!`);
      } else {
        showNotification('error', `Test case "${tc.name}" chưa khớp. Kiểm tra gợi ý trong Bàn kiểm thử.`);
      }
    } catch (err: any) {
      showNotification('error', 'Lỗi kiểm tra test case.');
    }
  };

  // Ask Gemini Assistant (Enforcing AI Level Policy)
  const handleSendMessageToAI = async () => {
    if (!chatInput.trim() || !activeTask) return;

    if (activeTask.aiLevel === 'T1') {
      showNotification('error', 'Bài tập mức độ T1 nghiêm cấm sử dụng AI!');
      return;
    }

    const userPrompt = chatInput.trim();
    setChatInput('');
    const newMsg = { sender: 'user' as const, text: userPrompt, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages(prev => [...prev, newMsg]);

    setIsAiLoading(true);
    try {
      const res = await api.askGemini({
        taskId: activeTask.id,
        taskNumber: activeTask.taskNumber,
        prompt: userPrompt,
        studentId: student.id,
        studentCode: student.studentCode
      });
      const aiReply = {
        sender: 'ai' as const,
        text: res.reply,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, aiReply]);

      // If Level T3, record response to state for easy review
      if (activeTask.aiLevel === 'T3') {
        setAiPromptEntered(userPrompt);
        setAiResponseReceived(res.reply);
      }
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `[Thông báo hệ thống]: ${err.message || 'Không thể kết nối trợ lý AI lúc này. Em hãy sử dụng bàn kiểm thử độc lập.'}`,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Save Submission (Draft or Final)
  const handleSaveSubmission = async (isFinal: boolean) => {
    if (!activeTask) return;

    // Check completeness if final
    if (isFinal) {
      if (!problemAnalysis.trim()) {
        showNotification('error', 'Vui lòng hoàn thành phần Phân tích bài toán.');
        return;
      }
      if (!algorithmPseudocode.trim()) {
        showNotification('error', 'Vui lòng hoàn thành phần Thuật toán / Giả mã.');
        return;
      }
      if (activeTask.aiLevel === 'T2' && !fixedPythonCode.trim()) {
        showNotification('error', 'Vui lòng nhập mã Python sau khi đã sửa lỗi cho Nhiệm vụ.');
        return;
      }
      if (activeTask.aiLevel !== 'T2' && !pythonSourceCode.trim()) {
        showNotification('error', 'Vui lòng nhập mã nguồn Python.');
        return;
      }
      if (testCases.length < activeTask.mandatoryTestCases.length) {
        showNotification('error', `Cần có tối thiểu ${activeTask.mandatoryTestCases.length} test case theo quy định của đề bài.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const aiLogsPayload: AILogEntry[] = chatMessages
        .filter((_, idx) => idx % 2 === 0)
        .map((msg, i) => {
          const aiMsg = chatMessages[i * 2 + 1];
          return {
            id: `ai-entry-${Date.now()}-${i}`,
            timestamp: new Date().toISOString(),
            aiTool: aiToolUsed,
            prompt: msg.text,
            aiResponse: aiMsg?.text || '',
            studentVerificationNote: whatVerified || 'Đã kiểm thử lại bằng Thonny',
            studentDecision: 'modified_improved',
            decisionRationale: whatImproved || 'Học sinh tự sửa và tối ưu'
          };
        });

      const submissionPayload = {
        assignmentId: activeAssignment?.id || undefined,
        taskId: activeTask.id,
        taskNumber: activeTask.taskNumber,
        studentId: student.id,
        studentName: student.fullName,
        studentCode: student.studentCode,
        classId: student.classId,
        className: classGroup?.name || 'Lớp 8A1',
        isFinalSubmission: isFinal,
        submissionData: {
          problemAnalysis,
          algorithmPseudocode,
          pythonSourceCode,
          fixedPythonCode: activeTask.aiLevel === 'T2' ? fixedPythonCode : undefined,
          bugExplanations: activeTask.aiLevel === 'T2' ? bugExplanations : undefined,
          testCases,
          explanation,
          selfEvaluation: {
            understandingScore: selfScore,
            confidenceLevel: selfConfidence,
            reflectionNotes: selfNotes
          },
          aiLogs: aiLogsPayload,
          aiDisclosure: activeTask.aiLevel === 'T3' ? {
            usedAI: true,
            toolUsed: aiToolUsed,
            promptsCount: chatMessages.filter(m => m.sender === 'user').length,
            whatVerified,
            whatImproved,
            studentContribution,
            teacherProvidedSampleUsed: useTeacherSample
          } : undefined
        }
      };

      await api.saveSubmission(submissionPayload);
      showNotification('success', isFinal ? 'Đã nộp bài chính thức thành công! Hồ sơ đã lưu trữ lịch sử.' : 'Đã lưu bản nháp thành công!');
      loadStudentData();
    } catch (err: any) {
      showNotification('error', err.message || 'Lỗi khi lưu bài nộp.');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit appeal
  const handleSubmitAppeal = async () => {
    if (!appealReason.trim()) {
      showNotification('error', 'Vui lòng ghi rõ lý do đề nghị xem lại.');
      return;
    }

    try {
      await api.submitAppeal({
        submissionId: submissions[0]?.id || 'sub-general',
        studentId: student.id,
        studentName: student.fullName,
        taskTitle: activeTask?.title || 'Nhiệm vụ',
        studentReason: appealReason,
        studentEvidence: appealEvidence
      });
      showNotification('success', 'Đã gửi đề nghị xem lại đến giáo viên!');
      setIsAppealModalOpen(false);
      setAppealReason('');
      setAppealEvidence('');
      loadStudentData();
    } catch (err: any) {
      showNotification('error', err.message || 'Lỗi khi gửi yêu cầu xem lại.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar for Student */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            AC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">AuthentiCode</span>
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                Cổng Học Sinh
              </span>
            </div>
            <p className="text-xs text-slate-500">Học lập trình – Hiểu bản chất – Làm chủ AI</p>
          </div>
        </div>

        {/* Student Session Chip & Controls */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 bg-slate-100/80 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs">
            <User className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="font-bold text-slate-900">{student.fullName}</span>
              <span className="text-slate-500 ml-1.5 font-mono">({student.studentCode} · {classGroup?.name || 'Lớp 8A1'})</span>
            </div>
            <div className="border-l border-slate-300 pl-3">
              <span className="text-slate-500">Mã phiên: </span>
              <code className="font-mono font-bold text-slate-800">{student.sessionCode}</code>
            </div>
          </div>

          {/* Individual Task Code Entry */}
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
            <input
              type="text"
              placeholder="Nhập mã bài"
              className="bg-transparent text-xs text-blue-900 font-mono focus:outline-hidden w-24"
            />
            <button className="text-[10px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded">Gửi</button>
          </div>


          <button
            onClick={onExit}
            className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
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
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Left Navigation Sidebar */}
        <aside className="w-64 shrink-0 hidden md:block space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-1">
            <button
              onClick={() => setActiveTab('my-tasks')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'my-tasks'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-4 h-4" />
                <span>Bài tập của tôi</span>
              </div>
              {assignedItems.length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'my-tasks' ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {assignedItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'overview'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4" />
                <span>Tổng quan học tập</span>
              </div>
            </button>

            <div className="pt-2 pb-1 px-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Nhiệm vụ được giao ({assignedItems.length})
            </div>

            {assignedItems.length > 0 ? (
              assignedItems.map(item => {
                const { assignment, task, submission } = item;
                const tabKey = `task-${task.taskNumber}` as any;
                const isSelected = activeTab === tabKey && (selectedAssignmentId === assignment.id || !selectedAssignmentId);
                const isGraded = submission?.status === 'graded';
                const isSubmitted = submission?.status === 'submitted' || isGraded;
                const isDraft = submission?.status === 'draft';

                const isLockedIndividual = Boolean(assignment.individualAssignmentCode && !unlockedAssignmentIds.includes(assignment.id));

                return (
                  <button
                    key={assignment.id}
                    onClick={() => handleSelectAssignedItem(assignment, task, tabKey)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {task.aiLevel || `NV${task.taskNumber}`}
                      </span>
                      <span className="truncate">NV {task.taskNumber}: {task.title.split(':')[1] || task.title}</span>
                      {isLockedIndividual && (
                        <span className={`text-[9px] px-1 py-0.5 rounded font-mono ${isSelected ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'}`}>
                          Mã riêng
                        </span>
                      )}
                    </div>
                    {isGraded ? (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                        Đã chấm
                      </span>
                    ) : isSubmitted ? (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'}`}>
                        Đã nộp
                      </span>
                    ) : isDraft ? (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                        Nháp
                      </span>
                    ) : (
                      <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>Chưa làm</span>
                    )}
                  </button>
                );
              })
            ) : (
              tasks.map(t => {
                const tabKey = `task-${t.taskNumber}` as any;
                const sub = submissions.find(s => s.taskNumber === t.taskNumber);
                const isGraded = sub?.status === 'graded';
                const isSubmitted = sub?.status === 'submitted' || isGraded;

                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(tabKey)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                      activeTab === tabKey
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Code className="w-4 h-4 shrink-0" />
                      <span className="truncate">Nhiệm vụ {t.taskNumber}</span>
                    </div>
                    {isGraded ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                        Đã chấm
                      </span>
                    ) : isSubmitted ? (
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-medium px-1.5 py-0.5 rounded">
                        Đã nộp
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Chưa nộp</span>
                    )}
                  </button>
                );
              })
            )}

            <div className="pt-2 pb-1 px-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Minh chứng & Phản hồi
            </div>

            <button
              onClick={() => setActiveTab('ai-log')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-colors ${
                activeTab === 'ai-log'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Nhật ký sử dụng AI</span>
            </button>

            <button
              onClick={() => setActiveTab('feedback')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                activeTab === 'feedback'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Phản hồi & Phúc khảo</span>
              </div>
              {evaluations.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
          </div>

          {/* Quick Help Card */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-900 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5 text-emerald-950">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Nguyên tắc AuthentiCode
            </h4>
            <p className="text-[11px] leading-relaxed text-emerald-800">
              Mã nguồn chạy đúng chưa đủ! Thầy cô sẽ đánh giá cả quá trình phân tích, tự kiểm thử và khả năng giải thích, bảo vệ sản phẩm của em.
            </p>
          </div>
        </aside>

        {/* Center Workspace Content */}
        <main className="flex-1 space-y-6">
          {/* TAB: BÀI TẬP CỦA TÔI (MY ASSIGNED TASKS) */}
          {activeTab === 'my-tasks' && (
            <div className="space-y-6">
              {/* Header card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                        <ClipboardList className="w-5 h-5" />
                      </span>
                      <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                        Bài Tập Của Tôi
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500">
                      Danh sách nhiệm vụ lập trình Python được giao cho lớp <span className="font-semibold text-slate-800">{classGroup?.name || 'Lớp của em'}</span> hoặc chỉ định riêng cho em.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Chỉ hiển thị bài đã giao & đã mở</span>
                  </div>
                </div>

                {/* Filter pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setMyTasksFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      myTasksFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({assignedItems.length})
                  </button>
                  <button
                    onClick={() => setMyTasksFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      myTasksFilter === 'pending'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Chưa nộp / Đang làm ({assignedItems.filter(i => !i.submission || i.submission.status === 'draft').length})
                  </button>
                  <button
                    onClick={() => setMyTasksFilter('submitted')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      myTasksFilter === 'submitted'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Đã nộp bài ({assignedItems.filter(i => i.submission && i.submission.status === 'submitted').length})
                  </button>
                  <button
                    onClick={() => setMyTasksFilter('graded')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      myTasksFilter === 'graded'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Đã có điểm ({assignedItems.filter(i => i.submission && i.submission.status === 'graded').length})
                  </button>
                </div>
              </div>

              {/* Tasks List / Grid */}
              {filteredAssignedItems.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs space-y-3">
                  <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-slate-800 text-base">Không có bài tập nào trong mục này</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {assignedItems.length === 0
                      ? 'Hiện tại chưa có bài tập nào được giao cho em hoặc lớp của em đến thời gian mở. Thầy cô sẽ thông báo khi có nhiệm vụ mới!'
                      : 'Không có bài tập nào phù hợp với bộ lọc đã chọn.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredAssignedItems.map(item => {
                    const { assignment, task, submission, isOverdue } = item;
                    const evalData = evaluations.find(e => e.submissionId === submission?.id);
                    const isDraft = submission?.status === 'draft';
                    const isSubmitted = submission?.status === 'submitted';
                    const isGraded = submission?.status === 'graded';

                    return (
                      <div
                        key={assignment.id}
                        className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md hover:border-emerald-300 transition-all"
                      >
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="text-[11px] font-bold bg-slate-900 text-white px-2.5 py-0.5 rounded-lg">
                              Nhiệm vụ {task.taskNumber}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                              task.aiLevel === 'T1' || task.aiMode === 'none'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : task.aiLevel === 'T2' || task.aiMode === 'guided_hints_only'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {task.aiLevel ? `Mức AI: ${task.aiLevel}` : task.aiModeLabel}
                            </span>
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-900 text-sm leading-snug">
                              {task.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {task.problemStatement}
                            </p>
                          </div>

                          {/* Assignment metadata */}
                          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-[11px] space-y-1.5 text-slate-600">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Thời gian mở:</span>
                              <span className="font-mono text-slate-800">
                                {new Date(assignment.startTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Hạn nộp:</span>
                              <span className={`font-mono font-medium ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-800'}`}>
                                {assignment.dueTime ? new Date(assignment.dueTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Không giới hạn'}
                              </span>
                            </div>
                            {assignment.teacherNotes && (
                              <div className="pt-1.5 border-t border-slate-200 text-slate-700 italic">
                                <span className="font-semibold text-slate-900 not-italic">Lời dặn: </span>
                                "{assignment.teacherNotes}"
                              </div>
                            )}
                          </div>

                          {/* Student status badge */}
                          <div>
                            {isGraded ? (
                              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                                <span className="text-emerald-800 font-medium">Đã chấm điểm</span>
                                <span className="font-bold text-emerald-700 font-mono text-sm">
                                  {evalData ? `${evalData.weightedScore10}/10` : 'Đã chấm'}
                                </span>
                              </div>
                            ) : isSubmitted ? (
                              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-xs flex items-center justify-between text-blue-800">
                                <span className="font-medium">Đã nộp bài</span>
                                <span className="text-[11px] text-blue-600 font-mono">
                                  {submission.versions.length} phiên bản
                                </span>
                              </div>
                            ) : isDraft ? (
                              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between text-amber-800">
                                <span className="font-medium">Đang làm dở (Bản nháp)</span>
                                <span className="text-[11px] text-amber-600 font-mono">
                                  {submission.versions.length} lần lưu
                                </span>
                              </div>
                            ) : (
                              <div className="p-2 rounded-xl bg-slate-100 text-slate-500 text-xs">
                                Chưa bắt đầu làm
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setTestBenchTask(task.taskNumber as 1 | 2 | 3);
                              setIsTestBenchOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1"
                          >
                            <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                            Kiểm thử
                          </button>

                          <button
                            onClick={() => {
                              setSelectedAssignmentId(assignment.id);
                              setActiveTaskId(task.id);
                              setActiveTab(`task-${task.taskNumber}` as any);
                            }}
                            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
                              isGraded
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : isSubmitted
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-slate-900 text-white hover:bg-emerald-600'
                            }`}
                          >
                            {isGraded ? 'Xem bài & Điểm' : isSubmitted ? 'Xem lại bài nộp' : isDraft ? 'Tiếp tục làm' : 'Bắt đầu làm bài'}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Welcome Card */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
                <div className="relative z-10 max-w-2xl space-y-2">
                  <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">
                    Hệ thống đánh giá xác thực năng lực lập trình
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                    Xin chào, {student.fullName}!
                  </h2>
                  <p className="text-xs md:text-sm text-emerald-100 leading-relaxed">
                    Chủ đề đánh giá: <strong>Theo dõi số trang đọc sách bằng Python</strong>. Hãy thực hiện tuần tự 3 nhiệm vụ để thể hiện năng lực độc lập, kỹ năng phát hiện sửa lỗi và khả năng làm chủ công nghệ GenAI.
                  </p>
                </div>
              </div>

              {/* 3 Tasks Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tasks.map(t => {
                  const sub = submissions.find(s => s.taskNumber === t.taskNumber);
                  const evalData = evaluations.find(e => e.submissionId === sub?.id);

                  return (
                    <div
                      key={t.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            t.aiMode === 'none'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : t.aiMode === 'guided_hints_only'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {t.aiModeLabel}
                          </span>
                          <span className="text-xs font-mono text-slate-400">Nhiệm vụ {t.taskNumber}</span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm leading-snug">
                          {t.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-3">
                          {t.objective}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          {evalData ? (
                            <span className="text-xs font-bold text-emerald-600">
                              Điểm: {evalData.weightedScore10}/10
                            </span>
                          ) : sub?.status === 'submitted' ? (
                            <span className="text-xs text-blue-600 font-medium">Chờ chấm</span>
                          ) : (
                            <span className="text-xs text-slate-500">Chưa hoàn thành</span>
                          )}
                        </div>

                        <button
                          onClick={() => setActiveTab(`task-${t.taskNumber}` as any)}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-emerald-600 transition-colors"
                        >
                          Làm bài
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rubric Criteria Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">
                    6 Tiêu Chí Đánh Giá Năng Lực (Rubric Chuẩn)
                  </h3>
                  <span className="text-xs text-slate-500">Quy đổi thang điểm 10</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="block text-xs font-bold text-emerald-700">R1 (15%)</span>
                    <span className="text-[11px] text-slate-700 mt-1 block">Phân tích bài toán</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="block text-xs font-bold text-emerald-700">R2 (20%)</span>
                    <span className="text-[11px] text-slate-700 mt-1 block">Thiết kế thuật toán</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="block text-xs font-bold text-emerald-700">R3 (25%)</span>
                    <span className="text-[11px] text-slate-700 mt-1 block">Lập trình & kiểm thử</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="block text-xs font-bold text-emerald-700">R4 (20%)</span>
                    <span className="text-[11px] text-slate-700 mt-1 block">Giải thích & bảo vệ</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="block text-xs font-bold text-emerald-700">R5 (10%)</span>
                    <span className="text-[11px] text-slate-700 mt-1 block">Phản tư quá trình</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="block text-xs font-bold text-emerald-700">R6 (10%)</span>
                    <span className="text-[11px] text-slate-700 mt-1 block">Sử dụng AI chuẩn mực</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2, 3, 4: TASK WORKSPACE */}
          {activeTask && activeTab.startsWith('task-') && (
            <div className="space-y-6">
              {/* Assignment Context Banner if assigned */}
              {activeAssignment && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-emerald-700" />
                        Đợt giao bài:
                      </span>
                      <span className="bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-lg font-medium text-[11px]">
                        {activeAssignment.targetType === 'single_class' ? `Lớp ${activeAssignment.targetClassNames?.[0] || '8A1'}` : 'Chỉ định học sinh'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span className="text-slate-600">
                        Mở: {new Date(activeAssignment.startTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </span>
                      <span className={`font-semibold ${activeAssignment.dueTime && new Date(activeAssignment.dueTime) < new Date() ? 'text-red-600 font-bold' : 'text-slate-800'}`}>
                        Hạn nộp: {activeAssignment.dueTime ? new Date(activeAssignment.dueTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Không giới hạn'}
                      </span>
                    </div>
                  </div>
                  {activeAssignment.teacherNotes && (
                    <p className="text-slate-700 italic border-t border-emerald-200/60 pt-2">
                      <strong className="text-emerald-900 not-italic">Lời dặn từ giáo viên: </strong>
                      "{activeAssignment.teacherNotes}"
                    </p>
                  )}
                </div>
              )}

              {/* Task Header & Briefing */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-slate-900 text-white px-2.5 py-0.5 rounded-lg">
                      Nhiệm vụ {activeTask.taskNumber}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${
                      activeTask.aiMode === 'none'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : activeTask.aiMode === 'guided_hints_only'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {activeTask.aiModeLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setTestBenchTask((activeTask.taskNumber as 1 | 2 | 3) || 1); setIsTestBenchOpen(true); }}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-emerald-700" />
                      Mở bàn kiểm thử
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {activeTask.title}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    <strong>Mục tiêu đánh giá:</strong> {activeTask.objective}
                  </p>
                </div>

                {/* Problem Statement Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-3 font-mono leading-relaxed">
                  <div className="whitespace-pre-wrap font-sans font-normal text-slate-800">
                    {activeTask.problemStatement}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 font-mono">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="block text-[10px] font-sans font-bold text-slate-500 mb-0.5">Input mẫu:</span>
                      <pre className="text-slate-900 whitespace-pre-wrap">{activeTask.sampleInput}</pre>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="block text-[10px] font-sans font-bold text-slate-500 mb-0.5">Output mẫu:</span>
                      <pre className="text-emerald-700 font-bold whitespace-pre-wrap">{activeTask.sampleOutput}</pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 1: PROBLEM ANALYSIS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">1</span>
                    Phân Tích Dữ Liệu Đầu Vào & Đầu Ra (Input / Output)
                  </h3>
                  <span className="text-[11px] text-slate-400">Tiêu chí R1 (15%)</span>
                </div>
                <p className="text-xs text-slate-500">
                  Xác định kiểu dữ liệu, các đại lượng cần nhập, kết quả cần xuất và các ràng buộc logic của bài toán:
                </p>
                <textarea
                  value={problemAnalysis}
                  onChange={e => setProblemAnalysis(e.target.value)}
                  rows={4}
                  className="w-full text-xs p-3.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                  placeholder="Ví dụ:&#10;- Dữ liệu vào (Input): n là số ngày (số nguyên dương), danh sách các số nguyên không âm biểu thị số trang đọc mỗi ngày...&#10;- Dữ liệu ra (Output): Tổng số trang đã đọc, số ngày đọc >= 15 trang...&#10;- Ràng buộc logic: Số trang không âm, mốc so sánh là >= 15 (bao gồm cả ngày đúng 15 trang)..."
                />
              </div>

              {/* CARD 2: ALGORITHM & PSEUDOCODE */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">2</span>
                    Thiết Kế Thuật Toán / Giả Mã (Pseudocode)
                  </h3>
                  <span className="text-[11px] text-slate-400">Tiêu chí R2 (20%)</span>
                </div>
                <p className="text-xs text-slate-500">
                  Mô tả các bước xử lý tuần tự, khởi tạo biến, vòng lặp duyệt và cấu trúc rẽ nhánh trước khi viết mã Python:
                </p>
                <textarea
                  value={algorithmPseudocode}
                  onChange={e => setAlgorithmPseudocode(e.target.value)}
                  rows={5}
                  className="w-full text-xs p-3.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed font-mono"
                  placeholder="Ví dụ:&#10;Bước 1: Nhập số ngày n&#10;Bước 2: Nhập danh sách số trang pages&#10;Bước 3: Khởi tạo biến total = 0, count_15 = 0&#10;Bước 4: Lặp qua từng phần tử p trong pages:&#10;    total = total + p&#10;    Nếu p >= 15 thì count_15 = count_15 + 1&#10;Bước 5: In kết quả total và count_15"
                />
              </div>

              {/* CARD 3: CODE WORKSPACE (DIFFERENT BY TASK/AI LEVEL) */}
              {(activeTask.aiLevel === 'T2' || Boolean(activeTask.starterCode)) ? (
                /* TASK T2 / CODE WORKSPACE: BUGGY VS FIXED + BUG EXPLANATION */
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">3</span>
                      Phát Hiện Lỗi, Mã Nguồn Đã Sửa & Giải Thích Nguyên Nhân
                    </h3>
                    <span className="text-[11px] text-slate-400">Tiêu chí R3, R5</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-red-700 block">
                        Mã ban đầu có 2 lỗi logic (tham khảo):
                      </label>
                      <pre className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-xs font-mono text-slate-800 overflow-x-auto leading-relaxed">
                        {activeTask.starterCode}
                      </pre>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-emerald-700 block">
                        Mã nguồn Python sau khi em đã tự sửa đúng:
                      </label>
                      <textarea
                        value={fixedPythonCode}
                        onChange={e => setFixedPythonCode(e.target.value)}
                        rows={11}
                        className="w-full text-xs p-3 bg-slate-900 text-slate-100 font-mono rounded-xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                        placeholder="# Nhập mã Python sau khi đã sửa 2 lỗi logic vào đây..."
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-800 block">
                      Giải thích chi tiết nguyên nhân gây lỗi của từng dòng lệnh và cách em đã sửa:
                    </label>
                    <textarea
                      value={bugExplanations}
                      onChange={e => setBugExplanations(e.target.value)}
                      rows={4}
                      className="w-full text-xs p-3.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                      placeholder="Giải thích rõ:&#10;1) Vì sao range(n - 1) lại bỏ sót phần tử cuối cùng?&#10;2) Vì sao điều kiện > 15 làm sai lệch khi gặp ngày đọc đúng 15 trang?"
                    />
                  </div>
                </div>
              ) : (
                /* TASK 1 & TASK 3 STANDARD PYTHON CODE WORKSPACE */
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">3</span>
                      Mã Nguồn Python Hoàn Chỉnh
                    </h3>
                    <span className="text-[11px] text-slate-400">Tiêu chí R3 (25%)</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Viết mã nguồn Python có chú thích rõ ràng, chạy đúng trên môi trường Thonny:
                  </p>
                  <textarea
                    value={pythonSourceCode}
                    onChange={e => setPythonSourceCode(e.target.value)}
                    rows={10}
                    className="w-full text-xs p-3.5 bg-slate-900 text-slate-100 font-mono rounded-xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                    placeholder="# Viết mã nguồn Python tại đây...&#10;n = int(input())&#10;pages = list(map(int, input().split()))&#10;..."
                  />

                  <div className="space-y-1 pt-2">
                    <label className="text-xs font-bold text-slate-800 block">
                      Giải thích cách chương trình hoạt động từng bước:
                    </label>
                    <textarea
                      value={explanation}
                      onChange={e => setExplanation(e.target.value)}
                      rows={3}
                      className="w-full text-xs p-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                      placeholder="Giải thích luồng dữ liệu, vai trò của từng biến và cách tính toán..."
                    />
                  </div>
                </div>
              )}

              {/* CARD 4: TEST CASES MANAGEMENT */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">4</span>
                      Hồ Sơ Kiểm Thử (Test Cases)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Bao gồm các ca kiểm thử bắt buộc và các test case do em tự xây dựng
                    </p>
                  </div>
                  <button
                    onClick={handleAddTestCase}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                  >
                    + Thêm test case tự lập
                  </button>
                </div>

                <div className="space-y-3">
                  {testCases.map((tc, idx) => (
                    <div
                      key={tc.id}
                      className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{tc.name}</span>
                          {tc.isMandatory && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                              Bắt buộc
                            </span>
                          )}
                          {tc.isMatch !== undefined && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              tc.isMatch ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {tc.isMatch ? 'Đúng chuẩn' : 'Chưa khớp'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRunTestCaseCheck(tc.id)}
                            className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                          >
                            Kiểm tra kết quả
                          </button>
                          {!tc.isMandatory && (
                            <button
                              onClick={() => handleDeleteTestCase(tc.id)}
                              className="text-[11px] text-red-600 hover:text-red-700 px-1.5 py-1"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                        <div>
                          <label className="block text-[10px] font-sans text-slate-500 mb-0.5">Input:</label>
                          <textarea
                            value={tc.input}
                            onChange={e => handleUpdateTestCase(tc.id, 'input', e.target.value)}
                            rows={2}
                            className="w-full p-2 bg-white rounded border border-slate-300 text-slate-900"
                            placeholder="7&#10;12 15 20 0 18 4 15"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-sans text-slate-500 mb-0.5">Expected Output:</label>
                          <textarea
                            value={tc.expectedOutput}
                            onChange={e => handleUpdateTestCase(tc.id, 'expectedOutput', e.target.value)}
                            rows={2}
                            className="w-full p-2 bg-white rounded border border-slate-300 text-slate-900"
                            placeholder="84&#10;4"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-sans text-slate-500 mb-0.5">Kết quả chạy từ Thonny:</label>
                          <textarea
                            value={tc.studentActualOutput || ''}
                            onChange={e => handleUpdateTestCase(tc.id, 'studentActualOutput', e.target.value)}
                            rows={2}
                            className="w-full p-2 bg-white rounded border border-slate-300 text-slate-900"
                            placeholder="Dán kết quả chạy thực tế..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD 5: AI INTERACTION & DISCLOSURE */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">5</span>
                    Tương Tác Trợ Lý AI & Khai Báo Sử Dụng Chuẩn Mực
                  </h3>
                  <span className="text-[11px] text-slate-400">Tiêu chí R6 (10%)</span>
                </div>

                {activeTask.aiLevel === 'T1' ? (
                  /* TASK LEVEL T1: STRICT AI BLOCK */
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-red-950">Chức năng AI bị khóa ở cấp độ T1</h4>
                      <p className="text-red-800 leading-relaxed">
                        Nhiệm vụ này ở Cấp độ T1 được thiết kế để xác thực năng lực lập trình hoàn toàn độc lập của học sinh THCS. Hệ thống không kích hoạt trợ lý Gemini. Học sinh cam kết không sử dụng công cụ AI bên ngoài để làm bài.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* TASK LEVEL T2 & T3: INTERACTIVE AI ASSISTANT */
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-emerald-600" />
                          Trợ lý Sư phạm Gemini ({activeTask.aiModeLabel || (activeTask.aiLevel === 'T2' ? 'Gợi mở Socratic' : 'Hợp tác mở')})
                        </span>
                        <span className="text-slate-500">Mọi tương tác đều được lưu vào biên bản đánh giá</span>
                      </div>

                      {/* Chat box */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 h-52 overflow-y-auto space-y-3">
                        {chatMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs p-4 space-y-1">
                            <MessageSquare className="w-6 h-6 text-slate-300" />
                            <p>
                              {activeTask.aiLevel === 'T2'
                                ? 'Đặt câu hỏi gợi ý khi gặp khó khăn. AI sẽ hỏi gợi mở theo phương pháp Socratic, không cho mã giải trực tiếp.'
                                : 'Nhập yêu cầu để AI đề xuất giải pháp. Sau đó em hãy kiểm chứng, phản biện và cải tiến mã nguồn.'}
                            </p>
                          </div>
                        ) : (
                          chatMessages.map((msg, i) => (
                            <div
                              key={i}
                              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                            >
                              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                                msg.sender === 'user'
                                  ? 'bg-emerald-600 text-white rounded-br-xs'
                                  : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                              }`}>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                              </div>
                              <span className="text-[10px] text-slate-400 mt-0.5 px-1">{msg.time}</span>
                            </div>
                          ))
                        )}
                        {isAiLoading && (
                          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Trợ lý đang suy nghĩ phản hồi gợi mở...</span>
                          </div>
                        )}
                      </div>

                      {/* Chat Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendMessageToAI()}
                          placeholder={
                            activeTask.aiLevel === 'T2'
                              ? 'Ví dụ: Tại sao khi n = 1 thì chương trình lại in ra 0 0?'
                              : 'Ví dụ: Hãy viết chương trình Python tính tổng số trang đọc trong n ngày...'
                          }
                          className="flex-1 text-xs px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          onClick={handleSendMessageToAI}
                          disabled={isAiLoading || !chatInput.trim()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Gửi
                        </button>
                      </div>
                    </div>

                    {/* Task T3 Mandatory Disclosure Fields */}
                    {activeTask.aiLevel === 'T3' && (
                      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-blue-950 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            Biểu Mẫu Công Khai & Minh Bạch Sử Dụng AI (Bắt buộc)
                          </h4>
                          <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useTeacherSample}
                              onChange={e => setUseTeacherSample(e.target.checked)}
                              className="rounded text-blue-600"
                            />
                            <span>Sử dụng mẫu AI do giáo viên cung cấp</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="font-semibold text-slate-800 block mb-1">Công cụ AI đã dùng:</label>
                            <input
                              type="text"
                              value={aiToolUsed}
                              onChange={e => setAiToolUsed(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-800 block mb-1">Những nội dung em đã tự kiểm chứng:</label>
                            <input
                              type="text"
                              value={whatVerified}
                              onChange={e => setWhatVerified(e.target.value)}
                              placeholder="Ví dụ: Kiểm tra trường hợp n=0, kiểm tra điều kiện tổng đúng bằng 75..."
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="font-semibold text-slate-800 block mb-1">Những điểm em đã chỉnh sửa, cải tiến mã AI:</label>
                            <textarea
                              value={whatImproved}
                              onChange={e => setWhatImproved(e.target.value)}
                              rows={2}
                              placeholder="Ví dụ: Định dạng 2 chữ số thập phân, bổ sung kiểm tra n <= 0, đổi toán tử logic..."
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-800 block mb-1">Phần việc do chính học sinh tự thực hiện:</label>
                            <textarea
                              value={studentContribution}
                              onChange={e => setStudentContribution(e.target.value)}
                              rows={2}
                              placeholder="Ví dụ: Tự thiết kế 5 test case, chỉnh sửa điều kiện DAT, viết chú thích mã nguồn..."
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CARD 6: SELF-EVALUATION & REFLECTION */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">6</span>
                    Bản Tự Đánh Giá & Phản Tư Quá Trình Làm Bài
                  </h3>
                  <span className="text-[11px] text-slate-400">Tiêu chí R5 (10%)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Tự đánh giá mức độ hiểu bản chất thuật toán (1 - 4):
                    </label>
                    <select
                      value={selfScore}
                      onChange={e => setSelfScore(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                    >
                      <option value={1}>Mức 1: Em còn mơ hồ, chưa hiểu rõ luồng chạy</option>
                      <option value={2}>Mức 2: Hiểu một phần nhưng chưa tự tin ở các trường hợp biên</option>
                      <option value={3}>Mức 3: Hiểu tốt thuật toán, có thể giải thích mã nguồn</option>
                      <option value={4}>Mức 4: Làm chủ hoàn toàn, tự tin bảo vệ trước giáo viên</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Mức độ tự tin khi trả lời vấn đáp của thầy cô:
                    </label>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSelfConfidence(lvl)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            selfConfidence === lvl
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {lvl === 'low' ? 'Chưa tự tin' : lvl === 'medium' ? 'Khá tự tin' : 'Rất tự tin'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    Ghi chú phản tư (những khó khăn em đã gặp và cách em vượt qua):
                  </label>
                  <textarea
                    value={selfNotes}
                    onChange={e => setSelfNotes(e.target.value)}
                    rows={2}
                    className="w-full text-xs p-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                    placeholder="Em đã gặp phải lỗi gì khi chạy thử? Bài học em rút ra từ nhiệm vụ này là gì?"
                  />
                </div>
              </div>

              {/* ACTION BAR: SAVE DRAFT & SUBMIT */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 sticky bottom-4 z-20">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Save className="w-4 h-4 text-slate-400" />
                  <span>Dữ liệu được lưu trữ an toàn trên máy chủ. Mỗi lần nộp bài tạo một phiên bản mới.</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSaveSubmission(false)}
                    disabled={isSaving}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Lưu bản nháp
                  </button>

                  <button
                    onClick={() => handleSaveSubmission(true)}
                    disabled={isSaving}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Nộp bài chính thức
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AI INTERACTION LOG FULL HISTORY */}
          {activeTab === 'ai-log' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Bot className="w-5 h-5 text-emerald-600" />
                    Nhật Ký Tương Tác AI Toàn Diện Của Học Sinh
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lưu giữ bằng chứng minh bạch về mọi lần hỏi đáp, mục đích sử dụng và các quyết định chỉnh sửa
                  </p>
                </div>
              </div>

              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                  <Bot className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Chưa có ghi nhận tương tác AI nào trong phiên làm việc này.</p>
                  <p className="text-[11px] text-slate-400">
                    Khi em hỏi đáp với trợ lý ở Nhiệm vụ 2 hoặc Nhiệm vụ 3, dữ liệu sẽ tự động lưu lại ở đây.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border text-xs ${
                        msg.sender === 'user'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-900">
                          {msg.sender === 'user' ? '👤 Câu hỏi / Prompt của em:' : '🤖 Phản hồi của Trợ lý AI:'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">{msg.time}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-slate-800 leading-relaxed font-mono">
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: TEACHER FEEDBACK & APPEAL */}
          {activeTab === 'feedback' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-600" />
                      Kết Quả Đánh Giá & Phản Hồi Từ Giáo Viên
                    </h3>
                    <p className="text-xs text-slate-500">
                      Điểm Rubric 6 tiêu chí, nhận xét chi tiết và biên bản vấn đáp kiểm chứng hiểu biết
                    </p>
                  </div>

                  <button
                    onClick={() => setIsAppealModalOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Đề nghị xem lại kết quả
                  </button>
                </div>

                {evaluations.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-slate-300" />
                    <p>Chưa có bài nộp nào được giáo viên hoàn tất chấm điểm.</p>
                    <p className="text-[11px] text-slate-400">
                      Sau khi giáo viên chấm theo Rubric và tiến hành vấn đáp, kết quả sẽ xuất hiện ở đây.
                    </p>
                  </div>
                ) : (
                  evaluations.map(ev => (
                    <div key={ev.id} className="border border-slate-200 rounded-2xl p-5 space-y-5 bg-slate-50/30">
                      {/* Score Summary Box */}
                      <div className="flex flex-wrap items-center justify-between gap-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <div>
                          <span className="text-xs text-emerald-800 font-medium">Người chấm:</span>
                          <h4 className="font-bold text-emerald-950 text-base">{ev.graderName}</h4>
                          <span className="text-[11px] text-emerald-700">
                            Ngày chấm: {new Date(ev.gradedAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-emerald-800 font-medium block">Điểm tổng kết Rubric (thang 10):</span>
                          <span className="text-3xl font-extrabold text-emerald-700 font-mono">
                            {ev.weightedScore10}
                          </span>
                          <span className="text-sm font-bold text-emerald-600"> / 10</span>
                        </div>
                      </div>

                      {/* Criteria breakdown */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                          Chi tiết đánh giá theo 6 tiêu chí:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {ev.criterionGrades.map((cg: any) => (
                            <div key={cg.criterionId} className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{cg.criterionId}: {cg.criterionId === 'R1' ? 'Phân tích' : cg.criterionId === 'R2' ? 'Thuật toán' : cg.criterionId === 'R3' ? 'Lập trình & kiểm thử' : cg.criterionId === 'R4' ? 'Giải thích & bảo vệ' : cg.criterionId === 'R5' ? 'Phản tư' : 'Dùng AI'}</span>
                                <span className="font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  Mức {cg.selectedLevel}/4
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600">
                                <strong>Minh chứng:</strong> {cg.evidence || 'Có minh chứng đầy đủ.'}
                              </p>
                              {cg.comment && (
                                <p className="text-[11px] text-slate-700 italic">
                                  <strong>Nhận xét:</strong> {cg.comment}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Oral Defense Protocol if conducted */}
                      {ev.oralDefense && (
                        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3 text-xs">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-purple-950 flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-purple-700" />
                              Biên Bản Vấn Đáp Kiểm Chứng Quyền Sở Hữu Hiểu Biết
                            </h4>
                            <span className="font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                              {ev.oralDefense.ownershipConfirmed ? 'Xác thực quyền tác giả' : 'Cần bổ sung'}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {ev.oralDefense.questions.map((q: any, i: number) => (
                              <div key={i} className="bg-white p-3 rounded-lg border border-purple-100 space-y-1">
                                <span className="font-semibold text-slate-900 block">
                                  Câu {i + 1}: {q.questionText}
                                </span>
                                <p className="text-[11px] text-slate-700">
                                  <strong>Học sinh trả lời:</strong> {q.studentAnswerSummary}
                                </p>
                                <span className="text-[10px] font-medium text-purple-700">
                                  Mức hiểu biết: Mức {q.understandingScore}/4 · {q.teacherNote}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="text-[11px] font-medium text-purple-900">
                            <strong>Kết luận chung của giáo viên:</strong> {ev.oralDefense.overallOralConclusion}
                          </div>
                        </div>
                      )}

                      {/* General Feedback */}
                      {ev.generalFeedback && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-1">
                          <span className="font-bold text-slate-900">Nhận xét chung của giáo viên:</span>
                          <p className="text-slate-700 leading-relaxed">{ev.generalFeedback}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Appeals List if any */}
              {appeals.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Lịch sử các yêu cầu xem lại kết quả (Phúc khảo):
                  </h4>
                  <div className="space-y-2">
                    {appeals.map(a => (
                      <div key={a.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">Yêu cầu: {a.taskTitle}</span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            a.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : a.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {a.status === 'accepted' ? 'Đã duyệt điều chỉnh' : a.status === 'rejected' ? 'Giữ nguyên' : 'Đang chờ xử lý'}
                          </span>
                        </div>
                        <p className="text-slate-700"><strong>Lý do của em:</strong> {a.studentReason}</p>
                        {a.teacherResponse && (
                          <p className="text-emerald-800 font-medium"><strong>Phản hồi của thầy cô:</strong> {a.teacherResponse}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Appeal Request Modal */}
      {isAppealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Gửi Đề Nghị Xem Lại Kết Quả Đánh Giá
            </h3>
            <p className="text-xs text-slate-500">
              Nếu em thấy điểm số hoặc nhận xét chưa phản ánh đúng minh chứng em đã nộp, hãy trình bày rõ ràng lý do:
            </p>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-800 block">Lý do đề nghị xem lại:</label>
              <textarea
                value={appealReason}
                onChange={e => setAppealReason(e.target.value)}
                rows={3}
                placeholder="Ví dụ: Ở tiêu chí R3, em đã viết đủ 4 test case bao gồm cả test case biên n=1, trang=15..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-800 block">Minh chứng bổ sung (nếu có):</label>
              <textarea
                value={appealEvidence}
                onChange={e => setAppealEvidence(e.target.value)}
                rows={2}
                placeholder="Chỉ rõ dòng lệnh, test case hoặc nhật ký AI..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAppealModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSubmitAppeal}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Gửi đề nghị
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Assignment Code Unlock Modal */}
      {individualCodeModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-sm">
                  Bài Tập Được Giao Riêng Cho Cá Nhân
                </h3>
                <p className="text-xs text-slate-500">
                  Nhiệm vụ này được giáo viên giao riêng cho bạn kèm mã bài tập cá nhân. Vui lòng nhập mã để truy cập.
                </p>
              </div>
            </div>

            {individualCodeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{individualCodeError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Mã bài tập cá nhân:
              </label>
              <input
                type="text"
                value={individualCodeInput}
                onChange={e => setIndividualCodeInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleVerifyIndividualCode()}
                placeholder="Ví dụ: INDIV-7821"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIndividualCodeModalAssignment(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Đóng
              </button>
              <button
                onClick={handleVerifyIndividualCode}
                disabled={isVerifyingCode || !individualCodeInput.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isVerifyingCode ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                Xác thực & Mở bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Python Test Bench Modal */}
      <TestBenchModal
        isOpen={isTestBenchOpen}
        onClose={() => setIsTestBenchOpen(false)}
        defaultTaskNumber={testBenchTask}
      />
    </div>
  );
};
