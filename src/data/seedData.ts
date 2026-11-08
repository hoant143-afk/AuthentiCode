import { AssessmentTask, RubricCriterion, ClassGroup, Student, Submission, Evaluation, TaskAssignment } from '../types';

export const AUTHENTIC_TASKS: AssessmentTask[] = [
  {
    id: 'task-1',
    taskNumber: 1,
    title: 'Nhiệm vụ 1: Lập trình độc lập – Theo dõi số trang đọc sách (7 ngày)',
    subtitle: 'KHÔNG SỬ DỤNG AI – Đánh giá năng lực giải quyết vấn đề độc lập',
    objective: 'Xác định năng lực phân tích đề, thiết kế thuật toán, viết mã nguồn và kiểm thử cơ bản mà không có sự trợ giúp của AI.',
    aiMode: 'none',
    aiLevel: 'T1',
    aiModeLabel: 'Nghiêm cấm dùng AI (T1)',
    status: 'assigned',
    createdAt: '2026-11-01T08:00:00Z',
    updatedAt: '2026-11-01T08:00:00Z',
    authorTeacherId: 'user-bongnguyen',
    authorTeacherName: 'Cô Bống Nguyễn',
    problemStatement: `Một học sinh ghi lại số trang sách đã đọc trong 7 ngày liên tiếp.
Em hãy viết một chương trình Python để:
1. Nhập vào số trang sách đã đọc trong từng ngày (7 số nguyên không âm).
2. Tính tổng số trang sách học sinh đó đã đọc trong 7 ngày.
3. Đếm số ngày học sinh đọc được ít nhất 15 trang (nghĩa là số trang >= 15).

Dữ liệu đầu vào:
- Dòng 1: Số nguyên 7 (số ngày).
- Dòng 2: 7 số nguyên cách nhau bởi dấu cách, biểu thị số trang sách mỗi ngày.

Dữ liệu đầu ra:
- Dòng 1: Tổng số trang đã đọc.
- Dòng 2: Số ngày đọc được ít nhất 15 trang.`,
    sampleInput: `7\n12 15 20 0 18 4 15`,
    sampleOutput: `84\n4`,
    requirements: [
      'Phân tích dữ liệu đầu vào (Input) và dữ liệu đầu ra (Output).',
      'Xây dựng thuật toán hoặc giả mã (pseudocode) trước khi viết mã Python.',
      'Viết mã nguồn Python hoàn chỉnh và có chú thích rõ ràng.',
      'Xây dựng ít nhất 03 test case tự kiểm thử (bao gồm trường hợp thông thường và trường hợp biên = 15).',
      'Viết giải thích chi tiết cách chương trình hoạt động từng bước.',
      'Bản tự đánh giá mức độ hiểu biết của bản thân.'
    ],
    mandatoryTestCases: [
      {
        input: '7\n12 15 20 0 18 4 15',
        expectedOutput: '84\n4',
        description: 'Test case mẫu thông thường'
      },
      {
        input: '7\n15 15 15 15 15 15 15',
        expectedOutput: '105\n7',
        description: 'Test case tất cả các ngày đều đạt mốc biên 15'
      },
      {
        input: '7\n0 14 10 5 0 2 14',
        expectedOutput: '45\n0',
        description: 'Test case không có ngày nào đạt từ 15 trang trở lên'
      }
    ],
    allowedAIPromptingRules: 'Trong Nhiệm vụ 1, trợ lý AI bị vô hiệu hóa hoàn toàn trên hệ thống. Học sinh phải tự tư duy và lập trình độc lập.'
  },
  {
    id: 'task-2',
    taskNumber: 2,
    title: 'Nhiệm vụ 2: Phát hiện, giải thích và sửa lỗi chương trình đọc sách',
    subtitle: 'SỬ DỤNG AI CÓ GIỚI HẠN – AI chỉ đóng vai trò gợi mở sư phạm',
    objective: 'Đánh giá năng lực đọc hiểu mã nguồn có sẵn, dự đoán kết quả, phát hiện lỗi logic tiềm ẩn, dùng AI có định hướng và sửa chữa chương trình.',
    aiMode: 'guided_hints_only',
    aiLevel: 'T2',
    aiModeLabel: 'AI gợi mở sư phạm (T2)',
    status: 'assigned',
    createdAt: '2026-11-01T08:00:00Z',
    updatedAt: '2026-11-01T08:00:00Z',
    authorTeacherId: 'user-bongnguyen',
    authorTeacherName: 'Cô Bống Nguyễn',
    problemStatement: `Cho một chương trình Python do một bạn học sinh viết để tính tổng số trang đọc trong n ngày và đếm số ngày đọc >= 15 trang.
Tuy nhiên, chương trình này đang chứa HAI LỖI LOGIC:
- Lỗi 1: Vòng lặp bỏ qua phần tử cuối cùng của danh sách.
- Lỗi 2: Điều kiện so sánh dùng nhầm dấu '> 15' thay vì '>= 15'.

Chương trình lỗi ban đầu:
\`\`\`python
# Chương trình đang có lỗi logic
n = int(input())
pages = list(map(int, input().split()))

total = 0
count_15 = 0

# Vòng lặp duyệt qua các ngày
for i in range(n - 1): # Lỗi logic 1
    total += pages[i]
    if pages[i] > 15:   # Lỗi logic 2
        count_15 += 1

print(total)
print(count_15)
\`\`\`

Yêu cầu thực hiện:
1. Đọc mã nguồn và dự đoán kết quả trước khi chạy.
2. Xác định chính xác vị trí và nguyên nhân gây ra 2 lỗi logic trên.
3. Nếu cần, học sinh có thể đặt câu hỏi cho Gemini. AI sẽ chỉ đặt câu hỏi gợi mở, hướng dẫn kiểm tra điều kiện biên hoặc vòng lặp, tuyệt đối KHÔNG cung cấp mã hoàn chỉnh.
4. Tự sửa chương trình thành mã đúng.
5. Kiểm thử lại với ít nhất 4 test case, trong đó có test case bắt buộc (n = 1, trang = 15).
6. Ghi nhật ký tương tác AI và tự đánh giá.`,
    sampleInput: `1\n15`,
    sampleOutput: `15\n1`,
    starterCode: `# Chương trình lỗi ban đầu cần sửa:
n = int(input())
pages = list(map(int, input().split()))

total = 0
count_15 = 0

for i in range(n - 1):
    total += pages[i]
    if pages[i] > 15:
        count_15 += 1

print(total)
print(count_15)`,
    requirements: [
      'Ghi lại mã nguồn trước khi sửa và sau khi sửa.',
      'Giải thích chi tiết nguyên nhân gây lỗi của từng dòng mã có vấn đề.',
      'Giải thích vì sao vòng lặp range(n-1) và điều kiện >15 lại dẫn đến sai lệch kết quả.',
      'Xây dựng ít nhất 04 test case kiểm thử (BẮT BUỘC có test case n=1, trang=15).',
      'Ghi nhật ký tương tác với trợ lý AI (các câu hỏi gợi mở của AI đã giúp em như thế nào).',
      'Tự đánh giá năng lực sửa lỗi của bản thân.'
    ],
    mandatoryTestCases: [
      {
        input: '1\n15',
        expectedOutput: '15\n1',
        description: 'Test case BẮT BUỘC: n = 1, trang = 15 (bộc lộ cả 2 lỗi logic)'
      },
      {
        input: '3\n10 15 20',
        expectedOutput: '45\n2',
        description: 'Kiểm tra biên 15 ở giữa và phần tử cuối cùng 20'
      },
      {
        input: '4\n15 15 15 15',
        expectedOutput: '60\n4',
        description: 'Tất cả các phần tử bằng 15'
      },
      {
        input: '2\n0 0',
        expectedOutput: '0\n0',
        description: 'Giá trị 0 toàn bộ'
      }
    ],
    allowedAIPromptingRules: 'Gemini chỉ được đóng vai trò giáo viên gợi mở Socratic. Chỉ hỏi học sinh xem hàm range() chạy từ đâu đến đâu, và sự khác nhau giữa > 15 và >= 15 khi gặp đúng số 15.'
  },
  {
    id: 'task-3',
    taskNumber: 3,
    title: 'Nhiệm vụ 3: Đánh giá, phản biện và cải tiến giải pháp Python do GenAI đề xuất',
    subtitle: 'BẮT BUỘC SỬ DỤNG AI & CÔNG KHAI – Làm chủ giải pháp, kiểm chứng và bảo vệ',
    objective: 'Đánh giá năng lực thiết kế prompt, kiểm chứng tính đúng đắn của mã nguồn do AI sinh ra, phát hiện trường hợp biên mà AI có thể bỏ sót, cải tiến mã nguồn và bảo vệ sản phẩm.',
    aiMode: 'open_with_disclosure',
    aiLevel: 'T3',
    aiModeLabel: 'Bắt buộc dùng AI & Minh bạch (T3)',
    status: 'assigned',
    createdAt: '2026-11-01T08:00:00Z',
    updatedAt: '2026-11-01T08:00:00Z',
    authorTeacherId: 'user-bongnguyen',
    authorTeacherName: 'Cô Bống Nguyễn',
    problemStatement: `Bài toán nâng cao theo dõi đọc sách:
Nhập vào số nguyên dương n (số ngày) và danh sách n số nguyên không âm biểu thị số trang đọc mỗi ngày.
Chương trình Python cần xuất ra 5 thông tin:
1. Tổng số trang sách đã đọc trong n ngày.
2. Số ngày đọc được ít nhất 15 trang (>= 15).
3. Số trang sách đọc được nhiều nhất trong một ngày (Max).
4. Số trang đọc trung bình mỗi ngày (định dạng đúng 2 chữ số thập phân, ví dụ: 15.00).
5. Kết luận đánh giá: Xuất ra "DAT" nếu đáp ứng ĐỒNG THỜI 2 điều kiện:
   - Tổng số trang đọc được ít nhất 75 trang.
   - Có ít nhất 3 ngày đọc từ 15 trang trở lên.
   Ngược lại, xuất ra "CHUA DAT".

Yêu cầu thực hiện với GenAI:
1. Viết prompt để yêu cầu AI sinh mã nguồn Python giải quyết bài toán trên.
2. Lưu lại toàn bộ nội dung phản hồi từ AI (mã nguồn AI cung cấp).
3. Kiểm tra tính đúng đắn của giải pháp: Xây dựng ít nhất 05 test case kỹ thuật.
4. Phát hiện hạn chế, lỗi tiềm ẩn của mã AI (ví dụ: trường hợp n=0 gây chia cho 0 khi tính trung bình, lỗi định dạng số thập phân, hoặc điều kiện kết luận AND/OR).
5. Cải tiến và tối ưu chương trình, thêm xử lý ngoại lệ và chú thích.
6. Minh bạch công khai: Công cụ AI, Prompt, Phản hồi, Nội dung kiểm chứng, Nội dung tự cải tiến, và trả lời câu hỏi vấn đáp của giáo viên.
*(Lưu ý: Nếu học sinh không có tài khoản AI ngoài, giáo viên sẽ cấp mẫu phản hồi AI chuẩn để học sinh kiểm chứng).*`,
    sampleInput: `5\n15 15 15 20 10`,
    sampleOutput: `75\n4\n20\n15.00\nDAT`,
    requirements: [
      'Công khai công cụ AI, nội dung Prompt đã gửi và toàn bộ phản hồi từ AI.',
      'Chỉ ra ít nhất 01 điểm hạn chế hoặc trường hợp biên mà mã ban đầu của AI xử lý chưa tối ưu.',
      'Mã nguồn Python hoàn chỉnh sau khi học sinh đã kiểm chứng và tự tay cải tiến.',
      'Bộ test case gồm ít nhất 05 ca kiểm thử bao quát các tình huống biên (Tổng = 75, chỉ có 2 ngày >= 15, số lẻ thập phân, v.v.).',
      'Bản giải thích phần đóng góp thực tế của bản thân học sinh so với bản gốc của AI.',
      'Chuẩn bị câu trả lời cho các câu hỏi vấn đáp bảo vệ sản phẩm trước giáo viên.'
    ],
    mandatoryTestCases: [
      {
        input: '5\n15 15 15 20 10',
        expectedOutput: '75\n4\n20\n15.00\nDAT',
        description: 'Test case mẫu: Tổng 75, 4 ngày >=15, max 20, avg 15.00 -> DAT'
      },
      {
        input: '4\n50 25 0 0',
        expectedOutput: '75\n2\n50\n18.75\nCHUA DAT',
        description: 'Tổng đạt 75 nhưng chỉ có 2 ngày >= 15 -> CHUA DAT'
      },
      {
        input: '3\n20 20 20',
        expectedOutput: '60\n3\n20\n20.00\nCHUA DAT',
        description: 'Đủ 3 ngày >= 15 nhưng tổng mới đạt 60 (< 75) -> CHUA DAT'
      },
      {
        input: '1\n100',
        expectedOutput: '100\n1\n100\n100.00\nCHUA DAT',
        description: 'n = 1, tổng 100 nhưng chỉ có 1 ngày -> CHUA DAT'
      },
      {
        input: '6\n15 15 15 15 10 5',
        expectedOutput: '75\n4\n15\n12.50\nDAT',
        description: 'Biên tổng = 75, trung bình 12.50, 4 ngày >= 15 -> DAT'
      }
    ],
    allowedAIPromptingRules: 'Học sinh được phép yêu cầu AI giải bài, nhưng bắt buộc phải lưu toàn bộ lịch sử Prompt & Response vào hệ thống và chứng minh năng lực kiểm chứng mã nguồn.'
  }
];

export const RUBRIC_CRITERIA: RubricCriterion[] = [
  {
    id: 'R1',
    code: 'R1',
    name: 'Phân tích bài toán',
    weight: 0.15,
    weightPercentText: '15%',
    levels: [
      {
        level: 0,
        label: 'Mức 0: Không có minh chứng',
        scoreRatio: 0,
        description: 'Hoàn toàn không có dữ liệu phân tích bài toán (bắt buộc giáo viên ghi lý do cụ thể).'
      },
      {
        level: 1,
        label: 'Mức 1: Chưa đáp ứng',
        scoreRatio: 0.25,
        description: 'Xác định sai hoặc rất mơ hồ về Input và Output; không nêu được các mối quan hệ logic hoặc điều kiện ràng buộc giữa các biến.'
      },
      {
        level: 2,
        label: 'Mức 2: Đáp ứng một phần',
        scoreRatio: 0.50,
        description: 'Nêu được Input và Output cơ bản nhưng còn thiếu các ràng buộc biên (ví dụ: mốc số trang >= 15, tổng >= 75 hoặc điều kiện n ngày).'
      },
      {
        level: 3,
        label: 'Mức 3: Đáp ứng tốt',
        scoreRatio: 0.75,
        description: 'Xác định rõ ràng kiểu dữ liệu, các đại lượng đầu vào, kết quả cần tính toán và các điều kiện logic của bài toán.'
      },
      {
        level: 4,
        label: 'Mức 4: Đáp ứng đầy đủ, vận dụng',
        scoreRatio: 1.0,
        description: 'Phân tích thấu đáo, mô tả toàn diện Input/Output, xác định chính xác các trường hợp biên, các ngoại lệ tiềm ẩn và mối liên kết logic chặt chẽ.'
      }
    ]
  },
  {
    id: 'R2',
    code: 'R2',
    name: 'Thiết kế thuật toán',
    weight: 0.20,
    weightPercentText: '20%',
    levels: [
      {
        level: 0,
        label: 'Mức 0: Không có minh chứng',
        scoreRatio: 0,
        description: 'Hoàn toàn không có giả mã, lưu đồ hoặc mô tả thuật toán (bắt buộc ghi lý do).'
      },
      {
        level: 1,
        label: 'Mức 1: Chưa đáp ứng',
        scoreRatio: 0.25,
        description: 'Không có cấu trúc thuật toán rõ ràng, các bước lộn xộn, sai lệch hoàn toàn về vòng lặp hoặc cấu trúc rẽ nhánh.'
      },
      {
        level: 2,
        label: 'Mức 2: Đáp ứng một phần',
        scoreRatio: 0.50,
        description: 'Mô tả được các bước tuần tự nhưng còn sơ sài, thiếu bước khởi tạo biến tích lũy/đếm hoặc chưa chỉ rõ điều kiện dừng vòng lặp.'
      },
      {
        level: 3,
        label: 'Mức 3: Đáp ứng tốt',
        scoreRatio: 0.75,
        description: 'Thiết kế thuật toán/giả mã mạch lạc, có bước khởi tạo, vòng lặp duyệt hợp lý và điều kiện rẽ nhánh chính xác.'
      },
      {
        level: 4,
        label: 'Mức 4: Đáp ứng đầy đủ, vận dụng',
        scoreRatio: 1.0,
        description: 'Thuật toán tối ưu, logic cấu trúc rõ ràng, thể hiện tư duy phân tách bài toán thành các khối xử lý độc lập và xử lý trọn vẹn mọi điều kiện biên.'
      }
    ]
  },
  {
    id: 'R3',
    code: 'R3',
    name: 'Lập trình và kiểm thử',
    weight: 0.25,
    weightPercentText: '25%',
    levels: [
      {
        level: 0,
        label: 'Mức 0: Không có minh chứng',
        scoreRatio: 0,
        description: 'Không nộp mã nguồn Python hoặc mã không thể biên dịch/chạy (bắt buộc ghi lý do).'
      },
      {
        level: 1,
        label: 'Mức 1: Chưa đáp ứng',
        scoreRatio: 0.25,
        description: 'Mã nguồn mắc nhiều lỗi cú pháp, không thực thi được; không có test case kiểm thử hoặc test case không khớp với bài toán.'
      },
      {
        level: 2,
        label: 'Mức 2: Đáp ứng một phần',
        scoreRatio: 0.50,
        description: 'Mã chạy được trên test case thông thường nhưng sai ở các trường hợp biên; test case tự lập còn sơ sài (dưới số lượng yêu cầu).'
      },
      {
        level: 3,
        label: 'Mức 3: Đáp ứng tốt',
        scoreRatio: 0.75,
        description: 'Mã chạy đúng các yêu cầu chính, vượt qua test case mẫu và các test case thông thường; có ít nhất số lượng test case theo quy định.'
      },
      {
        level: 4,
        label: 'Mức 4: Đáp ứng đầy đủ, vận dụng',
        scoreRatio: 1.0,
        description: 'Mã nguồn trong sáng, chuẩn Python PEP8, có chú thích hữu ích; vượt qua toàn bộ 12 test case kỹ thuật (kể cả biên n=1, tổng=75, số 0).'
      }
    ]
  },
  {
    id: 'R4',
    code: 'R4',
    name: 'Giải thích và bảo vệ sản phẩm',
    weight: 0.20,
    weightPercentText: '20%',
    levels: [
      {
        level: 0,
        label: 'Mức 0: Không có minh chứng',
        scoreRatio: 0,
        description: 'Học sinh từ chối trả lời hoặc hoàn toàn không thể giải thích bất kỳ dòng lệnh nào trong bài nộp (bắt buộc ghi lý do).'
      },
      {
        level: 1,
        label: 'Mức 1: Chưa đáp ứng',
        scoreRatio: 0.25,
        description: 'Chỉ đọc lại từng chữ trong mã nguồn; không giải thích được vì sao biến thay đổi giá trị hoặc không trả lời được câu hỏi cơ bản của giáo viên.'
      },
      {
        level: 2,
        label: 'Mức 2: Đáp ứng một phần',
        scoreRatio: 0.50,
        description: 'Hiểu được ý nghĩa chung của chương trình nhưng lúng túng khi giải thích các dòng lệnh then chốt (như phép AND, range(), hoặc định dạng số thập phân).'
      },
      {
        level: 3,
        label: 'Mức 3: Đáp ứng tốt',
        scoreRatio: 0.75,
        description: 'Giải thích tự tin cách luồng dữ liệu di chuyển trong mã; trả lời đúng đa số các câu hỏi vấn đáp của giáo viên.'
      },
      {
        level: 4,
        label: 'Mức 4: Đáp ứng đầy đủ, vận dụng',
        scoreRatio: 1.0,
        description: 'Làm chủ hoàn toàn mã nguồn; lý giải sâu sắc nguyên nhân sử dụng cấu trúc lệnh, chứng minh được quyền sở hữu trí tuệ và bảo vệ thuyết phục giải pháp.'
      }
    ]
  },
  {
    id: 'R5',
    code: 'R5',
    name: 'Phản tư quá trình & Tự sửa lỗi',
    weight: 0.10,
    weightPercentText: '10%',
    levels: [
      {
        level: 0,
        label: 'Mức 0: Không có minh chứng',
        scoreRatio: 0,
        description: 'Không có phần tự đánh giá và không ghi nhận bất kỳ quá trình phát hiện/sửa lỗi nào (bắt buộc ghi lý do).'
      },
      {
        level: 1,
        label: 'Mức 1: Chưa đáp ứng',
        scoreRatio: 0.25,
        description: 'Tự đánh giá hình thức, qua loa; không nhận biết được các khó khăn hoặc các lỗi mình đã gặp phải trong quá trình làm bài.'
      },
      {
        level: 2,
        label: 'Mức 2: Đáp ứng một phần',
        scoreRatio: 0.50,
        description: 'Chỉ ra được lỗi sai khi có người khác nhắc nhở; giải thích lỗi còn mơ hồ nhưng có nỗ lực tự sửa chữa.'
      },
      {
        level: 3,
        label: 'Mức 3: Đáp ứng tốt',
        scoreRatio: 0.75,
        description: 'Tự phát hiện được lỗi logic thông qua việc chạy thử test case; trình bày rõ ràng nguyên nhân và bài học rút ra.'
      },
      {
        level: 4,
        label: 'Mức 4: Đáp ứng đầy đủ, vận dụng',
        scoreRatio: 1.0,
        description: 'Phản tư sâu sắc về chiến lược tư duy; có khả năng khái quát hóa nguyên nhân lỗi (như lỗi Off-by-one, lỗi phép so sánh) để không tái phạm.'
      }
    ]
  },
  {
    id: 'R6',
    code: 'R6',
    name: 'Sử dụng AI có trách nhiệm',
    weight: 0.10,
    weightPercentText: '10%',
    levels: [
      {
        level: 0,
        label: 'Mức 0: Không có minh chứng',
        scoreRatio: 0,
        description: 'Gian dối về việc sử dụng AI (ví dụ: dùng AI trong Nhiệm vụ 1 nhưng phủ nhận, hoặc không công khai minh chứng trong Nhiệm vụ 3).'
      },
      {
        level: 1,
        label: 'Mức 1: Chưa đáp ứng',
        scoreRatio: 0.25,
        description: 'Sao chép nguyên văn mã do AI sinh ra mà không hiểu; không ghi nhật ký AI hoặc nhật ký trống rỗng không có giá trị đối chiếu.'
      },
      {
        level: 2,
        label: 'Mức 2: Đáp ứng một phần',
        scoreRatio: 0.50,
        description: 'Có ghi chép prompt và phản hồi AI nhưng chưa kiểm chứng cẩn thận; tin tưởng hoàn toàn vào mã của AI mà không chạy test case độc lập.'
      },
      {
        level: 3,
        label: 'Mức 3: Đáp ứng tốt',
        scoreRatio: 0.75,
        description: 'Tuân thủ đúng quy định sử dụng AI theo từng nhiệm vụ; công khai trung thực Prompt và Response; có kiểm chứng lại kết quả bằng test case.'
      },
      {
        level: 4,
        label: 'Mức 4: Đáp ứng đầy đủ, vận dụng',
        scoreRatio: 1.0,
        description: 'Sử dụng AI như một cộng sự tư duy; thiết kế prompt thông minh, phản biện và cải tiến chủ động mã của AI; phân định rạch ròi đóng góp của bản thân.'
      }
    ]
  }
];

export const ORAL_DEFENSE_QUESTIONS = [
  {
    id: 'Q1',
    questionText: 'Vì sao trong điều kiện đếm ngày đọc sách, em sử dụng phép so sánh ">= 15" thay vì "> 15"?',
    category: 'Điều kiện logic & Biên',
    idealAnswerGuidelines: 'Học sinh phải nêu được đề bài yêu cầu "ít nhất 15 trang", nghĩa là bao gồm cả trường hợp đọc đúng 15 trang. Nếu dùng > 15 thì ngày đọc đúng 15 trang sẽ bị bỏ qua không đếm.',
    targetCriterion: 'R4'
  },
  {
    id: 'Q2',
    questionText: 'Điều gì sẽ xảy ra nếu dữ liệu đầu vào chỉ có 1 ngày (n = 1)? Em đã thiết kế chương trình để xử lý trường hợp này như thế nào?',
    category: 'Trường hợp biên đặc biệt',
    idealAnswerGuidelines: 'Học sinh phân tích vòng lặp duyệt 1 phần tử (chỉ số 0), tổng bằng chính số trang ngày đó, và nếu trang >= 15 thì đếm được 1; chương trình không bị lỗi Index out of range hay lỗi lặp rỗng.',
    targetCriterion: 'R4'
  },
  {
    id: 'Q3',
    questionText: 'Trong Nhiệm vụ 2, vì sao dòng lệnh "range(n - 1)" lại khiến chương trình bỏ sót dữ liệu của ngày cuối cùng?',
    category: 'Phân tích lỗi lập trình',
    idealAnswerGuidelines: 'Học sinh giải thích hàm range(start, stop) trong Python chỉ chạy đến stop - 1. Nếu viết range(n - 1), giá trị lớn nhất chỉ là n - 2, trong khi mảng có n phần tử với chỉ số từ 0 đến n - 1. Do đó phần tử pages[n-1] không bao giờ được duyệt.',
    targetCriterion: 'R5'
  },
  {
    id: 'Q4',
    questionText: 'Em đã xây dựng các test case như thế nào để chắc chắn chương trình của mình hoạt động chính xác?',
    category: 'Chiến lược kiểm thử',
    idealAnswerGuidelines: 'Học sinh trình bày phương pháp kiểm thử hộp đen: chọn ca thông thường, ca giá trị đúng bằng biên 15, ca toàn số 0, ca đạt tổng 75 nhưng không đủ 3 ngày, và ca n nhỏ/lớn.',
    targetCriterion: 'R3'
  },
  {
    id: 'Q5',
    questionText: 'Vì sao trong Nhiệm vụ 3, điều kiện để kết luận "DAT" bắt buộc phải sử dụng phép toán logic "AND" mà không phải "OR"?',
    category: 'Toán tử logic',
    idealAnswerGuidelines: 'Đề bài yêu cầu thoả mãn ĐỒNG THỜI 2 tiêu chí: Tổng >= 75 VÀ có ít nhất 3 ngày >= 15. Nếu dùng OR, chỉ cần đạt 1 trong 2 (ví dụ 1 ngày đọc 100 trang dù các ngày khác 0) cũng được DAT là sai yêu cầu.',
    targetCriterion: 'R4'
  },
  {
    id: 'Q6',
    questionText: 'Trong Nhiệm vụ 3, sau khi nhận được đoạn mã do AI đề xuất, em đã phát hiện thấy hạn chế nào và tự mình sửa đổi những phần nào?',
    category: 'Làm chủ AI & Quyền tác giả',
    idealAnswerGuidelines: 'Học sinh chỉ ra cụ thể: AI ban đầu có thể chưa định dạng 2 chữ số thập phân, hoặc không kiểm tra n <= 0, hoặc đặt tên biến khó hiểu. Học sinh chứng minh được chính mình đã thêm test case và tinh chỉnh mã.',
    targetCriterion: 'R6'
  },
  {
    id: 'Q7',
    questionText: 'Nếu bây giờ thầy/cô đổi yêu cầu thành: "Đếm số ngày đọc ít nhất 20 trang và tổng tối thiểu 100", em sẽ sửa những dòng nào trong mã nguồn?',
    category: 'Vận dụng & Chuyển giao tri thức',
    idealAnswerGuidelines: 'Học sinh chỉ ngay vào hằng số 15 đổi thành 20, mốc tổng 75 đổi thành 100, mà không cần xem lại từ đầu hay nhờ AI viết lại toàn bộ.',
    targetCriterion: 'R4'
  },
  {
    id: 'Q8',
    questionText: 'Em hãy chỉ vào màn hình và giải thích ý nghĩa, nhiệm vụ của từng khối lệnh trong chương trình này?',
    category: 'Quyền sở hữu hiểu biết',
    idealAnswerGuidelines: 'Học sinh giải thích trôi chảy: khối nhập dữ liệu (input), khối khởi tạo biến (total, count), khối vòng lặp duyệt tính toán, và khối xuất kết quả (print với định dạng).',
    targetCriterion: 'R4'
  }
];

export const TECHNICAL_TEST_CASES = [
  {
    id: 'TC-01',
    name: '1. Dữ liệu thông thường',
    input: '7\n12 15 20 0 18 4 15',
    description: '7 ngày đọc sách thông thường có cả ngày >= 15 và < 15',
    expectedOutputT1: '84\n4',
    expectedOutputT3: '84\n4\n20\n12.00\nDAT'
  },
  {
    id: 'TC-02',
    name: '2. Giá trị bằng 15 (Biên 15)',
    input: '5\n15 15 15 15 15',
    description: 'Tất cả các ngày đều đạt đúng mốc biên 15',
    expectedOutputT1: '75\n5',
    expectedOutputT3: '75\n5\n15\n15.00\nDAT'
  },
  {
    id: 'TC-03',
    name: '3. n = 1 (1 ngày đọc)',
    input: '1\n15',
    description: 'Trường hợp chỉ có duy nhất 1 ngày, đọc đúng 15 trang',
    expectedOutputT1: '15\n1',
    expectedOutputT3: '15\n1\n15\n15.00\nCHUA DAT'
  },
  {
    id: 'TC-04',
    name: '4. n = 30 (Một tháng 30 ngày)',
    input: '30\n10 12 15 20 18 22 25 30 15 14 16 18 20 22 15 10 12 14 16 18 20 22 24 26 28 30 15 12 10 8',
    description: 'Dữ liệu dài 30 ngày đọc với số lượng phần tử lớn',
    expectedOutputT1: '520\n21',
    expectedOutputT3: '520\n21\n30\n17.33\nDAT'
  },
  {
    id: 'TC-05',
    name: '5. Toàn bộ giá trị bằng 0',
    input: '7\n0 0 0 0 0 0 0',
    description: 'Học sinh không đọc trang nào trong suốt 7 ngày',
    expectedOutputT1: '0\n0',
    expectedOutputT3: '0\n0\n0\n0.00\nCHUA DAT'
  },
  {
    id: 'TC-06',
    name: '6. Tổng đúng bằng 75 (Biên DAT)',
    input: '5\n15 15 15 15 15',
    description: 'Tổng đạt chính xác 75 và có 5 ngày >= 15 -> DAT',
    expectedOutputT1: '75\n5',
    expectedOutputT3: '75\n5\n15\n15.00\nDAT'
  },
  {
    id: 'TC-07',
    name: '7. Tổng đạt 75 nhưng không đủ 3 ngày >= 15',
    input: '4\n50 25 0 0',
    description: 'Tổng 75 nhưng chỉ có 2 ngày đạt >= 15 -> Vi phạm điều kiện kép -> CHUA DAT',
    expectedOutputT1: '75\n2',
    expectedOutputT3: '75\n2\n50\n18.75\nCHUA DAT'
  },
  {
    id: 'TC-08',
    name: '8. Dữ liệu có số lượng phần tử sai',
    input: '5\n10 20 15',
    description: 'Đầu vào khai báo n = 5 nhưng chỉ nhập 3 số (kiểm tra khả năng bắt lỗi dữ liệu)',
    expectedOutputT1: 'LOI_DU_LIEU_THIEU_SO_NGAY',
    expectedOutputT3: 'LOI_DU_LIEU_THIEU_SO_NGAY'
  },
  {
    id: 'TC-09',
    name: '9. n = 0 (Số ngày bằng 0)',
    input: '0\n',
    description: 'n = 0 không hợp lệ hoặc không có ngày nào (tránh lỗi chia cho 0)',
    expectedOutputT1: '0\n0',
    expectedOutputT3: '0\n0\n0\n0.00\nCHUA DAT'
  },
  {
    id: 'TC-10',
    name: '10. n lớn hơn 30 (Vượt quá giới hạn tháng)',
    input: '35\n10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10',
    description: 'Số ngày vượt 30 ngày (kiểm tra thông báo cảnh báo hoặc xử lý mở rộng)',
    expectedOutputT1: '350\n0',
    expectedOutputT3: '350\n0\n10\n10.00\nCHUA DAT'
  },
  {
    id: 'TC-11',
    name: '11. Giá trị âm (< 0)',
    input: '3\n15 -5 20',
    description: 'Số trang sách không thể là số âm (kiểm tra tính hợp lệ dữ liệu)',
    expectedOutputT1: 'LOI_SO_TRANG_AM',
    expectedOutputT3: 'LOI_SO_TRANG_AM'
  },
  {
    id: 'TC-12',
    name: '12. Giá trị không phải số nguyên (Ký tự chữ / số thực)',
    input: '3\n15 abc 20',
    description: 'Đầu vào chứa ký tự không thể ép kiểu sang số nguyên',
    expectedOutputT1: 'LOI_KHONG_PHAI_SO_NGUYEN',
    expectedOutputT3: 'LOI_KHONG_PHAI_SO_NGUYEN'
  }
];

export const INITIAL_CLASSES: ClassGroup[] = [
  {
    id: 'class-8a1',
    name: 'Lớp 8A1',
    grade: 8,
    academicYear: '2025-2026',
    classCode: '8A1-2026',
    teacherId: 'teacher-nguyen-van-a',
    teacherName: 'Thầy Nguyễn Văn An',
    studentCount: 5,
    createdAt: '2026-09-05T08:00:00Z'
  },
  {
    id: 'class-8a2',
    name: 'Lớp 8A2',
    grade: 8,
    academicYear: '2025-2026',
    classCode: '8A2-2026',
    teacherId: 'teacher-nguyen-van-a',
    teacherName: 'Thầy Nguyễn Văn An',
    studentCount: 3,
    createdAt: '2026-09-05T08:30:00Z'
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'student-01',
    classId: 'class-8a1',
    studentCode: 'HS01',
    fullName: 'Trần Minh Khang',
    sessionCode: 'AUTH-8A1-4921',
    sessionExpiresAt: '2026-12-31T23:59:59Z',
    notes: 'Học sinh năng khiếu, tư duy thuật toán tốt'
  },
  {
    id: 'student-02',
    classId: 'class-8a1',
    studentCode: 'HS02',
    fullName: 'Lê Thảo Nguyên',
    sessionCode: 'AUTH-8A1-7732',
    sessionExpiresAt: '2026-12-31T23:59:59Z',
    notes: 'Cần chú ý kiểm tra điều kiện biên'
  },
  {
    id: 'student-03',
    classId: 'class-8a1',
    studentCode: 'HS03',
    fullName: 'Phạm Đức Anh',
    sessionCode: 'AUTH-8A1-1054',
    sessionExpiresAt: '2026-12-31T23:59:59Z',
    notes: 'Khai báo sử dụng AI rất chi tiết'
  },
  {
    id: 'student-04',
    classId: 'class-8a1',
    studentCode: 'HS04',
    fullName: 'Nguyễn Bích Ngọc',
    sessionCode: 'AUTH-8A1-9811',
    sessionExpiresAt: '2026-12-31T23:59:59Z',
    notes: 'Chờ vấn đáp bảo vệ sản phẩm'
  },
  {
    id: 'student-05',
    classId: 'class-8a1',
    studentCode: 'HS05',
    fullName: 'Hoàng Quốc Bảo',
    sessionCode: 'AUTH-8A1-3320',
    sessionExpiresAt: '2026-12-31T23:59:59Z',
    notes: 'Đã hoàn thành cả 3 nhiệm vụ'
  }
];

export const INITIAL_ASSIGNMENTS: TaskAssignment[] = [
  {
    id: 'assign-01',
    taskId: 'task-1',
    taskTitle: 'Nhiệm vụ 1: Lập trình độc lập – Theo dõi số trang đọc sách (7 ngày)',
    taskNumber: 1,
    aiLevel: 'T1',
    targetType: 'multiple_classes',
    targetClassIds: ['class-8a1', 'class-8a2'],
    targetClassNames: ['Lớp 8A1', 'Lớp 8A2'],
    startTime: '2026-11-01T00:00:00Z',
    dueTime: '2026-12-31T23:59:59Z',
    teacherNotes: 'Các em học sinh tự lập trình Python độc lập trên Thonny, không sử dụng AI. Nộp đầy đủ giả mã và tối thiểu 3 test case.',
    assignedAt: '2026-11-01T08:00:00Z',
    assignedByTeacherId: 'user-bongnguyen',
    assignedByTeacherName: 'Cô Bống Nguyễn',
    status: 'assigned'
  },
  {
    id: 'assign-02',
    taskId: 'task-2',
    taskNumber: 2,
    taskTitle: 'Nhiệm vụ 2: Phát hiện, giải thích và sửa lỗi chương trình đọc sách',
    aiLevel: 'T2',
    targetType: 'multiple_classes',
    targetClassIds: ['class-8a1', 'class-8a2'],
    targetClassNames: ['Lớp 8A1', 'Lớp 8A2'],
    startTime: '2026-11-01T00:00:00Z',
    dueTime: '2026-12-31T23:59:59Z',
    teacherNotes: 'Yêu cầu kiểm thử với test case bắt buộc n=1, trang=15. AI chỉ được dùng để nhận gợi ý Socratic.',
    assignedAt: '2026-11-01T08:00:00Z',
    assignedByTeacherId: 'user-bongnguyen',
    assignedByTeacherName: 'Cô Bống Nguyễn',
    status: 'assigned'
  },
  {
    id: 'assign-03',
    taskId: 'task-3',
    taskNumber: 3,
    taskTitle: 'Nhiệm vụ 3: Đánh giá, phản biện và cải tiến giải pháp Python do GenAI đề xuất',
    aiLevel: 'T3',
    targetType: 'single_class',
    targetClassIds: ['class-8a1'],
    targetClassNames: ['Lớp 8A1'],
    startTime: '2026-11-01T00:00:00Z',
    dueTime: '2026-12-31T23:59:59Z',
    teacherNotes: 'Bắt buộc công khai đầy đủ Prompt và phản hồi AI, giải thích rõ các điểm em đã tự kiểm chứng và cải tiến.',
    assignedAt: '2026-11-01T08:00:00Z',
    assignedByTeacherId: 'user-bongnguyen',
    assignedByTeacherName: 'Cô Bống Nguyễn',
    status: 'assigned'
  }
];

