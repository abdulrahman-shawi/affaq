/**
 * تنزيل ملف Excel حقيقي (xlsx) من المتصفح مع دعم العربية (ورقة RTL).
 * يعتمد على exceljs — يجب استخدام نسخة المتصفح من الحزمة لتجنب اعتماديات Node.
 */

export type XlsxRow = (string | number | null | undefined)[];

export interface XlsxSheet {
  name: string;
  headers: string[];
  rows: XlsxRow[];
}

// أسماء أوراق Excel لا تقبل هذه الرموز وطولها الأقصى 31 حرفًا
const INVALID_SHEET_CHARS = /[\[\]:*?/\\]/g;

function sanitizeSheetNames(sheets: XlsxSheet[]): string[] {
  const used = new Set<string>();
  return sheets.map((sheet, index) => {
    let name = (sheet.name || `ورقة ${index + 1}`)
      .replace(INVALID_SHEET_CHARS, " ")
      .trim()
      .slice(0, 31);
    if (!name) name = `ورقة ${index + 1}`;
    let unique = name;
    let counter = 2;
    while (used.has(unique)) {
      const suffix = ` (${counter})`;
      unique = name.slice(0, 31 - suffix.length) + suffix;
      counter++;
    }
    used.add(unique);
    return unique;
  });
}

export async function downloadXlsxSheets(
  filename: string,
  sheets: XlsxSheet[]
): Promise<void> {
  if (sheets.length === 0) return;
  const ExcelJS = await import("exceljs/dist/exceljs.min.js");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "أكاديمية آفاق";
  workbook.created = new Date();

  const names = sanitizeSheetNames(sheets);
  sheets.forEach((sheetData, index) => {
    const sheet = workbook.addWorksheet(names[index], {
      views: [{ rightToLeft: true }],
    });

    const headerRow = sheet.addRow(sheetData.headers);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    const values = sheetData.rows.map((row) => row.map((v) => v ?? ""));
    values.forEach((row) => sheet.addRow(row));

    const colCount = Math.max(
      sheetData.headers.length,
      ...values.map((r) => r.length),
      1
    );
    for (let i = 1; i <= colCount; i++) {
      let max = String(sheetData.headers[i - 1] ?? "").length;
      for (const row of values) {
        max = Math.max(max, String(row[i - 1] ?? "").length);
      }
      sheet.getColumn(i).width = Math.min(Math.max(max + 4, 10), 50);
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadXlsx(
  filename: string,
  headers: string[],
  rows: XlsxRow[]
): Promise<void> {
  const sheetName = filename.replace(/\.xlsx$/i, "") || "Sheet1";
  return downloadXlsxSheets(filename, [{ name: sheetName, headers, rows }]);
}
