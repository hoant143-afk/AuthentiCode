import React, { useState, useEffect } from 'react';
import {
  Code, GraduationCap, ShieldCheck, ArrowRight,
  AlertCircle, KeyRound, Sparkles, CheckCircle2, User, Lock, Users
} from 'lucide-react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../../services/firebase';
import { api } from '../../services/api';
import { ClassGroup } from '../../types';

interface Props {
  onTeacherLogin: (user: any) => void;
  onStudentLogin: (data: { student: any; classGroup: any; tasks: any[] }) => void;
}

export const WelcomePortal: React.FC<Props> = ({
  onTeacherLogin,
  onStudentLogin
}) => {
  const [selectedPortal, setSelectedPortal] = useState<'teacher' | 'student' | null>(null);

  // Classes loaded from server
  const [availableClasses, setAvailableClasses] = useState<ClassGroup[]>([]);

  // Student Join State (Requirement 5)
  const [studentFullName, setStudentFullName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classCode, setClassCode] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [needStudentCode, setNeedStudentCode] = useState(false);
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [studentError, setStudentError] = useState('');

  // Teacher Firebase Auth State (Requirement 2 & 3)
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherConfirmPassword, setTeacherConfirmPassword] = useState('');
  const [teacherAuthTab, setTeacherAuthTab] = useState<'login' | 'register'>('login');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [teacherError, setTeacherError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch available classes for students to select
  useEffect(() => {
    async function loadClasses() {
      try {
        const cls = await api.getClasses();
        if (cls && cls.length > 0) {
          setAvailableClasses(cls);
          setSelectedClassId(cls[0].id);
        }
      } catch (e) {
        console.warn('Lỗi tải danh sách lớp:', e);
      }
    }
    loadClasses();
  }, []);

  // Handle student join class with class code (Requirement 5)
  const handleStudentJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentFullName.trim() || !selectedClassId || !classCode.trim()) {
      setStudentError('Vui lòng nhập Họ tên, chọn Lớp và điền Mã lớp do thầy cô cung cấp.');
      return;
    }

    setIsJoiningClass(true);
    setStudentError('');
    try {
      const data = await api.joinClass({
        fullName: studentFullName.trim(),
        classId: selectedClassId,
        classCode: classCode.trim(),
        studentCode: studentCode.trim() || undefined
      });
      onStudentLogin(data);
    } catch (err: any) {
      if (err.requireStudentCode) {
        setNeedStudentCode(true);
        setStudentError('Phát hiện có học sinh trùng tên trong lớp này. Vui lòng nhập thêm Mã học sinh (ví dụ: HS01) để xác thực.');
      } else {
        setStudentError(err.message || 'Mã lớp không chính xác hoặc không thể tham gia.');
      }
    } finally {
      setIsJoiningClass(false);
    }
  };

  // Handle teacher login via Google (Firebase Auth)
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setTeacherError('');
    setSuccessMessage('');
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      const idToken = await userCred.user.getIdToken();
      const data = await api.verifyTeacherToken(idToken);
      onTeacherLogin(data.user);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setTeacherError('Cửa sổ đăng nhập Google đã bị đóng. Vui lòng thử lại.');
      } else {
        setTeacherError(err.message || 'Lỗi xác thực tài khoản qua Google Firebase.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle teacher email/password sign-in or register (Firebase Auth)
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherEmail.trim() || !teacherPassword.trim()) {
      setTeacherError('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }

    if (teacherAuthTab === 'register') {
      if (teacherPassword !== teacherConfirmPassword) {
        setTeacherError('Mật khẩu xác nhận không khớp.');
        return;
      }
      if (teacherPassword.length < 6) {
        setTeacherError('Mật khẩu phải có ít nhất 6 ký tự.');
        return;
      }
    }

    setIsLoggingIn(true);
    setTeacherError('');
    setSuccessMessage('');

    try {
      let userCred;
      if (teacherAuthTab === 'register') {
        userCred = await createUserWithEmailAndPassword(auth, teacherEmail.trim(), teacherPassword);
      } else {
        userCred = await signInWithEmailAndPassword(auth, teacherEmail.trim(), teacherPassword);
      }

      const idToken = await userCred.user.getIdToken();
      const data = await api.verifyTeacherToken(idToken);
      onTeacherLogin(data.user);
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setTeacherError('Phương thức Email/Mật khẩu chưa được bật trong Firebase Console. Vui lòng sử dụng nút "Đăng nhập nhanh với Google" bên trên.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setTeacherError('Email hoặc mật khẩu không chính xác.');
      } else if (err.code === 'auth/email-already-in-use') {
        setTeacherError('Email này đã được sử dụng. Vui lòng chuyển sang tab Đăng Nhập.');
      } else {
        setTeacherError(err.message || 'Lỗi xác thực Firebase.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
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
      </header>

      {/* Main Container */}
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
                  Xác thực danh tính qua Firebase Authentication. Quản lý lớp, giao bài, chấm Rubric chuẩn hóa, tổ chức vấn đáp và đối chiếu độc lập.
                </p>
              </div>

              {selectedPortal === 'teacher' ? (
                <div className="space-y-4 pt-2">
                  {/* Google Sign-In Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoggingIn}
                    className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>{isLoggingIn ? 'Đang xác thực...' : 'Đăng nhập với Google (Firebase Auth)'}</span>
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="grow border-t border-slate-200"></div>
                    <span className="shrink mx-3 text-[10px] uppercase font-bold text-slate-400">Hoặc dùng Email</span>
                    <div className="grow border-t border-slate-200"></div>
                  </div>

                  {/* Auth Mode Toggle Tabs */}
                  <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => { setTeacherAuthTab('login'); setTeacherError(''); setSuccessMessage(''); }}
                      className={`py-2 rounded-lg transition-colors ${teacherAuthTab === 'login' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Đăng Nhập
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTeacherAuthTab('register'); setTeacherError(''); setSuccessMessage(''); }}
                      className={`py-2 rounded-lg transition-colors ${teacherAuthTab === 'register' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Đăng Ký
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

                  <form onSubmit={handleEmailAuth} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 block">Email giáo viên:</label>
                      <input
                        type="email"
                        value={teacherEmail}
                        onChange={e => setTeacherEmail(e.target.value)}
                        placeholder="teacher@school.edu.vn"
                        required
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
                        required
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {teacherAuthTab === 'register' && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">Xác nhận mật khẩu:</label>
                        <input
                          type="password"
                          value={teacherConfirmPassword}
                          onChange={e => setTeacherConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                    >
                      {isLoggingIn ? 'Đang xử lý...' : teacherAuthTab === 'login' ? 'Đăng nhập Cổng Giáo Viên' : 'Đăng ký tài khoản giáo viên'}
                    </button>

                    <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                      Chỉ tài khoản đã xác thực và được Quản trị viên phê duyệt mới có quyền truy cập Cổng Giáo Viên.
                    </p>
                  </form>
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Xác thực an toàn qua Firebase Authentication</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Phân quyền máy chủ nghiêm ngặt, chống giả mạo danh tính</span>
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

          {/* PORTAL 2: STUDENT (REQUIREMENT 5) */}
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
                  Học sinh tham gia lớp bằng Họ tên và Mã lớp chung do giáo viên cung cấp. Không cần mã phiên cá nhân riêng biệt để vào lớp.
                </p>
              </div>

              {selectedPortal === 'student' ? (
                <form onSubmit={handleStudentJoin} className="space-y-3 pt-2">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Họ và tên của em:</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={studentFullName}
                        onChange={e => setStudentFullName(e.target.value)}
                        placeholder="Ví dụ: Trần Minh Khang"
                        required
                        className="w-full text-xs p-3 pl-9 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Class Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Chọn lớp học:</label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <select
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                        className="w-full text-xs p-3 pl-9 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      >
                        {availableClasses.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} (Khối {c.grade} - Năm học {c.academicYear})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Class Shared Code */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Mã tham gia lớp học (Class Code):</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={classCode}
                        onChange={e => setClassCode(e.target.value.toUpperCase())}
                        placeholder="Ví dụ: 8A1-2026"
                        required
                        className="w-full text-xs p-3 pl-9 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">Hỏi thầy/cô giáo phụ trách để nhận mã lớp chung của lớp em.</span>
                  </div>

                  {/* Duplicate Name Resolution: Student Code Input */}
                  {needStudentCode && (
                    <div className="space-y-1 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <label className="text-xs font-bold text-amber-900 block">Mã học sinh (bắt buộc khi trùng tên):</label>
                      <input
                        type="text"
                        value={studentCode}
                        onChange={e => setStudentCode(e.target.value.toUpperCase())}
                        placeholder="Ví dụ: HS01"
                        className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-slate-900 uppercase"
                      />
                    </div>
                  )}

                  {studentError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{studentError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isJoiningClass}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    {isJoiningClass ? 'Đang xác thực mã lớp...' : 'Vào lớp làm bài'}
                  </button>

                  {/* Demo helper */}
                  <div className="pt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700 block">Mã lớp mẫu lớp 8A1:</span>
                    <div className="flex items-center justify-between">
                      <span>Mã lớp: <code className="font-mono font-bold text-emerald-700">8A1-2026</code></span>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentFullName('Trần Minh Khang');
                          setClassCode('8A1-2026');
                          if (availableClasses.length > 0) setSelectedClassId(availableClasses[0].id);
                        }}
                        className="text-emerald-700 hover:underline font-semibold"
                      >
                        Điền nhanh mẫu (Khang)
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-2 pt-2">
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tham gia bằng Họ tên và Mã lớp chung</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Dữ liệu và điểm số được bảo mật riêng tư tuyệt đối</span>
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
