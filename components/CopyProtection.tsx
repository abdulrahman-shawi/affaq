"use client";

import { useEffect } from "react";

export default function CopyProtection() {
  useEffect(() => {
    const isEditable = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      );
    };

    // منع القائمة المنسدلة عند النقر بالزر الأيمن
    const handleContextMenu = (e: MouseEvent) => {
      if (!isEditable(e.target)) e.preventDefault();
    };

    // منع تحديد النص (يشمل النقر المزدوج بالزر الأيسر)
    const handleSelectStart = (e: Event) => {
      if (!isEditable(e.target)) e.preventDefault();
    };

    // منع النسخ (Ctrl+C أو من أي طريقة أخرى) خارج حقول الإدخال
    const handleCopy = (e: ClipboardEvent) => {
      if (!isEditable(e.target)) e.preventDefault();
    };

    // منع اختصارات أدوات المطور وعرض المصدر والحفظ
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === "F12") {
        e.preventDefault();
        return;
      }
      if (!ctrl) return;

      // Ctrl+Shift+I / J / C / K : أدوات المطور والكونسول والفحص
      if (e.shiftKey && ["I", "J", "C", "K"].includes(key)) {
        e.preventDefault();
        return;
      }
      // Ctrl+U : عرض المصدر ، Ctrl+S : حفظ الصفحة
      if (["U", "S"].includes(key)) {
        e.preventDefault();
        return;
      }
      // Ctrl+C / Ctrl+X : النسخ والقص خارج حقول الإدخال
      if (["C", "X"].includes(key) && !isEditable(e.target)) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}
