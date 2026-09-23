"use client";

import dynamic from "next/dynamic";

// react-organizational-chart touches `document` at module load time, which
// crashes server-side rendering. Load it only in the browser.
export default dynamic(() => import("./OrgChart"), { ssr: false });
