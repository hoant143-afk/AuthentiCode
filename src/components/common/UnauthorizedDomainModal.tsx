import React, { useState } from 'react';
import { Globe, Copy, CheckCircle2, ExternalLink, ShieldAlert, X, RefreshCw, KeyRound } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

export const UnauthorizedDomainModal: React.FC<Props> = ({ isOpen, onClose, onRetry }) => {
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'ais-dev-ct5eae6ggiwa4sku5v2kjj-677380030937.asia-southeast1.run.app';
  const wildcardDomain = 'run.app';
  const projectId = 'authenticode1305';
  const settingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(text);
    setTimeout(() => setCopiedDomain(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-amber-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Ủy Quyền Tên Miền Firebase Authentication</h3>
              <p className="text-xs text-amber-100 font-mono">Lỗi: auth/unauthorized-domain</p>
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
        <div className="p-6 space-y-5 text-xs text-slate-700">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <Globe className="w-4 h-4 text-amber-600" />
              <span>Nguyên nhân & Giải pháp</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Firebase Authentication bảo vệ dự án <strong className="font-mono text-slate-900">{projectId}</strong> bằng cách chỉ cho phép các tên miền được ủy quyền thực hiện Đăng nhập Google. Tên miền ứng dụng hiện tại chưa được cấp quyền trong Firebase Console.
            </p>
          </div>

          {/* Quick Copy Domain Cards */}
          <div className="space-y-2.5">
            <label className="font-bold text-slate-900 block text-xs">Chọn giá trị để sao chép vào Firebase Console:</label>

            {/* Recommended: run.app */}
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-950 font-mono text-xs">{wildcardDomain}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md">
                    Khuyên dùng
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Ủy quyền cho mọi bản xem trước & môi trường Cloud Run của ứng dụng</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(wildcardDomain)}
                className="shrink-0 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {copiedDomain === wildcardDomain ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            {/* Exact Hostname */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="font-mono text-slate-800 text-[11px] font-semibold block truncate" title={currentHostname}>
                  {currentHostname}
                </span>
                <p className="text-[10px] text-slate-500">Tên miền chính xác của container hiện tại</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(currentHostname)}
                className="shrink-0 py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {copiedDomain === currentHostname ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3 Step Action Guide */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              Các bước thực hiện trong 30 giây:
            </h4>
            <ol className="space-y-1.5 pl-4 list-decimal text-[11px] text-slate-600 leading-relaxed">
              <li>
                Bấm nút <strong>"Mở Cài Đặt Firebase Console"</strong> màu xanh bên dưới.
              </li>
              <li>
                Tại phần <strong>Authorized domains</strong> (Miền được ủy quyền), bấm <strong>Add domain</strong> (Thêm miền).
              </li>
              <li>
                Dán <code className="bg-slate-100 text-slate-900 px-1 py-0.5 rounded font-mono font-bold">run.app</code> hoặc tên miền vừa sao chép, sau đó bấm <strong>Add / Save</strong>.
              </li>
              <li>
                Quay lại đây và nhấn nút <strong>"Thử lại Đăng nhập Google"</strong>.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <a
            href={settingsUrl}
            target="_blank"
            rel="noreferrer"
            className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
          >
            <span>Mở Cài Đặt Firebase Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRetry();
                }}
                className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại Đăng nhập</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
