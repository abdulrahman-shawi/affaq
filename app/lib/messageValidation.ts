// كشف الروابط: بروتوكول http/https أو www أو نطاق مثل example.com
const URL_REGEX =
  /(https?:\/\/[^\s]+|www\.[^\s]+|\b[a-zA-Z0-9-]+\.(com|net|org|io|me|co|sa|info|xyz|app|dev|gov|edu)\b)/i;

// كشف أرقام الهواتف: 7 أرقام أو أكثر متتالية (مع السماح بـ + ومسافات وشرطات وأقواس)
const PHONE_REGEX = /\+?\d[\d\s\-()]{5,}\d/;

export const FORBIDDEN_CONTENT_MESSAGE =
  "لا يُسمح بإرسال روابط أو أرقام هواتف في الرسائل";

/** يعيد true إذا كان النص يحتوي على رابط أو رقم هاتف */
export function containsLinkOrPhone(text: string): boolean {
  return URL_REGEX.test(text) || PHONE_REGEX.test(text);
}
