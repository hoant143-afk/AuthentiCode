import React, { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, X, Terminal, HelpCircle, ArrowRight } from 'lucide-react';
import { TECHNICAL_TEST_CASES } from '../../data/seedData';
import { compareOutputs } from '../../services/testEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTaskNumber?: 1 | 2 | 3;
}

export const TestBenchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultTaskNumber = 1
}) => {
  const [taskNumber, setTaskNumber] = useState<1 | 2 | 3>(defaultTaskNumber);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('TC-01');
  const [inputVal, setInputVal] = useState<string>('7\n12 15 20 0 18 4 15');
  const [studentOutputVal, setStudentOutputVal] = useState<string>('84\n4');
  const [testResult, setTestResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleSelectTestCase = (tcId: string) => {
    setSelectedTestCaseId(tcId);
    const tc = TECHNICAL_TEST_CASES.find(t => t.id === tcId);
    if (tc) {
      setInputVal(tc.input);
      if (taskNumber === 3) {
        setStudentOutputVal(tc.expectedOutputT3.startsWith('LOI_') ? '' : tc.expectedOutputT3);
      } else {
        setStudentOutputVal(tc.expectedOutputT1.startsWith('LOI_') ? '' : tc.expectedOutputT1);
      }
      setTestResult(null);
    }
  };

  const handleRunComparison = () => {
    const res = compareOutputs(taskNumber, inputVal, studentOutputVal);
    setTestResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Bàn Kiểm Thử Python – Đối Chiếu Đầu Ra Chuẩn
                <span className="text-[11px] font-normal text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  12 Test Case Kỹ Thuật
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Đối sánh đầu ra từ môi trường Thonny của học sinh với thuật toán chuẩn độc lập
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Switcher & Disclaimer */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Chọn nhiệm vụ đối chiếu:</span>
            <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5">
              <button
                onClick={() => { setTaskNumber(1); setTestResult(null); }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  taskNumber === 1 ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nhiệm vụ 1 (7 ngày)
              </button>
              <button
                onClick={() => { setTaskNumber(2); setTestResult(null); }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  taskNumber === 2 ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nhiệm vụ 2 (Sửa lỗi)
              </button>
              <button
                onClick={() => { setTaskNumber(3); setTestResult(null); }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  taskNumber === 3 ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nhiệm vụ 3 (Tổng 75 & DAT)
              </button>
            </div>
          </div>

          <div className="text-slate-500 italic flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Hệ thống chỉ so sánh dữ liệu đầu ra với thuật toán chuẩn, không thực thi mã Python không an toàn trên máy chủ.</span>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Select 12 Test Cases */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
              Bộ 12 Test Case Kỹ Thuật Chuẩn Hóa:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {TECHNICAL_TEST_CASES.map(tc => (
                <button
                  key={tc.id}
                  onClick={() => handleSelectTestCase(tc.id)}
                  className={`text-left p-2 rounded-lg border text-xs transition-all ${
                    selectedTestCaseId === tc.id
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-semibold ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="truncate font-medium">{tc.name}</div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{tc.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Input & Output Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800">
                  Dữ liệu đầu vào (Input):
                </label>
                <span className="text-slate-500">Dòng 1: n, Dòng 2: n số trang</span>
              </div>
              <textarea
                value={inputVal}
                onChange={e => { setInputVal(e.target.value); setTestResult(null); }}
                rows={4}
                className="w-full font-mono text-xs p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                placeholder="Ví dụ:&#10;7&#10;12 15 20 0 18 4 15"
              />
            </div>

            {/* Student Output Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800">
                  Kết quả học sinh chạy từ Thonny (Output):
                </label>
                <span className="text-slate-500">Dán kết quả chạy thực tế</span>
              </div>
              <textarea
                value={studentOutputVal}
                onChange={e => { setStudentOutputVal(e.target.value); setTestResult(null); }}
                rows={4}
                className="w-full font-mono text-xs p-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                placeholder="Dán kết quả chạy in ra màn hình từ Thonny vào đây..."
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={handleRunComparison}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              Chạy Đối Chiếu & Bắt Lỗi
            </button>
          </div>

          {/* Comparison Result Display */}
          {testResult && (
            <div className={`p-5 rounded-xl border transition-all ${
              testResult.isMatch
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-amber-50 border-amber-300'
            }`}>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  {testResult.isMatch ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {testResult.isMatch ? 'KẾT QUẢ KHỚP 100% VỚI THUẬT TOÁN CHUẨN' : 'PHÁT HIỆN ĐIỂM CHƯA KHỚP VỚI THUẬT TOÁN CHUẨN'}
                    </h4>
                    <p className="text-xs text-slate-600">
                      Tỷ lệ dòng kết quả chính xác: <strong className="text-slate-900">{testResult.matchScorePercent}%</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold ${
                    testResult.isMatch ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                  }`}>
                    {testResult.isMatch ? 'PASSED' : 'MISMATCH'}
                  </span>
                </div>
              </div>

              {/* Side by Side Diff */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono mb-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="block text-[11px] font-sans font-bold text-slate-500 mb-1">
                    Kết quả chuẩn của hệ thống:
                  </span>
                  <pre className="text-emerald-700 whitespace-pre-wrap font-bold">
                    {testResult.expectedOutput}
                  </pre>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="block text-[11px] font-sans font-bold text-slate-500 mb-1">
                    Kết quả do học sinh nhập:
                  </span>
                  <pre className={`${testResult.isMatch ? 'text-emerald-700' : 'text-amber-800'} whitespace-pre-wrap font-bold`}>
                    {testResult.studentOutput || '(Trống)'}
                  </pre>
                </div>
              </div>

              {/* Diagnostic hints */}
              <div className="space-y-1.5">
                <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  Gợi ý chẩn đoán & Hướng dẫn sửa chữa cho học sinh:
                </h5>
                <ul className="space-y-1 text-xs text-slate-700 pl-4 list-disc">
                  {testResult.diagnosticNotes.map((note: string, idx: number) => (
                    <li key={idx} className={note.includes('Tuyệt vời') ? 'text-emerald-700 font-medium' : 'text-slate-800'}>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 shrink-0">
          <span>Hệ thống kiểm thử xác thực AuthentiCode THCS</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Đóng bàn kiểm thử
          </button>
        </div>
      </div>
    </div>
  );
};
