"use client";

import BasePhoneInput, { type Value } from "react-phone-number-input";
import arLabels from "react-phone-number-input/locale/ar.json";
import "react-phone-number-input/style.css";

/**
 * حقل رقم هاتف مع اختيار رمز الدولة.
 * القيمة المخزنة بصيغة دولية E.164 (مثال: +9665xxxxxxxx).
 */
export default function PhoneInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div dir="ltr" className="phone-input">
      <BasePhoneInput
        id={id}
        international
        defaultCountry="SA"
        labels={arLabels}
        placeholder={placeholder}
        value={value || undefined}
        onChange={(v?: Value) => onChange(v ?? "")}
      />
    </div>
  );
}
