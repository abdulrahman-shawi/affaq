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
  grade: number;
  status: string;
  subEndDate?: string | null;
}

export interface TeacherDTO {
  id: string;
  userId: string;
  user?: UserDTO;
  subjects: string[];
  grades: number[];
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
  note?: string | null;
}

export interface SessionDTO {
  id: string;
  teacherId: string;
  teacher?: TeacherDTO;
  grade: number;
  subject: string;
  date: string;
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

export interface AssignmentDTO {
  id: string;
  title: string;
  subject: string;
  grade: number;
  dueDate: string;
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

export interface MessageDTO {
  id: string;
  content: string;
  senderType: string;
  senderId: string;
  studentId?: string | null;
  teacherId?: string | null;
  sessionId?: string | null;
  assignmentId?: string | null;
  createdAt: string;
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
  grade: number;
  subEndDate?: string;
}

export interface CreateTeacherInput {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  subjects: string[];
  grades: number[];
}

export interface CreatePaymentInput {
  studentId: string;
  amount: number;
  method: PaymentMethod;
  period: PaymentPeriod;
  months?: number;
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

export interface CreateMessageInput {
  content: string;
  senderType: string;
  senderId: string;
  studentId?: string;
  teacherId?: string;
}

export interface CreateSessionInput {
  teacherId: string;
  grade: number;
  subject: string;
  date: string;
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
