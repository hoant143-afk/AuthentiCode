import React, { useState } from 'react';
import {
  Code, GraduationCap, ShieldCheck, ArrowRight,
  AlertCircle, KeyRound, Sparkles, CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  onTeacherLogin: (user: any) => void;
  onStudentLogin: (data: { student: any; classGroup: any; tasks: any[] }) => void;
}

export const WelcomePortal: React.FC<Props> = ({
  onTeacherLogin,
  onStudentLogin
}) => {
  const [selectedPortal, setSelectedPortal] = useState<'teacher' | 'student' | null>(null);

  // Student Session Login state
  const [sessionCode, setSessionCode] = useState('');
  const [isVerifyingSession, setIsVerifyingSession] = useState(false);
  const [sessionError, setSessionError] = useState('');

  // Teacher Login & Register state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [teacherEmail, setTeacherEmail] = useState('Bongnguyen446@gmail.com');
  const [teacherPassword, setTeacherPassword] = useState('Password123!');
  const [teacherConfirmPassword, setTeacherConfirmPassword] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherRole, setTeacherRole] = useState<'teacher' | 'second_grader' | 'admin'>('teacher');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [teacherError, setTeacherError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle student session login
  const handleVerifySession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sessionCode.trim()) {
      setSessionError('Vui lòng nhập mã phiên được giáo viên cấp.');
      return;
    }

    setIsVerifyingSession(true);
    setSessionError('');
    try {
      const data = await api.verifySession(sessionCode.trim());
      onStudentLogin(data);
    } catch (err: any) {
      setSessionError(err.message || 'Mã phiên không hợp lệ hoặc đã hết hạn.');
    } finally {
      setIsVerifyingSession(false);
    }
  };

  // Handle teacher login with password & approval check
  const handleTeacherLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!teacherEmail.trim() || !teacherPassword.trim()) {
      setTeacherError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoggingIn(true);
    setTeacherError('');
    setSuccessMessage('');
    try {
      const data = await api.login(teacherEmail.trim(), teacherPassword, teacherRole);
      if (data.user.status === 'pending' || !data.user.isApproved) {
        setTeacherError('Tài khoản đang chờ Quản trị viên phê duyệt. Vui lòng thử lại sau.');
        setIsLoggingIn(false);
        return;
      }
      onTeacherLogin(data.user);
    } catch (err: any) {
      setTeacherError(err.message || 'Lỗi đăng nhập giáo viên.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle teacher registration
  const handleTeacherRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!teacherName.trim() || !teacherEmail.trim() || !teacherPassword.trim()) {
      setTeacherError('Vui lòng điền đầy đủ họ tên, email và mật khẩu.');
      return;
    }
    if (teacherPassword !== teacherConfirmPassword) {
      setTeacherError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (teacherPassword.length < 6) {
      setTeacherError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setIsLoggingIn(true);
    setTeacherError('');
    setSuccessMessage('');
    try {
      const data = await api.register({
        name: teacherName.trim(),
        email: teacherEmail.trim(),
        password: teacherPassword
      });
      setSuccessMessage(data.message || 'Đăng ký thành công! Tài khoản đang chờ Admin phê duyệt.');
      setAuthMode('login');
    } catch (err: any) {
      setTeacherError(err.message || 'Lỗi đăng ký tài khoản.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="px-6 py-4 max-w-7xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
            AC
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">AuthentiCode</span>
            <span className="block text-[11px] text-slate-500 font-medium">Hệ thống đánh giá xác thực năng lực lập trình Python THCS</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl w-full mx-auto px-4 py-8 md:py-12 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Bối cảnh Trí tuệ Nhân tạo Tạo sinh (GenAI) trong Giáo dục
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
            AuthentiCode
          </h1>

          <p className="text-lg md:text-xl font-medium text-emerald-800 italic">
            Học lập trình – Hiểu bản chất – Làm chủ AI.
          </p>

          <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
            Hệ thống hỗ trợ giáo viên xác thực thực chất quá trình tư duy, năng lực phân tích đề, tự phát hiện sửa lỗi và trách nhiệm sử dụng AI của học sinh THCS, thay vì chỉ đánh giá một đoạn mã nguồn chạy đúng hình thức.
          </p>
        </div>

        {/* The Two Portals Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* PORTAL 1: TEACHER */}
          <div className={`bg-white rounded-3xl p-6 md:p-8 border transition-all shadow-sm flex flex-col justify-between space-y-6 ${
            selectedPortal === 'teacher' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'
          }`}>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>

              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Dành cho Thầy / Cô</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">1. Cổng Giáo Viên</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Quản lý lớp, cấp mã phiên cho học sinh, chấm theo Rubric 6 tiêu chí, tổ chức vấn đáp xác thực và đối chiếu độc lập giữa hai người chấm.
                </p>
              </div>

              {selectedPortal === 'teacher' ? (
                <div className="space-y-3 pt-2">
                  {/* Auth Mode Toggle Tabs */}
                  <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setTeacherError(''); setSuccessMessage(''); }}
                      className={`py-2 rounded-lg transition-colors ${authMode === 'login' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Đăng Nhập
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('register'); setTeacherError(''); setSuccessMessage(''); }}
                      className={`py-2 rounded-lg transition-colors ${authMode === 'register' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Đăng Ký Mới
                    </button>
                  </div>

                  {successMessage && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {teacherError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{teacherError}</span>
                    </div>
                  )}

                  {authMode === 'login' ? (
                    <form onSubmit={handleTeacherLogin} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">Email giáo viên:</label>
                        <input
                          type="email"
                          value={teacherEmail}
                          onChange={e => setTeacherEmail(e.target.value)}
                          placeholder="teacher@school.edu.vn"
                          className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">Mật khẩu:</label>
                        <input
                          type="password"
                          value={teacherPassword}
                          onChange={e => setTeacherPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">Vai trò truy cập:</label>
                        <select
                          value={teacherRole}
                          onChange={e => setTeacherRole(e.target.value as any)}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900"
                        >
                          <option value="teacher">Giáo viên phụ trách (Teacher)</option>
                          <option value="second_grader">Người chấm độc lập (Second Grader)</option>
                          <option value="admin">Quản trị hệ thống (Admin)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                      >
                        {isLoggingIn ? 'Đang xác thực...' : 'Đăng nhập Cổng Giáo Viên'}
                      </button>

                      <div className="text-[11px] text-slate-400 text-center flex items-center justify-between pt-1">
                        <span>Tài khoản mẫu: <code className="text-blue-600 font-mono">Bongnguyen446@gmail.com</code></span>
                        <button
                          type="button"
                          onClick={() => setAuthMode('register')}
                          className="text-blue-600 font-medium hover:underline"
                        >
                          Chưa có tài khoản? Đăng ký
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleTeacherRegister} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">Họ và tên giáo viên:</label>
                        <input
                          type="text"
                          value={teacherName}
                          onChange={e => setTeacherName(e.target.value)}
                          placeholder="Nguyễn Văn A"
                          className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">Email:</label>
                        <input
                          type="email"
                          value={teacherEmail}
                          onChange={e => setTeacherEmail(e.target.value)}
                          placeholder="teacher@school.edu.vn"
                          className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">Mật khẩu (ít nhất 6 ký tự):</label>
                        <input
                          type="password"
                          value={teacherPassword}
                          onChange={e => setTeacherPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">Xác nhận mật khẩu:</label>
                        <input
                          type="password"
                          value={teacherConfirmPassword}
                          onChange={e => setTeacherConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                      >
                        {isLoggingIn ? 'Đang gửi đăng ký...' : 'Đăng Ký Tài Khoản'}
                      </button>

                      <div className="text-[11px] text-slate-400 text-center pt-1">
                        <span>Tài khoản đăng ký mới sẽ có trạng thái <strong className="text-amber-600">Chờ phê duyệt</strong> từ Quản trị viên hệ thống.</span>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Xác thực qua tài khoản đã được phê duyệt</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Chấm Rubric & Biên bản vấn đáp chuẩn hóa</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedPortal !== 'teacher' && (
              <button
                onClick={() => setSelectedPortal('teacher')}
                className="w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <span>Vào Cổng Giáo Viên</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* PORTAL 2: STUDENT */}
          <div className={`bg-white rounded-3xl p-6 md:p-8 border transition-all shadow-sm flex flex-col justify-between space-y-6 ${
            selectedPortal === 'student' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
          }`}>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Code className="w-6 h-6" />
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Dành cho Học Sinh</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">2. Cổng Học Sinh</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Học sinh không bắt buộc phải có Gmail. Nhập mã phiên cá nhân có thời hạn do thầy cô cấp để vào làm bài, tương tác với AI và xem nhận xét.
                </p>
              </div>

              {selectedPortal === 'student' ? (
                <form onSubmit={handleVerifySession} className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Mã phiên cá nhân (Session Code):</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={sessionCode}
                        onChange={e => setSessionCode(e.target.value.toUpperCase())}
                        placeholder="Ví dụ: AUTH-8A1-4921"
                        className="w-full text-xs p-3 pl-9 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase"
                      />
                    </div>
                  </div>

                  {sessionError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{sessionError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifyingSession}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    {isVerifyingSession ? 'Đang kiểm tra mã phiên...' : 'Vào lớp làm bài'}
                  </button>

                  {/* Quick Click Demo Codes */}
                  <div className="pt-1 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Mã phiên học sinh có sẵn:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setSessionCode('AUTH-8A1-4921'); setSessionError(''); }}
                        className="text-[10px] font-mono bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 px-2 py-0.5 rounded text-slate-700 transition-colors"
                      >
                        AUTH-8A1-4921 (Khang)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSessionCode('AUTH-8A1-7732'); setSessionError(''); }}
                        className="text-[10px] font-mono bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 px-2 py-0.5 rounded text-slate-700 transition-colors"
                      >
                        AUTH-8A1-7732 (Nguyên)
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-2 pt-2">
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đăng nhập an toàn bằng mã phiên</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Lưu lịch sử bài nộp, bảo mật riêng tư tuyệt đối</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedPortal !== 'student' && (
              <button
                onClick={() => setSelectedPortal('student')}
                className="w-full py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <span>Vào Cổng Học Sinh</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 4 Ethical Pillars Callout */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 max-w-4xl mx-auto shadow-xs">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Bốn Nguyên Tắc Cốt Lõi Của AuthentiCode
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-700">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">1. Hiểu bản chất</span>
              <p className="text-[11px] text-slate-600">
                Mã nguồn chạy đúng không đồng nghĩa với việc học sinh đã thực sự hiểu chương trình.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">2. AI là trợ lý</span>
              <p className="text-[11px] text-slate-600">
                AI hỗ trợ gợi mở tư duy, không thay thế năng lực giải quyết vấn đề của học sinh.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">3. Không AI detector</span>
              <p className="text-[11px] text-slate-600">
                Không dùng công cụ phát hiện AI tự động thiếu tin cậy để quy kết gian lận.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">4. Quyền của giáo viên</span>
              <p className="text-[11px] text-slate-600">
                Giáo viên là người đánh giá, vấn đáp và đưa ra kết luận công tâm cuối cùng.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <p>AuthentiCode – Hệ thống hỗ trợ đánh giá xác thực năng lực lập trình Python của học sinh THCS trong bối cảnh GenAI</p>
      </footer>

    </div>
  );
};
