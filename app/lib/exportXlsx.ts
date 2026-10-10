/**
 * تنزيل ملف Excel حقيقي (xlsx) من المتصفح مع دعم العربية (ورقة RTL).
 * يعتمد على exceljs — يجب استخدام نسخة المتصفح من الحزمة لتجنب اعتماديات Node.
 */
export async function downloadXlsx(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): Promise<void> {
  const ExcelJS = await import("exceljs/dist/exceljs.min.js");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "أكاديمية آفاق";
  workbook.created = new Date();

  const sheetName = filename.replace(/\.xlsx$/i, "") || "Sheet1";
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: true }],
  });

  const headerRow = sheet.addRow(headers);
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

  const values = rows.map((row) => row.map((v) => v ?? ""));
  values.forEach((row) => sheet.addRow(row));

  const colCount = Math.max(headers.length, ...values.map((r) => r.length), 1);
  for (let i = 1; i <= colCount; i++) {
    let max = String(headers[i - 1] ?? "").length;
    for (const row of values) {
      max = Math.max(max, String(row[i - 1] ?? "").length);
    }
    sheet.getColumn(i).width = Math.min(Math.max(max + 4, 10), 50);
  }

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
