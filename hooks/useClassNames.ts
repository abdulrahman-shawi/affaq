"use client";

import { useEffect, useState } from "react";
import type { ClassLevelDTO } from "@/types";

// خريطة ترتيب الصف (grade) → اسم الصف، لعرض الأسماء بدل الأرقام الخام
export function useClassNames(): Map<number, string> {
  const [map, setMap] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    fetch("/api/classes")
      .then((res) => (res.ok ? res.json() : []))
      .then((classes: ClassLevelDTO[]) =>
        setMap(new Map(classes.map((c) => [c.order, c.name])))
      )
      .catch(() => {});
  }, []);

  return map;
}

// تنسيق نص الصف: اسمه إن وُجد، وإلا الرقم مع prefix
export function formatGrade(grade: number, classNames: Map<number, string>): string {
  return classNames.get(grade) ?? `الصف ${grade}`;
}
