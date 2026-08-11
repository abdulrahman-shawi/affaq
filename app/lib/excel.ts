import ExcelJS from "exceljs";

export function newWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "أكاديمية آفاق";
  workbook.created = new Date();
  return workbook;
}

export function addSheet(
  workbook: ExcelJS.Workbook,
  name: string
): ExcelJS.Worksheet {
  return workbook.addWorksheet(name, {
    views: [{ rightToLeft: true }],
  });
}

export function styleHeaderRow(row: ExcelJS.Row): void {
  row.font = { bold: true };
  row.eachCell((cell) => {
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
  });
}

export async function xlsxResponse(
  workbook: ExcelJS.Workbook,
  filename: string
): Promise<Response> {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="report.xlsx"; filename*=UTF-8''${encodeURIComponent(
        filename
      )}`,
    },
  });
}
