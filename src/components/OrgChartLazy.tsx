"use client";

import dynamic from "next/dynamic";

// Client-only: the chart is only ever viewed and exported in the browser.
export default dynamic(() => import("./OrgChart"), { ssr: false });
