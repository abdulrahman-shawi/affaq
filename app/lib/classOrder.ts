// فصل ترتيب صفوف الدوام المسائي عن الصباحي بإضافة فرق ثابت،
// لأن الحصص والواجبات والاختبارات تُطابَق بالطالب عبر رقم الترتيب (grade)
// دون معلومة الدوام — فلو تطابق الترتيب بين الدوامين اختلطت البيانات.
export const EVENING_ORDER_OFFSET = 100;

/** الترتيب المخزّن في قاعدة البيانات اعتمادًا على الدوام */
export function storedOrder(order: number, shift: string | null | undefined): number {
  return shift === "evening" ? order + EVENING_ORDER_OFFSET : order;
}

/** الترتيب الظاهر للمستخدم (بدون فرق الدوام المسائي) */
export function displayOrder(order: number, shift: string | null | undefined): number {
  return shift === "evening" ? order - EVENING_ORDER_OFFSET : order;
}
