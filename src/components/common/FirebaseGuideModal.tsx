import React from 'react';
import { Database, ShieldCheck, CheckCircle2, Copy, AlertCircle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const sampleRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Chặn truy cập mặc định
    match /{document=**} {
      allow read, write: if false;
    }
    
    // Phân quyền AuthentiCode
    match /classes/{classId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.role == 'teacher';
    }
    
    match /submissions/{subId} {
      allow read: if request.auth != null && (
        resource.data.studentId == request.auth.uid || 
        request.auth.token.role in ['teacher', 'admin', 'second_grader']
      );
      allow create: if request.auth != null && request.resource.data.studentId == request.auth.uid;
      allow update: if request.auth != null && (
        (resource.data.studentId == request.auth.uid && request.resource.data.status == 'draft') ||
        request.auth.token.role in ['teacher', 'admin']
      );
    }
  }
}`;

  const copyRules = () => {
    navigator.clipboard.writeText(sampleRules);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Hướng Dẫn Cấu Hình Firebase Firestore</h3>
              <p className="text-xs text-emerald-100">Kết nối cơ sở dữ liệu đám mây cho AuthentiCode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm text-slate-700 max-h-[75vh] overflow-y-auto">
          {/* Current Status Box - Connected */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="font-bold text-emerald-950 text-sm">Firebase Đã Kết Nối Thành Công!</h4>
              </div>
              <span className="text-[11px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                authenticode1305
              </span>
            </div>
            <div className="text-xs text-emerald-800 space-y-1 pt-1 border-t border-emerald-200/70 font-mono">
              <p><strong>Project ID:</strong> authenticode1305 (Số dự án: 848525775448)</p>
              <p><strong>Database ID:</strong> ai-studio-authenticode-d205c66c-d5e5-4445-9baa-99657abb127a</p>
              <p><strong>Trạng thái Rules:</strong> Đã triển khai an toàn (DeployRules: OK)</p>
            </div>
            <div className="pt-2">
              <a
                href="https://console.firebase.google.com/u/0/project/authenticode1305/firestore/databases/ai-studio-authenticode-d205c66c-d5e5-4445-9baa-99657abb127a/data"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-white bg-emerald-700 hover:bg-emerald-800 font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                Mở Cloud Firestore Console ↗
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center">1</span>
              Quy trình 3 bước kết nối Cloud Firestore
            </h4>

            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <span className="font-semibold text-slate-900 shrink-0">Bước 1:</span>
                <p>
                  Truy cập <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline">Firebase Console</a>, tạo một Project mới hoặc chọn Project hiện có của trường/tổ bộ môn.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-semibold text-slate-900 shrink-0">Bước 2:</span>
                <p>
                  Kích hoạt <strong>Cloud Firestore</strong> (chọn vị trí gần nhất ví dụ <code className="bg-slate-200 px-1 rounded">asia-southeast1</code>) và bật <strong>Firebase Authentication</strong> với phương thức Google Sign-In.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-semibold text-slate-900 shrink-0">Bước 3:</span>
                <p>
                  Cập nhật cấu hình vào tệp <code className="bg-slate-200 px-1 rounded">firebase-applet-config.json</code> hoặc cấp quyền qua giao diện thiết lập của Google AI Studio.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Mẫu Firestore Security Rules chuẩn
                </h5>
                <button
                  onClick={copyRules}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium py-1 px-2.5 rounded-md hover:bg-emerald-50 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Đã sao chép!' : 'Sao chép Rules'}
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
                {sampleRules}
              </pre>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Lưu ý bảo mật:</strong> Hệ thống AuthentiCode áp dụng nguyên tắc kiểm soát quyền nghiêm ngặt. Học sinh chỉ có quyền đọc và gửi bài của chính mình; chỉ tài khoản giáo viên đã duyệt mới có quyền chấm và lưu kết quả chính thức.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Đã hiểu, đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
