"use client";

import AttendanceRecords from "@/components/shared/AttendanceRecords";
import { useAttendance } from "@/hooks/useAttendance";

// حضور طلاب صفوف المعلم ومواده — يُحصر بـ API الحضور بحصصه هو فقط
export default function TeacherAttendancePage() {
  const { attendance, loading } = useAttendance();

  return <AttendanceRecords attendance={attendance} loading={loading} />;
}
