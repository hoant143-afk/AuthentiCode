export type UserRole = 'admin' | 'teacher' | 'second_grader' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isApproved: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  classId: string;
  studentCode: string; // e.g. HS01
  fullName: string;
  sessionCode: string; // e.g. AUTH-8A1-4921
  sessionExpiresAt: string;
  notes?: string;
}

export interface ClassGroup {
  id: string;
  name: string; // e.g. "Lớp 8A1"
  grade: number; // 8
  academicYear: string; // 2025-2026
  teacherId: string;
  teacherName: string;
  studentCount: number;
  createdAt: string;
}

export type TaskAIMode = 'none' | 'guided_hints_only' | 'open_with_disclosure';
export type AILevel = 'T1' | 'T2' | 'T3';
export type TaskStatus = 'draft' | 'published' | 'assigned';

export interface AssessmentTask {
  id: string;
  taskNumber: number;
  title: string;
  subtitle: string;
  objective: string;
  aiMode: TaskAIMode;
  aiLevel: AILevel;
  aiModeLabel: string;
  problemStatement: string;
  sampleInput: string;
  sampleOutput: string;
  inputDescription?: string;
  outputDescription?: string;
  requirements: string[];
  mandatoryTestCases: {
    input: string;
    expectedOutput: string;
    description: string;
  }[];
  starterCode?: string; // For Task 2
  allowedAIPromptingRules: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  authorTeacherId?: string;
  authorTeacherName?: string;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  taskTitle: string;
  taskNumber: number;
  aiLevel: AILevel;
  targetType: 'all_classes' | 'single_class' | 'multiple_classes' | 'individual_students';
  targetClassIds: string[];
  targetClassNames: string[];
  targetStudentIds?: string[];
  individualAssignmentCode?: string; // Mã bài cá nhân
  startTime: string; // ISO date string - Thời gian mở bài
  dueTime: string; // ISO date string - Hạn nộp bài
  teacherNotes?: string;
  assignedAt: string;
  assignedByTeacherId: string;
  assignedByTeacherName: string;
  status: 'assigned';
}

export interface TestCaseItem {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  studentActualOutput?: string;
  isMatch?: boolean;
  description: string;
  isMandatory?: boolean;
}

export interface AILogEntry {
  id: string;
  timestamp: string;
  aiTool: string; // e.g., "Gemini 3.8 Flash (Qua hệ thống AuthentiCode)"
  prompt: string;
  aiResponse: string;
  studentVerificationNote: string;
  studentDecision: 'used_verbatim' | 'modified_improved' | 'rejected' | 'clarified_concept';
  decisionRationale: string;
}

export interface SubmissionVersion {
  versionNumber: number;
  submittedAt: string;
  problemAnalysis: string;
  algorithmPseudocode: string;
  pythonSourceCode: string;
  fixedPythonCode?: string; // For Task 2
  bugExplanations?: string; // For Task 2
  testCases: TestCaseItem[];
  explanation: string;
  selfEvaluation: {
    understandingScore: number; // 1-4
    confidenceLevel: 'low' | 'medium' | 'high';
    reflectionNotes: string;
  };
  aiLogs: AILogEntry[];
  aiDisclosure?: {
    usedAI: boolean;
    toolUsed: string;
    promptsCount: number;
    whatVerified: string;
    whatImproved: string;
    studentContribution: string;
    teacherProvidedSampleUsed?: boolean;
  };
}

export interface Submission {
  id: string;
  taskId: string;
  assignmentId?: string;
  taskNumber: number;
  studentId: string;
  studentName: string;
  studentCode: string;
  classId: string;
  className: string;
  status: 'draft' | 'submitted' | 'grading_in_progress' | 'graded' | 'needs_revision' | 'oral_defense_pending';
  currentVersion: number;
  versions: SubmissionVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface RubricLevel {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  scoreRatio: number; // 0, 0.25, 0.5, 0.75, 1.0
  description: string;
}

export interface RubricCriterion {
  id: 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6';
  code: string;
  name: string;
  weight: number; // e.g. 0.15, 0.20, 0.25, 0.20, 0.10, 0.10
  weightPercentText: string;
  levels: RubricLevel[];
}

export interface CriterionGrade {
  criterionId: 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6';
  selectedLevel: 0 | 1 | 2 | 3 | 4;
  zeroReason?: string; // Mandatory if level == 0
  evidence: string;
  comment: string;
}

export interface OralDefenseRecord {
  conductedAt: string;
  teacherId: string;
  teacherName: string;
  questions: {
    questionId: string;
    questionText: string;
    studentAnswerSummary: string;
    understandingScore: 1 | 2 | 3 | 4; // 1: Kém, 2: Hiểu một phần, 3: Hiểu tốt, 4: Làm chủ sâu sắc
    teacherNote: string;
  }[];
  overallOralConclusion: string;
  ownershipConfirmed: boolean;
}

export interface Evaluation {
  id: string;
  submissionId: string;
  graderId: string;
  graderName: string;
  graderRole: 'teacher' | 'second_grader';
  gradedAt: string;
  criterionGrades: CriterionGrade[];
  weightedScore10: number; // Scaled to 10
  generalFeedback: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
  oralDefense?: OralDefenseRecord;
  isFinalDecision: boolean;
}

export interface DoubleGradingComparison {
  submissionId: string;
  grader1Evaluation: Evaluation;
  grader2Evaluation?: Evaluation;
  isGrader2Finished: boolean;
  consensusRatePercent: number;
  scoreDelta: number;
  divergentCriteria: {
    criterionId: string;
    criterionName: string;
    grader1Level: number;
    grader2Level: number;
    difference: number;
  }[];
  reconciledScore?: number;
  reconciliationNotes?: string;
  reconciledBy?: string;
  reconciledAt?: string;
}

export interface AppealRequest {
  id: string;
  submissionId: string;
  studentId: string;
  studentName: string;
  taskTitle: string;
  requestedAt: string;
  studentReason: string;
  studentEvidence: string;
  status: 'pending' | 'accepted' | 'rejected';
  teacherResponse?: string;
  resolvedAt?: string;
  scoreAdjustment?: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetId: string;
  details: string;
}

export interface SystemStats {
  classCount: number;
  studentCount: number;
  taskCount: number;
  submittedCount: number;
  pendingCount: number;
  oralPendingCount: number;
  needsReviewCount: number;
  gradedCount: number;
  averageScore: number;
}
