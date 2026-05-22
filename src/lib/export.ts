import FileSaver from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helper to convert array buffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function exportToCSV<T>(data: T[], filename: string, columns: { header: string; key: keyof T | ((row: T) => string) }[]) {
  if (data.length === 0) return;

  const headers = columns.map((col) => `"${String(col.header || "").replace(/"/g, '""')}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = typeof col.key === "function" ? col.key(row) : row[col.key];
        return `"${String(val || "").replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csv = [headers, ...rows].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  FileSaver.saveAs(blob, `${filename}.csv`);
}

export function exportToExcel<T>(data: T[], filename: string, columns: { header: string; key: keyof T | ((row: T) => string) }[]) {
  if (data.length === 0) return;

  const exportData = data.map((row) => {
    const rowData: Record<string, string> = {};
    columns.forEach((col) => {
      const headerStr = String(col.header || "");
      rowData[headerStr] = String(typeof col.key === "function" ? col.key(row) : row[col.key] || "");
    });
    return rowData;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Apply RTL direction for Arabic support
  const isArabic = columns.some((c) => /[\u0600-\u06FF]/.test(String(c.header || "")));
  if (isArabic) {
    if (!worksheet["!views"]) worksheet["!views"] = [];
    worksheet["!views"].push({ rightToLeft: true });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function exportToPDF<T>(data: T[], filename: string, title: string, columns: { header: string; key: keyof T | ((row: T) => string) }[]) {
  if (data.length === 0) return;

  const doc = new jsPDF();
  let fontName = "helvetica";
  
  // Try loading Arabic font to support RTL text and Unicode characters
  try {
    const fontRes = await fetch("/fonts/Amiri-Regular.ttf");
    if (fontRes.ok) {
      const fontBuffer = await fontRes.arrayBuffer();
      const base64Font = arrayBufferToBase64(fontBuffer);
      doc.addFileToVFS("Amiri-Regular.ttf", base64Font);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
      fontName = "Amiri";
    }
  } catch (e) {
    console.warn("Failed to load Arabic font for PDF", e);
  }

  doc.setFont(fontName);
  doc.text(title, 14, 15);

  const body = data.map((row) =>
    columns.map((col) => String(typeof col.key === "function" ? col.key(row) : row[col.key] || ""))
  );

  autoTable(doc, {
    head: [columns.map((col) => String(col.header || ""))],
    body,
    startY: 20,
    styles: { font: fontName, fontStyle: "normal", fontSize: 10 },
  });

  doc.save(`${filename}.pdf`);
}
