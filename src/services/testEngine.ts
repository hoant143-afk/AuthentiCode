export interface TestExecutionResult {
  isValidInput: boolean;
  inputError?: string;
  expectedOutput: string;
  studentOutput: string;
  isMatch: boolean;
  matchScorePercent: number;
  diagnosticNotes: string[];
  metrics: {
    n: number;
    pages: number[];
    total: number;
    count15: number;
    maxPage?: number;
    average?: string;
    isPass?: boolean;
    conclusion?: 'DAT' | 'CHUA DAT';
  };
}

export function computeTask1Reference(inputStr: string): { output: string; error?: string; metrics: any } {
  const lines = inputStr.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { output: '', error: 'Dữ liệu đầu vào cần ít nhất 2 dòng: dòng 1 là n, dòng 2 là n số nguyên số trang.', metrics: {} };
  }

  const n = parseInt(lines[0], 10);
  if (isNaN(n) || n < 0) {
    return { output: '', error: 'Số ngày n phải là số nguyên không âm.', metrics: {} };
  }

  const parts = lines[1].split(/\s+/).map(p => p.trim()).filter(Boolean);
  if (parts.length !== n) {
    return {
      output: '',
      error: `Số lượng phần tử nhập vào (${parts.length}) không khớp với số ngày n (${n}).`,
      metrics: { n, partsCount: parts.length }
    };
  }

  const pages: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    const val = Number(parts[i]);
    if (!Number.isInteger(val)) {
      return { output: '', error: `Giá trị '${parts[i]}' không phải số nguyên.`, metrics: {} };
    }
    if (val < 0) {
      return { output: '', error: `Số trang ngày thứ ${i + 1} (${val}) không thể là số âm.`, metrics: {} };
    }
    pages.push(val);
  }

  let total = 0;
  let count15 = 0;
  for (const page of pages) {
    total += page;
    if (page >= 15) {
      count15 += 1;
    }
  }

  return {
    output: `${total}\n${count15}`,
    metrics: { n, pages, total, count15 }
  };
}

export function computeTask2Reference(inputStr: string): { output: string; error?: string; metrics: any } {
  return computeTask1Reference(inputStr);
}

export function computeTask3Reference(inputStr: string): { output: string; error?: string; metrics: any } {
  const lines = inputStr.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    if (lines.length === 1 && lines[0] === '0') {
      return {
        output: '0\n0\n0\n0.00\nCHUA DAT',
        metrics: { n: 0, pages: [], total: 0, count15: 0, maxPage: 0, average: '0.00', conclusion: 'CHUA DAT' }
      };
    }
    return { output: '', error: 'Dữ liệu đầu vào cần 2 dòng: dòng 1 là n, dòng 2 là n số trang.', metrics: {} };
  }

  const n = parseInt(lines[0], 10);
  if (isNaN(n) || n < 0) {
    return { output: '', error: 'Số ngày n phải là số nguyên không âm.', metrics: {} };
  }

  if (n === 0) {
    return {
      output: '0\n0\n0\n0.00\nCHUA DAT',
      metrics: { n: 0, pages: [], total: 0, count15: 0, maxPage: 0, average: '0.00', conclusion: 'CHUA DAT' }
    };
  }

  const parts = lines[1].split(/\s+/).map(p => p.trim()).filter(Boolean);
  if (parts.length !== n) {
    return {
      output: '',
      error: `Số lượng phần tử nhập vào (${parts.length}) không khớp với n (${n}).`,
      metrics: { n, partsCount: parts.length }
    };
  }

  const pages: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    const val = Number(parts[i]);
    if (!Number.isInteger(val)) {
      return { output: '', error: `Giá trị '${parts[i]}' không phải số nguyên.`, metrics: {} };
    }
    if (val < 0) {
      return { output: '', error: `Số trang ngày thứ ${i + 1} (${val}) không thể là số âm.`, metrics: {} };
    }
    pages.push(val);
  }

  let total = 0;
  let count15 = 0;
  let maxPage = pages[0];

  for (const page of pages) {
    total += page;
    if (page >= 15) {
      count15 += 1;
    }
    if (page > maxPage) {
      maxPage = page;
    }
  }

  const avgNumber = total / n;
  const average = avgNumber.toFixed(2);
  const isPass = total >= 75 && count15 >= 3;
  const conclusion: 'DAT' | 'CHUA DAT' = isPass ? 'DAT' : 'CHUA DAT';

  const output = `${total}\n${count15}\n${maxPage}\n${average}\n${conclusion}`;

  return {
    output,
    metrics: { n, pages, total, count15, maxPage, average, isPass, conclusion }
  };
}

export function compareOutputs(
  taskNumber: 1 | 2 | 3,
  inputStr: string,
  studentOutputStr: string
): TestExecutionResult {
  const studentNorm = studentOutputStr.trim().replace(/\r\n/g, '\n');

  let refRes: { output: string; error?: string; metrics: any };
  if (taskNumber === 3) {
    refRes = computeTask3Reference(inputStr);
  } else {
    refRes = computeTask1Reference(inputStr);
  }

  if (refRes.error) {
    return {
      isValidInput: false,
      inputError: refRes.error,
      expectedOutput: 'LỖI ĐẦU VÀO',
      studentOutput: studentNorm,
      isMatch: false,
      matchScorePercent: 0,
      diagnosticNotes: [`Đầu vào kiểm thử chưa hợp lệ: ${refRes.error}`],
      metrics: refRes.metrics || {}
    };
  }

  const expectedNorm = refRes.output.trim().replace(/\r\n/g, '\n');
  const expectedLines = expectedNorm.split('\n').map(l => l.trim());
  const studentLines = studentNorm.split('\n').map(l => l.trim()).filter(Boolean);

  const diagnosticNotes: string[] = [];
  let matchingLines = 0;

  if (taskNumber === 1 || taskNumber === 2) {
    // Expect 2 lines: total, count15
    if (studentLines.length < 2) {
      diagnosticNotes.push(`Kết quả của em thiếu dòng (xuất ${studentLines.length}/2 dòng mong đợi: Tổng trang, Số ngày >= 15).`);
    } else {
      // Check line 1: Total
      if (studentLines[0] === expectedLines[0]) {
        matchingLines++;
      } else {
        diagnosticNotes.push(`Dòng 1 (Tổng số trang): Em xuất '${studentLines[0]}', kết quả chuẩn là '${expectedLines[0]}'. Kiểm tra biến cộng dồn hoặc vòng lặp.`);
      }

      // Check line 2: Count >= 15
      if (studentLines[1] === expectedLines[1]) {
        matchingLines++;
      } else {
        diagnosticNotes.push(`Dòng 2 (Số ngày >= 15): Em xuất '${studentLines[1]}', kết quả chuẩn là '${expectedLines[1]}'. Chú ý điều kiện biên: đề bài yêu cầu 'ít nhất 15 trang' (dùng >= 15 thay vì > 15).`);
      }
    }
  } else {
    // Task 3: 5 lines (Total, Count15, Max, Avg, Conclusion)
    if (studentLines.length < 5) {
      diagnosticNotes.push(`Kết quả thiếu dòng (xuất ${studentLines.length}/5 dòng mong đợi). Cần xuất: Tổng, Số ngày >=15, Max, Trung bình (2 chữ số thập phân), DAT/CHUA DAT.`);
    } else {
      if (studentLines[0] === expectedLines[0]) matchingLines++;
      else diagnosticNotes.push(`Dòng 1 (Tổng): '${studentLines[0]}' khác chuẩn '${expectedLines[0]}'.`);

      if (studentLines[1] === expectedLines[1]) matchingLines++;
      else diagnosticNotes.push(`Dòng 2 (Số ngày >= 15): '${studentLines[1]}' khác chuẩn '${expectedLines[1]}'.`);

      if (studentLines[2] === expectedLines[2]) matchingLines++;
      else diagnosticNotes.push(`Dòng 3 (Max): '${studentLines[2]}' khác chuẩn '${expectedLines[2]}'. Kiểm tra giá trị khởi tạo max_page.`);

      if (studentLines[3] === expectedLines[3]) matchingLines++;
      else {
        diagnosticNotes.push(`Dòng 4 (Trung bình): '${studentLines[3]}' khác chuẩn '${expectedLines[3]}'. Lưu ý định dạng đúng 2 chữ số thập phân (ví dụ 15.00 thay vì 15.0 hay 15).`);
      }

      if (studentLines[4].toUpperCase() === expectedLines[4].toUpperCase()) matchingLines++;
      else {
        diagnosticNotes.push(`Dòng 5 (Kết luận): '${studentLines[4]}' khác chuẩn '${expectedLines[4]}'. Điều kiện DAT yêu cầu ĐỒNG THỜI (Tổng >= 75 AND Số ngày >= 15 ít nhất là 3).`);
      }
    }
  }

  const totalLines = expectedLines.length;
  const matchScorePercent = Math.round((matchingLines / totalLines) * 100);
  const isMatch = studentNorm === expectedNorm;

  if (isMatch) {
    diagnosticNotes.unshift('Tuyệt vời! Kết quả chạy hoàn toàn khớp với thuật toán chuẩn.');
  }

  return {
    isValidInput: true,
    expectedOutput: expectedNorm,
    studentOutput: studentNorm,
    isMatch,
    matchScorePercent,
    diagnosticNotes,
    metrics: refRes.metrics
  };
}
