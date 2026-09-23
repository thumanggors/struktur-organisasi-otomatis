"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

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
    <div className="mb-4 flex items-center gap-2">
      <button onClick={handleExportPng} className="rounded border px-3 py-2">
        Export PNG
      </button>
      <button onClick={handleExportPdf} className="rounded border px-3 py-2">
        Export PDF
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
