export const api = {
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  async register(data: { name: string; email: string; password: string }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi đăng ký tài khoản');
    }
    return res.json();
  },

  async login(email: string, password?: string, role?: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi đăng nhập');
    }
    return data;
  },

  async getUsers() {
    const res = await fetch('/api/users');
    return res.json();
  },

  async updateUserStatus(id: string, status: string, adminId?: string) {
    const res = await fetch(`/api/users/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi cập nhật trạng thái người dùng');
    }
    return res.json();
  },

  async updateUserRole(id: string, role: string, adminId?: string) {
    const res = await fetch(`/api/users/${id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, adminId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi cập nhật vai trò người dùng');
    }
    return res.json();
  },

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

  async getClasses() {
    const res = await fetch('/api/classes');
    return res.json();
  },

  async createClass(data: { name: string; grade: number; academicYear: string; teacherName?: string }) {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getClassStudents(classId: string) {
    const res = await fetch(`/api/classes/${classId}/students`);
    return res.json();
  },

  async addStudent(classId: string, data: { fullName: string; studentCode?: string; notes?: string }) {
    const res = await fetch(`/api/classes/${classId}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async renewSessions(classId: string) {
    const res = await fetch(`/api/classes/${classId}/generate-sessions`, {
      method: 'POST'
    });
    return res.json();
  },

  async getTasks(filter?: { status?: string; aiLevel?: string }) {
    const query = new URLSearchParams(filter as any).toString();
    const res = await fetch(`/api/tasks${query ? '?' + query : ''}`);
    return res.json();
  },

  async getTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`);
    if (!res.ok) throw new Error('Không tìm thấy bài tập');
    return res.json();
  },

  async createTask(taskData: any) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      method: 'POST'
    });
    if (!res.ok) throw new Error('Lỗi xuất bản bài tập');
    return res.json();
  },

  async deleteTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi xóa bài tập');
    }
    return res.json();
  },

  async getAssignments() {
    const res = await fetch('/api/assignments');
    return res.json();
  },

  async createAssignment(assignmentData: any) {
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignmentData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi giao bài tập');
    }
    return res.json();
  },

  async getMyAssignedTasks(studentId: string, classId: string) {
    const res = await fetch(`/api/assignments/my-tasks?studentId=${studentId}&classId=${classId}`);
    if (!res.ok) throw new Error('Lỗi tải bài tập được giao');
    return res.json();
  },

  async getAssignmentTracker(assignmentId: string) {
    const res = await fetch(`/api/assignments/${assignmentId}/tracker`);
    if (!res.ok) throw new Error('Lỗi tải thông tin theo dõi');
    return res.json();
  },

  async getSubmissions(params?: { studentId?: string; classId?: string; taskId?: string; status?: string }) {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`/api/submissions${query ? '?' + query : ''}`);
    return res.json();
  },

  async getSubmission(id: string) {
    const res = await fetch(`/api/submissions/${id}`);
    if (!res.ok) throw new Error('Không tìm thấy bài nộp');
    return res.json();
  },

  async saveSubmission(data: any) {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi lưu bài nộp');
    }
    return res.json();
  },

  async getEvaluations(submissionId?: string) {
    const url = submissionId ? `/api/evaluations?submissionId=${submissionId}` : '/api/evaluations';
    const res = await fetch(url);
    return res.json();
  },

  async saveEvaluation(data: any) {
    const res = await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi lưu đánh giá');
    }
    return res.json();
  },

  async getDoubleGrading(submissionId: string, currentUserId?: string) {
    const url = `/api/double-grading/${submissionId}${currentUserId ? '?currentUserId=' + currentUserId : ''}`;
    const res = await fetch(url);
    return res.json();
  },

  async reconcileDoubleGrading(data: any) {
    const res = await fetch('/api/double-grading/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getAppeals(studentId?: string) {
    const url = studentId ? `/api/appeals?studentId=${studentId}` : '/api/appeals';
    const res = await fetch(url);
    return res.json();
  },

  async submitAppeal(data: any) {
    const res = await fetch('/api/appeals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async verifyTestRunner(taskNumber: number, input: string, studentOutput: string) {
    const res = await fetch('/api/test-runner/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskNumber, input, studentOutput })
    });
    return res.json();
  },

  async getTechnicalTestCases() {
    const res = await fetch('/api/test-cases/technical');
    return res.json();
  },

  async askGemini(taskNumber: number, prompt: string, studentId?: string, studentCode?: string) {
    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskNumber, prompt, studentId, studentCode })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi gọi trợ lý AI');
    }
    return data;
  },

  async getStats() {
    const res = await fetch('/api/stats');
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch('/api/audit-logs');
    return res.json();
  }
};
