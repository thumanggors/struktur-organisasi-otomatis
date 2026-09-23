"use client";

import dynamic from "next/dynamic";

// html-to-image / jspdf touch `document` at module load time, which crashes
// server-side rendering. Load them only in the browser.
export default dynamic(() => import("./ExportButtons"), { ssr: false });
