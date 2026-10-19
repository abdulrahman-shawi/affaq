export function chatChannelName(classId: string, teacherId?: string | null): string {
  return teacherId
    ? `private-chat-class-${classId}-teacher-${teacherId}`
    : `private-chat-class-${classId}`;
}
