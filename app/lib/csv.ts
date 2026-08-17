/**
 * تنزيل CSV في المتصفح مع BOM ليتعرف Excel على العربية.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const escape = (value: string | number | null | undefined) => {
    const s = value == null ? "" : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers, ...rows].map((row) => row.map(escape).join(","));
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
