// Shared types mirroring the Prisma models (serialized over the API,
// so DateTime fields are strings) plus API DTOs.

export type Role = "admin" | "teacher" | "parent" | "student";

export type StudentStatus = "active" | "expired" | "suspended";
export type AttendanceStatus = "present" | "absent" | "late";
export type PaymentMethod = "bank" | "cash";
export type PaymentPeriod = "year" | "semester" | "monthly";
export type Shift = "morning" | "evening";
/** عملات الرسوم والمدفوعات */
export type Currency = "SYP" | "USD" | "SAR" | "AED";
export type GradeType = "quiz" | "exam" | "homework";
export type NotificationType =
  | "subscription"
  | "assignment"
  | "grade"
  | "attendance"
  | "message";

export interface UserDTO {
  id: string;
  email: string | null;
  name: string;
  role: Role;
  phone?: string | null;
  createdAt: string;
}

export interface SiteSettingsDTO {
  siteName: string;
  academyName: string;
  logoUrl: string | null;
}

export interface ParentDTO {
  id: string;
  userId: string;
  user?: UserDTO;
  /** أرقام هواتف إضافية — الرقم الأساسي في user.phone */
  phones?: string[];
  children?: StudentDTO[];
}

export interface StudentDTO {
  id: string;
  studentNumber?: number;
  userId: string;
  user?: UserDTO;
  parentId?: string | null;
  parent?: ParentDTO | null;
  classId?: string | null;
  class?: { id: string; name: string } | null;
  status: string;
  subEndDate?: string | null;
  monthlyFee?: number | null;
  address?: string | null;
  birthDate?: string | null;
  regGoal?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  /** أرقام هواتف ولي الأمر (يمكن أكثر من رقم) */
  guardianPhones?: string[];
  /** دوام الطالب: صباحي أو مسائي */
  shift?: Shift | null;
  /** عملة رسوم الطالب */
  currency?: Currency | null;
}

export interface TeacherDTO {
  id: string;
  userId: string;
  user?: UserDTO;
  /** دوام المعلم: صباحي أو مسائي */
  shift?: Shift | null;
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
  receiptUrl?: string | null;
  note?: string | null;
}

/** تجميعة فواتير طالب واحد — تُحسب في العميل من قائمة PaymentDTO */
export interface StudentPaymentsSummary {
  studentId: string;
  studentName: string;
  /** عملة رسوم الطالب — تُستخدم لتنسيق المبالغ */
  currency?: Currency | null;
  payments: PaymentDTO[];
  /** عدد الفواتير المدفوعة */
  invoiceCount: number;
  totalPaid: number;
  /** إجمالي المستحق — null إن لم تُسجل أي فاتورة بمبلغ مستحق */
  totalDue: number | null;
  /** المتبقي = totalDue - totalPaid — null إن لم يوجد مبلغ مستحق */
  remaining: number | null;
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
  /** دوام الصف: صباحي أو مسائي */
  shift?: Shift | null;
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
  email?: string;
  phone?: string;
  password?: string;
  classId?: string;
  subEndDate?: string;
  monthlyFee?: number;
  address?: string;
  birthDate?: string;
  regGoal?: string;
  fatherName?: string;
  motherName?: string;
  /** أرقام هواتف ولي الأمر */
  guardianPhones?: string[];
  /** دوام الطالب: صباحي أو مسائي */
  shift?: Shift;
  /** عملة رسوم الطالب */
  currency?: Currency;
  /** حالة دفع الاشتراك الأول — عند paid/partial تُنشأ دفعة تلقائيًا */
  paymentStatus?: "paid" | "partial" | "unpaid";
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
}

export interface CreateTeacherInput {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  /** دوام المعلم: صباحي أو مسائي */
  shift?: Shift;
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
  receiptUrl?: string;
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
  /** دوام الصف: صباحي أو مسائي */
  shift?: Shift;
  subjectIds?: string[];
}

export interface CreateSubjectInput {
  name: string;
  classIds?: string[];
}
