"use client";

import AttendanceRecords from "@/components/shared/AttendanceRecords";
import { useAttendance } from "@/hooks/useAttendance";

export default function AdminAttendancePage() {
  const { attendance, loading } = useAttendance();

  return <AttendanceRecords attendance={attendance} loading={loading} />;
}
