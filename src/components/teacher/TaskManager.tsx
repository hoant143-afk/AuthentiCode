import React, { useState, useEffect } from 'react';
import {
  BookOpen, Send, CheckCircle2, Clock, Users, Plus,
  Edit3, Trash2, Calendar, FileText, ChevronRight, X
} from 'lucide-react';
import { AssessmentTask, TaskAssignment, ClassGroup, Student, Submission } from '../../types';
import { api } from '../../services/api';

interface Props {
  currentTeacher: {
    id: string;
    name: string;
    role: string;
  };
  classes: ClassGroup[];
  onOpenGrading: (sub: Submission) => void;
  onRefreshData: () => void;
}

export const TaskManager: React.FC<Props> = ({
  currentTeacher,
  classes,
  onOpenGrading,
  onRefreshData
}) => {
  const [subTab, setSubTab] = useState<'bank' | 'assign' | 'tracker'>('bank');

  const [tasks, setTasks] = useState<AssessmentTask[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Bank filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [aiLevelFilter, setAiLevelFilter] = useState<string>('all');

  // Task creation/edit modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubtitle, setTaskSubtitle] = useState('');
  const [taskObjective, setTaskObjective] = useState('');
  const [taskAiLevel, setTaskAiLevel] = useState<'T1' | 'T2' | 'T3'>('T1');
  const [taskProblem, setTaskProblem] = useState('');
  const [taskInputDesc, setTaskInputDesc] = useState('');
  const [taskOutputDesc, setTaskOutputDesc] = useState('');
  const [taskSampleInput, setTaskSampleInput] = useState('');
  const [taskSampleOutput, setTaskSampleOutput] = useState('');
  const [taskStarterCode, setTaskStarterCode] = useState('');
  const [taskTestCases, setTaskTestCases] = useState<{ input: string; expectedOutput: string; description: string; isMandatory?: boolean }[]>([
    { input: '', expectedOutput: '', description: 'Test case 1', isMandatory: true }
  ]);
  const [taskPromptRules, setTaskPromptRules] = useState('');

  // Assign Form state
  const [assignTaskId, setAssignTaskId] = useState<string>('');
  const [assignTargetType, setAssignTargetType] = useState<'single_class' | 'multiple_classes' | 'individual_students'>('single_class');
  const [assignClassId, setAssignClassId] = useState<string>('');
  const [assignMultipleClassIds, setAssignMultipleClassIds] = useState<string[]>([]);
  const [assignStudentClassId, setAssignStudentClassId] = useState<string>('');
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [assignSelectedStudentIds, setAssignSelectedStudentIds] = useState<string[]>([]);
  const [assignStartTime, setAssignStartTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [assignDueTime, setAssignDueTime] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [assignTeacherNotes, setAssignTeacherNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Tracker state
  const [trackerAssignmentId, setTrackerAssignmentId] = useState<string>('');
  const [trackerData, setTrackerData] = useState<any>(null);
  const [trackerFilterStatus, setTrackerFilterStatus] = useState<string>('all');
  const [isTrackerLoading, setIsTrackerLoading] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadTasksAndAssignments = async () => {
    setIsLoading(true);
    try {
      const [fetchedTasks, fetchedAssignments] = await Promise.all([
        api.getTasks(),
        api.getAssignments()
      ]);
      setTasks(fetchedTasks);
      setAssignments(fetchedAssignments);

      // Default assign task
      if (fetchedTasks.length > 0 && !assignTaskId) {
        setAssignTaskId(fetchedTasks[0].id);
      }
      // Default tracker assignment
      if (fetchedAssignments.length > 0 && !trackerAssignmentId) {
        setTrackerAssignmentId(fetchedAssignments[0].id);
      }
      if (classes.length > 0) {
        if (!assignClassId) setAssignClassId(classes[0].id);
        if (!assignStudentClassId) setAssignStudentClassId(classes[0].id);
      }
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu nhiệm vụ:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasksAndAssignments();
  }, []);

  // When student class selection changes in individual assign mode
  useEffect(() => {
    if (assignStudentClassId) {
      api.getClassStudents(assignStudentClassId).then(stds => {
        setClassStudents(stds);
      }).catch(console.error);
    }
  }, [assignStudentClassId]);

  // Load tracker data when tracker assignment changes
  useEffect(() => {
    if (trackerAssignmentId && subTab === 'tracker') {
      setIsTrackerLoading(true);
      api.getAssignmentTracker(trackerAssignmentId)
        .then(data => setTrackerData(data))
        .catch(err => console.error('Lỗi nạp theo dõi bài nộp:', err))
        .finally(() => setIsTrackerLoading(false));
    }
  }, [trackerAssignmentId, subTab]);

  // Open modal to create task
  const handleOpenCreateModal = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskSubtitle('');
    setTaskObjective('');
    setTaskAiLevel('T1');
    setTaskProblem('');
    setTaskInputDesc('Dòng 1: n (số nguyên dương); Dòng 2: n số nguyên biểu thị số trang đọc mỗi ngày.');
    setTaskOutputDesc('Dòng 1: Kết quả tính toán theo yêu cầu của bài.');
    setTaskSampleInput('7\n12 15 20 0 18 4 15');
    setTaskSampleOutput('84\n4');
    setTaskStarterCode('');
    setTaskTestCases([
      { input: '7\n12 15 20 0 18 4 15', expectedOutput: '84\n4', description: 'Test case mẫu thông thường', isMandatory: true },
      { input: '7\n15 15 15 15 15 15 15', expectedOutput: '105\n7', description: 'Test case biên 15', isMandatory: true }
    ]);
    setTaskPromptRules('Trong nhiệm vụ này, trợ lý AI bị vô hiệu hóa hoàn toàn.');
    setIsTaskModalOpen(true);
  };

  // Open modal to edit existing task
  const handleOpenEditModal = (task: AssessmentTask) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskSubtitle(task.subtitle);
    setTaskObjective(task.objective);
    setTaskAiLevel(task.aiLevel || 'T1');
    setTaskProblem(task.problemStatement);
    setTaskInputDesc(task.inputDescription || '');
    setTaskOutputDesc(task.outputDescription || '');
    setTaskSampleInput(task.sampleInput || '');
    setTaskSampleOutput(task.sampleOutput || '');
    setTaskStarterCode(task.starterCode || '');
    setTaskTestCases(task.mandatoryTestCases || []);
    setTaskPromptRules(task.allowedAIPromptingRules || '');
    setIsTaskModalOpen(true);
  };

  // Save Task (Draft or Published)
  const handleSaveTask = async (targetStatus: 'draft' | 'published') => {
    if (!taskTitle.trim() || !taskProblem.trim()) {
      showNotification('error', 'Vui lòng nhập tên bài tập và nội dung đề bài.');
      return;
    }

    try {
      const payload = {
        title: taskTitle.trim(),
        subtitle: taskSubtitle.trim(),
        objective: taskObjective.trim(),
        aiLevel: taskAiLevel,
        problemStatement: taskProblem.trim(),
        inputDescription: taskInputDesc.trim(),
        outputDescription: taskOutputDesc.trim(),
        sampleInput: taskSampleInput.trim(),
        sampleOutput: taskSampleOutput.trim(),
        starterCode: taskStarterCode.trim(),
        mandatoryTestCases: taskTestCases,
        allowedAIPromptingRules: taskPromptRules.trim(),
        status: targetStatus,
        authorTeacherId: currentTeacher.id,
        authorTeacherName: currentTeacher.name
      };

      if (editingTaskId) {
        await api.updateTask(editingTaskId, payload);
        showNotification('success', targetStatus === 'published' ? 'Đã xuất bản bài tập thành công!' : 'Đã cập nhật bài tập lưu nháp!');
      } else {
        await api.createTask(payload);
        showNotification('success', targetStatus === 'published' ? 'Đã tạo và xuất bản bài tập vào ngân hàng!' : 'Đã lưu bản nháp bài tập mới!');
      }

      setIsTaskModalOpen(false);
      loadTasksAndAssignments();
      onRefreshData();
    } catch (err: any) {
      showNotification('error', err.message || 'Lỗi khi lưu bài tập.');
    }
  };

  // Publish a draft task
  const handlePublishTask = async (taskId: string) => {
    try {
      await api.publishTask(taskId);
      showNotification('success', 'Đã xuất bản bài tập vào ngân hàng đề!');
      loadTasksAndAssignments();
    } catch (err: any) {
      showNotification('error', 'Lỗi xuất bản bài tập.');
    }
  };

  // Delete a task
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Thầy/Cô có chắc chắn muốn xóa bài tập này khỏi ngân hàng không?')) return;
    try {
      await api.deleteTask(taskId);
      showNotification('success', 'Đã xóa bài tập thành công.');
      loadTasksAndAssignments();
    } catch (err: any) {
      showNotification('error', err.message || 'Không thể xóa bài tập này.');
    }
  };

  // Trigger Assign Tab with a preselected task
  const handleGoToAssign = (task: AssessmentTask) => {
    setAssignTaskId(task.id);
    setSubTab('assign');
  };

  // Handle Assign Form Submit
  const handleAssignTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTaskId) {
      showNotification('error', 'Vui lòng chọn bài tập cần giao.');
      return;
    }

    let targetClassIds: string[] = [];
    let targetStudentIds: string[] = [];

    if (assignTargetType === 'single_class') {
      if (!assignClassId) {
        showNotification('error', 'Vui lòng chọn lớp học để giao bài.');
        return;
      }
      targetClassIds = [assignClassId];
    } else if (assignTargetType === 'multiple_classes') {
      if (assignMultipleClassIds.length === 0) {
        showNotification('error', 'Vui lòng chọn ít nhất 1 lớp học.');
        return;
      }
      targetClassIds = assignMultipleClassIds;
    } else if (assignTargetType === 'individual_students') {
      if (assignSelectedStudentIds.length === 0) {
        showNotification('error', 'Vui lòng chọn ít nhất 1 học sinh để giao bài cá nhân.');
        return;
      }
      targetStudentIds = assignSelectedStudentIds;
      targetClassIds = [assignStudentClassId];
    }

    setIsAssigning(true);
    try {
      const payload: any = {
        taskId: assignTaskId,
        targetType: assignTargetType,
        targetClassIds,
        targetStudentIds: targetStudentIds.length > 0 ? targetStudentIds : undefined,
        startTime: new Date(assignStartTime).toISOString(),
        dueTime: new Date(assignDueTime).toISOString(),
        teacherNotes: assignTeacherNotes.trim(),
        teacherId: currentTeacher.id,
        teacherName: currentTeacher.name
      };

      // Generate individual assignment codes if individual
      if (assignTargetType === 'individual_students') {
        payload.individualAssignmentCode = `INDIV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      }

      const newAssign = await api.createAssignment(payload);
      const codeMsg = newAssign.individualAssignmentCode ? ` | Mã bài cá nhân: ${newAssign.individualAssignmentCode}` : '';
      showNotification('success', `Đã giao bài tập thành công cho học sinh! (Hạn nộp: ${new Date(newAssign.dueTime).toLocaleDateString('vi-VN')})${codeMsg}`);
      
      // Refresh assignments and switch to tracker tab
      await loadTasksAndAssignments();
      setTrackerAssignmentId(newAssign.id);
      setSubTab('tracker');
      onRefreshData();
    } catch (err: any) {
      showNotification('error', err.message || 'Lỗi khi giao bài tập.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Filter tasks in Bank
  const filteredTasks = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (aiLevelFilter !== 'all' && t.aiLevel !== aiLevelFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2 animate-bounce ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Top Header & Three Sub-tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              Quản Lý Nhiệm Vụ & Giao Bài Tập Python
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tạo bài tập, lưu nháp, xuất bản vào ngân hàng đề, giao bài theo lớp/cá nhân và theo dõi tiến độ nộp bài
            </p>
          </div>

          {/* Three Tab Buttons */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl text-xs font-semibold gap-1">
            <button
              onClick={() => setSubTab('bank')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                subTab === 'bank' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Ngân hàng bài tập</span>
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded-full font-mono">{tasks.length}</span>
            </button>

            <button
              onClick={() => setSubTab('assign')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                subTab === 'assign' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Giao bài</span>
            </button>

            <button
              onClick={() => setSubTab('tracker')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                subTab === 'tracker' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>3. Theo dõi bài nộp</span>
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded-full font-mono">{assignments.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: NGÂN HÀNG BÀI TẬP */}
      {subTab === 'bank' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="font-semibold text-slate-700">Bộ lọc:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="draft">Bài đã tạo (Lưu nháp)</option>
                <option value="published">Bài đã xuất bản</option>
                <option value="assigned">Bài đã giao</option>
              </select>

              <select
                value={aiLevelFilter}
                onChange={e => setAiLevelFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="all">Tất cả mức AI</option>
                <option value="T1">T1: Không dùng AI</option>
                <option value="T2">T2: AI gợi mở Socratic</option>
                <option value="T3">T3: Bắt buộc dùng AI & minh bạch</option>
              </select>
            </div>

            {/* Create task button */}
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Tạo bài tập Python mới
            </button>
          </div>

          {/* Task Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map(t => {
              const isDraft = t.status === 'draft';
              const isPublished = t.status === 'published';
              const isAssigned = t.status === 'assigned';

              return (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        t.aiLevel === 'T1'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : t.aiLevel === 'T2'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        Mức AI: {t.aiLevel || 'T1'}
                      </span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isDraft
                          ? 'bg-slate-200 text-slate-700'
                          : isPublished
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isDraft ? 'Bài đã tạo (Nháp)' : isPublished ? 'Đã xuất bản' : 'Đã giao bài'}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                        {t.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {t.objective || t.subtitle}
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
                      <div><span className="text-slate-400 font-sans">Input mẫu:</span> {t.sampleInput.replace(/\n/g, ' ')}</div>
                      <div><span className="text-slate-400 font-sans">Output mẫu:</span> {t.sampleOutput.replace(/\n/g, ' ')}</div>
                      <div><span className="text-slate-400 font-sans">Test cases:</span> {t.mandatoryTestCases?.length || 0} ca</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(t)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Chỉnh sửa bài tập"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {isDraft && (
                        <button
                          onClick={() => handlePublishTask(t.id)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                        >
                          Xuất bản
                        </button>
                      )}

                      {!isAssigned && (
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa bài tập"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleGoToAssign(t)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-emerald-600 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      Giao bài
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: GIAO BÀI (ASSIGN TASKS) */}
      {subTab === 'assign' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Thiết Lập Đợt Giao Bài Tập Mới
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chỉ bài đã giao và đến thời gian mở mới xuất hiện ở cổng của học sinh
            </p>
          </div>

          <form onSubmit={handleAssignTaskSubmit} className="space-y-6 max-w-3xl">
            {/* 1. Select Task */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                1. Chọn bài tập trong ngân hàng để giao:
              </label>
              <select
                value={assignTaskId}
                onChange={e => setAssignTaskId(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900"
              >
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.aiLevel || 'T1'}] {t.title} ({t.status === 'draft' ? 'Bản nháp' : t.status === 'published' ? 'Đã xuất bản' : 'Đã giao'})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Target Audience */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-800 block">
                2. Đối tượng giao bài:
              </label>

              <div className="flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="targetType"
                    checked={assignTargetType === 'single_class'}
                    onChange={() => setAssignTargetType('single_class')}
                    className="text-blue-600"
                  />
                  <span>Giao cho một lớp</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="targetType"
                    checked={assignTargetType === 'multiple_classes'}
                    onChange={() => setAssignTargetType('multiple_classes')}
                    className="text-blue-600"
                  />
                  <span>Giao cho nhiều lớp</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="targetType"
                    checked={assignTargetType === 'individual_students'}
                    onChange={() => setAssignTargetType('individual_students')}
                    className="text-blue-600"
                  />
                  <span>Giao cho từng học sinh cụ thể</span>
                </label>
              </div>

              {/* Target: Single Class */}
              {assignTargetType === 'single_class' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Chọn lớp học:</label>
                  <select
                    value={assignClassId}
                    onChange={e => setAssignClassId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.studentCount} học sinh · Khối {c.grade})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target: Multiple Classes */}
              {assignTargetType === 'multiple_classes' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Chọn các lớp áp dụng:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {classes.map(c => (
                      <label key={c.id} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignMultipleClassIds.includes(c.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setAssignMultipleClassIds([...assignMultipleClassIds, c.id]);
                            } else {
                              setAssignMultipleClassIds(assignMultipleClassIds.filter(id => id !== c.id));
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="font-medium text-slate-900">{c.name} ({c.studentCount} HS)</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Target: Individual Students */}
              {assignTargetType === 'individual_students' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Chọn lớp để chọn học sinh:</label>
                    <select
                      value={assignStudentClassId}
                      onChange={e => setAssignStudentClassId(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">Chọn học sinh nhận bài:</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 text-xs">
                      {classStudents.map(s => (
                        <label key={s.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assignSelectedStudentIds.includes(s.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setAssignSelectedStudentIds([...assignSelectedStudentIds, s.id]);
                              } else {
                                setAssignSelectedStudentIds(assignSelectedStudentIds.filter(id => id !== s.id));
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="text-slate-800 font-medium">{s.fullName} ({s.studentCode})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Time Windows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Thời gian bắt đầu mở bài (Start Time):
                </label>
                <input
                  type="datetime-local"
                  value={assignStartTime}
                  onChange={e => setAssignStartTime(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                />
                <span className="text-[10px] text-slate-400">Trước thời gian này học sinh sẽ không thấy bài tập.</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-red-600" />
                  Hạn nộp bài (Due Time / Deadline):
                </label>
                <input
                  type="datetime-local"
                  value={assignDueTime}
                  onChange={e => setAssignDueTime(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                />
                <span className="text-[10px] text-slate-400">Bài nộp sau thời gian này sẽ được ghi nhận là nộp muộn.</span>
              </div>
            </div>

            {/* 4. Teacher's instructions */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 block">
                Lời dặn dò / Hướng dẫn của giáo viên:
              </label>
              <textarea
                value={assignTeacherNotes}
                onChange={e => setAssignTeacherNotes(e.target.value)}
                rows={2}
                placeholder="Ví dụ: Các em lưu ý chạy thử test case với Thonny trước khi nộp; cẩn trọng với các trường hợp số 0..."
                className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isAssigning}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              <Send className="w-4 h-4" />
              {isAssigning ? 'Đang giao bài...' : 'Xác nhận giao bài cho học sinh'}
            </button>
          </form>

          {/* List of existing assignments */}
          <div className="pt-6 border-t border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">
              Lịch Sử Các Đợt Đã Giao Bài ({assignments.length} đợt):
            </h4>
            <div className="space-y-2">
              {assignments.map(a => (
                <div key={a.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{a.taskTitle}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                        {a.aiLevel || 'T1'}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Giao cho: <strong className="text-slate-800">{a.targetClassNames.join(', ')}</strong> · Hạn nộp: {new Date(a.dueTime).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setTrackerAssignmentId(a.id);
                      setSubTab('tracker');
                    }}
                    className="px-3 py-1 bg-white hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Theo dõi bài nộp</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: THEO DÕI BÀI NỘP (SUBMISSION TRACKER) */}
      {subTab === 'tracker' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Theo Dõi Tiến Độ Nộp Bài Chi Tiết
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kiểm soát ai đã nộp, ai đang làm nháp, ai nộp muộn và chấm bài trực tiếp
              </p>
            </div>

            {/* Select Assignment to track */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">Chọn đợt giao bài:</span>
              <select
                value={trackerAssignmentId}
                onChange={e => setTrackerAssignmentId(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 max-w-xs truncate"
              >
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>
                    [{a.aiLevel}] {a.taskTitle} ({a.targetClassNames.join(', ')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isTrackerLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Đang tải tiến độ bài nộp...</div>
          ) : trackerData ? (
            <div className="space-y-6">
              {/* Tracker KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                  <span className="text-[11px] text-slate-500 font-medium">Tổng học sinh</span>
                  <div className="text-xl font-bold font-mono text-slate-900">{trackerData.stats.totalStudents}</div>
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-0.5">
                  <span className="text-[11px] text-emerald-800 font-medium">Đã nộp bài</span>
                  <div className="text-xl font-bold font-mono text-emerald-700">{trackerData.stats.submittedCount}</div>
                </div>

                <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 space-y-0.5">
                  <span className="text-[11px] text-blue-800 font-medium">Tỷ lệ nộp</span>
                  <div className="text-xl font-bold font-mono text-blue-700">{trackerData.stats.submissionRate}%</div>
                </div>

                <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 space-y-0.5">
                  <span className="text-[11px] text-purple-800 font-medium">Đã chấm điểm</span>
                  <div className="text-xl font-bold font-mono text-purple-700">{trackerData.stats.gradedCount}</div>
                </div>

                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-0.5">
                  <span className="text-[11px] text-amber-800 font-medium">Chưa làm bài</span>
                  <div className="text-xl font-bold font-mono text-amber-700">{trackerData.stats.notStartedCount}</div>
                </div>
              </div>

              {/* Roster Filter */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Danh sách học sinh trong đợt giao:</span>
                <div className="flex items-center gap-2">
                  <select
                    value={trackerFilterStatus}
                    onChange={e => setTrackerFilterStatus(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="submitted">Đã nộp bài</option>
                    <option value="graded">Đã chấm</option>
                    <option value="draft">Bản nháp</option>
                    <option value="not_started">Chưa làm bài</option>
                    <option value="overdue">Quá hạn nộp</option>
                  </select>
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Học sinh</th>
                      <th className="py-2.5 px-3">Lớp</th>
                      <th className="py-2.5 px-3">Trạng thái bài làm</th>
                      <th className="py-2.5 px-3">Phiên bản</th>
                      <th className="py-2.5 px-3">Thời gian gửi</th>
                      <th className="py-2.5 px-3">Điểm Rubric</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trackerData.roster
                      .filter((r: any) => trackerFilterStatus === 'all' || r.status === trackerFilterStatus)
                      .map((item: any) => (
                        <tr key={item.studentId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block">{item.fullName}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{item.studentCode}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">{item.className}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              item.status === 'graded'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'submitted'
                                ? item.isLate ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                : item.status === 'draft'
                                ? 'bg-slate-200 text-slate-700'
                                : item.status === 'overdue'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {item.status === 'graded' ? 'Đã chấm' :
                               item.status === 'submitted' ? (item.isLate ? 'Nộp muộn' : 'Đã nộp') :
                               item.status === 'draft' ? 'Lưu nháp' :
                               item.status === 'overdue' ? 'Quá hạn' : 'Chưa làm'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">
                            {item.currentVersion > 0 ? `v${item.currentVersion}` : '—'}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                            {item.submittedAt ? new Date(item.submittedAt).toLocaleString('vi-VN') : '—'}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {item.score !== null ? `${item.score}/10` : '—'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {item.submission ? (
                              <button
                                onClick={() => onOpenGrading(item.submission)}
                                className="px-3 py-1 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors"
                              >
                                {item.status === 'graded' ? 'Xem / Sửa điểm' : 'Chấm bài'}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Chưa nộp</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Chưa có đợt giao bài nào. Hãy qua tab "Giao bài" để phân công bài tập cho học sinh.
            </div>
          )}
        </div>
      )}

      {/* Task Creation & Edit Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingTaskId ? 'Chỉnh Sửa Bài Tập Python' : 'Tạo Bài Tập Python Mới Vào Ngân Hàng'}
              </h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Title & AI Level */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-800 block">Tên bài tập:</label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    placeholder="Ví dụ: Theo dõi số trang đọc sách bằng Python"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 block">Mức sử dụng AI:</label>
                  <select
                    value={taskAiLevel}
                    onChange={e => setTaskAiLevel(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="T1">T1: Không dùng AI</option>
                    <option value="T2">T2: AI gợi mở Socratic</option>
                    <option value="T3">T3: Bắt buộc dùng AI & công khai</option>
                  </select>
                </div>
              </div>

              {/* Objective */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Mục tiêu đánh giá năng lực:</label>
                <input
                  type="text"
                  value={taskObjective}
                  onChange={e => setTaskObjective(e.target.value)}
                  placeholder="Ví dụ: Đánh giá năng lực phát hiện, giải thích và tự sửa lỗi logic trong mã nguồn..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Problem statement */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Nội dung đề bài chi tiết:</label>
                <textarea
                  value={taskProblem}
                  onChange={e => setTaskProblem(e.target.value)}
                  rows={4}
                  placeholder="Mô tả bài toán, các bước thực hiện..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              {/* Input & Output specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 block">Mô tả dữ liệu đầu vào (Input):</label>
                  <textarea
                    value={taskInputDesc}
                    onChange={e => setTaskInputDesc(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 block">Mô tả dữ liệu đầu ra (Output):</label>
                  <textarea
                    value={taskOutputDesc}
                    onChange={e => setTaskOutputDesc(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Sample Input & Output */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                <div className="space-y-1">
                  <label className="font-sans font-bold text-slate-800 block">Input mẫu:</label>
                  <textarea
                    value={taskSampleInput}
                    onChange={e => setTaskSampleInput(e.target.value)}
                    rows={2}
                    placeholder="7&#10;12 15 20 0 18 4 15"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-sans font-bold text-slate-800 block">Output mẫu:</label>
                  <textarea
                    value={taskSampleOutput}
                    onChange={e => setTaskSampleOutput(e.target.value)}
                    rows={2}
                    placeholder="84&#10;4"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Starter Code if T2 or template */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Mã nguồn khởi tạo / Mã lỗi cho trước (Starter Code):</label>
                <textarea
                  value={taskStarterCode}
                  onChange={e => setTaskStarterCode(e.target.value)}
                  rows={3}
                  placeholder="# Nhập mã Python cho trước nếu có (ví dụ mã chứa 2 lỗi logic cho nhiệm vụ 2)..."
                  className="w-full p-2.5 bg-slate-900 text-slate-100 font-mono rounded-xl"
                />
              </div>

              {/* Test Cases */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">Danh sách Test Case kiểm thử:</label>
                  <button
                    type="button"
                    onClick={() => setTaskTestCases([...taskTestCases, { input: '', expectedOutput: '', description: `Test case ${taskTestCases.length + 1}` }])}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    + Thêm test case
                  </button>
                </div>

                <div className="space-y-2">
                  {taskTestCases.map((tc, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-mono text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 font-sans">{tc.description || `Test case ${idx + 1}`}</span>
                        {taskTestCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setTaskTestCases(taskTestCases.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 text-[10px]"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={tc.input}
                          onChange={e => {
                            const updated = [...taskTestCases];
                            updated[idx].input = e.target.value;
                            setTaskTestCases(updated);
                          }}
                          placeholder="Input: 1\n15"
                          className="p-1.5 bg-white border border-slate-300 rounded"
                        />
                        <input
                          type="text"
                          value={tc.expectedOutput}
                          onChange={e => {
                            const updated = [...taskTestCases];
                            updated[idx].expectedOutput = e.target.value;
                            setTaskTestCases(updated);
                          }}
                          placeholder="Output: 15\n1"
                          className="p-1.5 bg-white border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={() => handleSaveTask('draft')}
                className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl"
              >
                Lưu bản nháp (Draft)
              </button>

              <button
                type="button"
                onClick={() => handleSaveTask('published')}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-emerald-600 rounded-xl shadow-xs transition-colors"
              >
                Xuất bản vào ngân hàng đề
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
