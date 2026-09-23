"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { ImageDown, FileDown } from "lucide-react";

export default function ExportButtons() {
  const [error, setError] = useState<string | null>(null);

  async function getPngDataUrl(): Promise<string> {
    const node = document.getElementById("org-chart-capture");
    if (!node) throw new Error("Chart tidak ditemukan");
    return toPng(node, { backgroundColor: "#ffffff", pixelRatio: 2 });
  }

  async function handleExportPng() {
    setError(null);
    try {
      const dataUrl = await getPngDataUrl();
      const link = document.createElement("a");
      link.download = "struktur-organisasi.png";
      link.href = dataUrl;
      link.click();
    } catch {
      setError("Gagal export PNG. Coba lagi.");
    }
  }

  async function handleExportPdf() {
    setError(null);
    try {
      const dataUrl = await getPngDataUrl();
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => (img.onload = resolve));

      const pdf = new jsPDF({
        orientation: img.width > img.height ? "landscape" : "portrait",
        unit: "px",
        format: [img.width, img.height],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
      pdf.save("struktur-organisasi.pdf");
    } catch {
      setError("Gagal export PDF. Coba lagi.");
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button
        onClick={handleExportPng}
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-sky-50"
      >
        <ImageDown className="h-4 w-4 text-sky-600" aria-hidden="true" />
        Export PNG
      </button>
      <button
        onClick={handleExportPdf}
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-rose-50"
      >
        <FileDown className="h-4 w-4 text-rose-600" aria-hidden="true" />
        Export PDF
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
