// AuthentiCode Central Client API Service

function getTeacherToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('authenticode_teacher_token') : null;
}

function getStudentToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('authenticode_student_token') : null;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const teacherToken = getTeacherToken();
  if (teacherToken) {
    headers['Authorization'] = `Bearer ${teacherToken}`;
  }
  const studentToken = getStudentToken();
  if (studentToken) {
    headers['X-Student-Token'] = studentToken;
  }
  return headers;
}

export const api = {
  // System Health
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  // Teacher Authentication via Firebase ID Token
  async verifyTeacherToken(idToken: string) {
    const res = await fetch('/api/auth/verify-teacher-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi xác thực tài khoản giáo viên');
    }
    if (data.token) {
      localStorage.setItem('authenticode_teacher_token', data.token);
    }
    return data;
  },

  // Student Join Class
  async joinClass(payload: { fullName: string; classId: string; classCode: string; studentCode?: string }) {
    const res = await fetch('/api/sessions/join-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      const err: any = new Error(data.error || 'Lỗi tham gia lớp');
      err.requireStudentCode = Boolean(data.requireStudentCode);
      throw err;
    }
    if (data.studentToken) {
      localStorage.setItem('authenticode_student_token', data.studentToken);
    }
    return data;
  },

  // Verify individual assignment code
  async verifyIndividualAssignmentCode(assignmentId: string, studentId: string, individualCode: string) {
    const res = await fetch('/api/assignments/verify-individual-code', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ assignmentId, studentId, individualCode })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Mã bài tập cá nhân không hợp lệ');
    }
    return data;
  },

  // Legacy student verify session (for backward compatibility)
  async verifySession(sessionCode: string) {
    const res = await fetch('/api/sessions/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionCode })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Mã phiên không hợp lệ');
    }
    return res.json();
  },

  // Users Management (Admin only)
  async getUsers() {
    const res = await fetch('/api/users', {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi tải danh sách người dùng');
    }
    return res.json();
  },

  async updateUserStatus(id: string, status: string) {
    const res = await fetch(`/api/users/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi cập nhật trạng thái người dùng');
    }
    return res.json();
  },

  async updateUserRole(id: string, role: string) {
    const res = await fetch(`/api/users/${id}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi cập nhật vai trò người dùng');
    }
    return res.json();
  },

  // Classes & Students
  async getClasses() {
    const res = await fetch('/api/classes', {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async createClass(data: { name: string; grade: number; academicYear: string; classCode?: string; teacherName?: string }) {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi tạo lớp học');
    }
    return res.json();
  },

  async getClassStudents(classId: string) {
    const res = await fetch(`/api/classes/${classId}/students`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async addStudent(classId: string, data: { fullName: string; studentCode?: string; notes?: string }) {
    const res = await fetch(`/api/classes/${classId}/students`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi thêm học sinh');
    }
    return res.json();
  },

  async renewSessions(classId: string) {
    const res = await fetch(`/api/classes/${classId}/generate-sessions`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Tasks Management
  async getTasks(filter?: { status?: string; aiLevel?: string }) {
    const query = new URLSearchParams(filter as any).toString();
    const res = await fetch(`/api/tasks${query ? '?' + query : ''}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async getTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Không tìm thấy bài tập');
    return res.json();
  },

  async createTask(taskData: any) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(taskData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi tạo bài tập');
    }
    return res.json();
  },

  async updateTask(id: string, taskData: any) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(taskData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi cập nhật bài tập');
    }
    return res.json();
  },

  async publishTask(id: string) {
    const res = await fetch(`/api/tasks/${id}/publish`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Lỗi xuất bản bài tập');
    return res.json();
  },

  async deleteTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi xóa bài tập');
    }
    return res.json();
  },

  // Assignments
  async getAssignments() {
    const res = await fetch('/api/assignments', {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async createAssignment(assignmentData: any) {
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(assignmentData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi giao bài tập');
    }
    return res.json();
  },

  async getMyAssignedTasks(studentId: string, classId: string) {
    const res = await fetch(`/api/assignments/my-tasks?studentId=${studentId}&classId=${classId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Lỗi tải bài tập được giao');
    return res.json();
  },

  async getAssignmentTracker(assignmentId: string) {
    const res = await fetch(`/api/assignments/${assignmentId}/tracker`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Lỗi tải thông tin theo dõi');
    return res.json();
  },

  // Submissions
  async getSubmissions(params?: { studentId?: string; classId?: string; taskId?: string; status?: string }) {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`/api/submissions${query ? '?' + query : ''}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async getSubmission(id: string) {
    const res = await fetch(`/api/submissions/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Không tìm thấy bài nộp');
    return res.json();
  },

  async saveSubmission(data: any) {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi lưu bài nộp');
    }
    return res.json();
  },

  // Evaluations
  async getEvaluations(submissionId?: string) {
    const url = submissionId ? `/api/evaluations?submissionId=${submissionId}` : '/api/evaluations';
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async saveEvaluation(data: any) {
    const res = await fetch('/api/evaluations', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi lưu đánh giá');
    }
    return res.json();
  },

  async getDoubleGrading(submissionId: string) {
    const url = `/api/double-grading/${submissionId}`;
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async reconcileDoubleGrading(data: any) {
    const res = await fetch('/api/double-grading/reconcile', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi hòa giải điểm');
    }
    return res.json();
  },

  // Appeals
  async getAppeals(studentId?: string) {
    const url = studentId ? `/api/appeals?studentId=${studentId}` : '/api/appeals';
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async submitAppeal(data: any) {
    const res = await fetch('/api/appeals', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi gửi yêu cầu xem lại');
    }
    return res.json();
  },

  async respondAppeal(id: string, data: any) {
    const res = await fetch(`/api/appeals/${id}/respond`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi phản hồi phúc khảo');
    }
    return res.json();
  },

  // Test Runner
  async verifyTestRunner(taskIdOrNumber: string | number, input: string, studentOutput: string) {
    const res = await fetch('/api/test-runner/verify', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ taskIdOrNumber, input, studentOutput })
    });
    return res.json();
  },

  async getTechnicalTestCases() {
    const res = await fetch('/api/test-cases/technical', {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Gemini AI Assistant (Enforces AI levels T1, T2, T3)
  async askGemini(params: { taskId?: string; taskNumber?: number; assignmentId?: string; prompt: string; studentId?: string; studentCode?: string }) {
    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi gọi trợ lý AI');
    }
    return data;
  },

  // Stats & Audit
  async getStats() {
    const res = await fetch('/api/stats', {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch('/api/audit-logs', {
      headers: getAuthHeaders()
    });
    return res.json();
  }
};
