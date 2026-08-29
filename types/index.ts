// Shared types mirroring the Prisma models (serialized over the API,
// so DateTime fields are strings) plus API DTOs.

export type Role = "admin" | "teacher" | "parent" | "student";

export type StudentStatus = "active" | "expired" | "suspended";
export type AttendanceStatus = "present" | "absent" | "late";
export type PaymentMethod = "bank" | "cash";
export type PaymentPeriod = "year" | "semester" | "monthly";
export type GradeType = "quiz" | "exam" | "homework";
export type NotificationType =
  | "subscription"
  | "assignment"
  | "grade"
  | "attendance"
  | "message";

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  createdAt: string;
}

export interface ParentDTO {
  id: string;
  userId: string;
  user?: UserDTO;
  children?: StudentDTO[];
}

export interface StudentDTO {
  id: string;
  userId: string;
  user?: UserDTO;
  parentId?: string | null;
  parent?: ParentDTO | null;
  classId?: string | null;
  class?: { id: string; name: string } | null;
  status: string;
  subEndDate?: string | null;
}

export interface TeacherDTO {
  id: string;
  userId: string;
  user?: UserDTO;
  subjects: { id: string; name: string }[];
  classes: { id: string; name: string; order: number }[];
}

export interface PaymentDTO {
  id: string;
  studentId: string;
  student?: StudentDTO;
  amount: number;
  date: string;
  method: string;
  period: string;
  months?: number | null;
  dueAmount?: number | null;
  note?: string | null;
}

export interface SessionDTO {
  id: string;
  teacherId: string;
  teacher?: TeacherDTO;
  grade: number;
  subject: string;
  date: string;
  zoomLink?: string | null;
  recordingUrl?: string | null;
}

export interface AttendanceDTO {
  id: string;
  sessionId: string;
  session?: SessionDTO;
  studentId: string;
  student?: StudentDTO;
  status: string;
  note?: string | null;
}

export interface TimetableSlotDTO {
  id: string;
  classId: string;
  class?: { id: string; name: string };
  teacherId: string;
  teacher?: { id: string; user?: { name: string } };
  subject: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  zoomLink?: string | null;
}

export interface QuizQuestionDTO {
  id: string;
  quizId: string;
  type?: "mcq" | "truefalse" | "essay";
  text: string;
  options: string[];
  correctIndex?: number; // يُحذف من استجابة الطالب ما لم يكن قد أدّى الاختبار (للمراجعة)؛ essay = -1
  points: number;
}

export interface QuizAttemptDTO {
  id: string;
  quizId: string;
  studentId: string;
  student?: StudentDTO;
  answers?: (number | string)[]; // فهرس الخيار لـ mcq/truefalse، ونص الإجابة لـ essay
  essayScores?: number[]; // درجة كل سؤال كتابي بترتيب الأسئلة (0 عند غير الكتابية)
  graded?: boolean; // false = بانتظار تصحيح المعلم للأسئلة الكتابية
  score: number;
  maxScore: number;
  submittedAt: string;
}

export interface QuizDTO {
  id: string;
  title: string;
  subject: string;
  grade: number;
  durationMinutes?: number | null; // مهلة الاختبار — فارغة = بلا مؤقت
  published?: boolean; // مسودة = لا تظهر للطلاب
  teacherId: string;
  teacher?: TeacherDTO;
  createdAt: string;
  questions?: QuizQuestionDTO[];
  attempts?: QuizAttemptDTO[];
}

export interface AssignmentDTO {
  id: string;
  title: string;
  subject: string;
  grade: number;
  dueDate: string;
  fileUrl?: string | null;
  fileName?: string | null;
  submissions?: SubmissionDTO[];
}

export interface SubmissionDTO {
  id: string;
  assignmentId: string;
  assignment?: AssignmentDTO;
  studentId: string;
  student?: StudentDTO;
  fileUrl?: string | null;
  text?: string | null;
  grade?: number | null;
  feedback?: string | null;
  submittedAt: string;
}

export interface GradeDTO {
  id: string;
  studentId: string;
  student?: StudentDTO;
  subject: string;
  type: string;
  score: number;
  maxScore: number;
  date: string;
  note?: string | null;
}

export interface MessageSenderDTO {
  id: string;
  name: string;
  role: string;
}

export interface MessageDTO {
  id: string;
  content: string;
  toAll: boolean;
  createdAt: string;
  sender: MessageSenderDTO;
  classes: { id: string; name: string }[];
  recipients: MessageSenderDTO[];
}

export interface MessageTargetUserDTO {
  id: string;
  name: string;
  role: string;
  detail: string | null;
}

export interface MessageTargetsDTO {
  canSendToAll: boolean;
  classes: { id: string; name: string }[];
  users: MessageTargetUserDTO[];
}

export interface NotificationDTO {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
}

export interface ClassLevelDTO {
  id: string;
  name: string;
  order: number;
  createdAt: string;
  subjects: { id: string; name: string }[];
}

export interface SubjectDTO {
  id: string;
  name: string;
  createdAt: string;
  classes: { id: string; name: string }[];
}

// API input DTOs

export interface CreateStudentInput {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  classId?: string;
  subEndDate?: string;
}

export interface CreateTeacherInput {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  subjectIds?: string[];
  classIds?: string[];
}

export interface CreatePaymentInput {
  studentId: string;
  amount: number;
  method: PaymentMethod;
  period: PaymentPeriod;
  months?: number;
  dueAmount?: number;
  note?: string;
}

export interface CreateAttendanceInput {
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  note?: string;
}

export interface CreateAssignmentInput {
  title: string;
  subject: string;
  grade: number;
  dueDate: string;
  fileUrl?: string;
  fileName?: string;
}

export interface CreateSubmissionInput {
  assignmentId: string;
  studentId: string;
  fileUrl?: string;
  text?: string;
}

export interface GradeSubmissionInput {
  id: string;
  grade: number;
  feedback?: string;
}

export interface CreateGradeInput {
  studentId: string;
  subject: string;
  type: GradeType;
  score: number;
  maxScore: number;
  note?: string;
}

export interface SendMessageInput {
  content: string;
  toAll?: boolean;
  classIds?: string[];
  recipientIds?: string[];
}

export interface CreateSessionInput {
  teacherId: string;
  grade: number;
  subject: string;
  date: string;
}

export interface CreateTimetableSlotInput {
  classId: string;
  teacherId: string;
  subject: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  zoomLink?: string | null;
}

export interface CreateQuizQuestionInput {
  type?: "mcq" | "truefalse" | "essay";
  text: string;
  options: string[]; // 4 خيارات لـ mcq، وخياران [صح، خطأ] لـ truefalse، و[] لـ essay
  correctIndex: number; // essay = -1 (تصحيح يدوي)
  points?: number;
}

export interface CreateQuizInput {
  title: string;
  subject: string;
  grade: number;
  durationMinutes?: number | null;
  published?: boolean;
  questions: CreateQuizQuestionInput[];
}

export interface UpdateQuizInput extends CreateQuizInput {
  id: string;
}

export interface SubmitQuizInput {
  studentId: string;
  answers: (number | string)[]; // فهرس الخيار لـ mcq/truefalse (-1 = بلا إجابة)، ونص لـ essay
}

export interface CreateClassInput {
  name: string;
  order?: number;
  subjectIds?: string[];
}

export interface CreateSubjectInput {
  name: string;
  classIds?: string[];
}
