const PALETTE = [
  { badge: "bg-sky-100 text-sky-700", solid: "bg-sky-600", border: "border-sky-500" },
  { badge: "bg-violet-100 text-violet-700", solid: "bg-violet-600", border: "border-violet-500" },
  { badge: "bg-rose-100 text-rose-700", solid: "bg-rose-600", border: "border-rose-500" },
  { badge: "bg-amber-100 text-amber-700", solid: "bg-amber-600", border: "border-amber-500" },
  { badge: "bg-emerald-100 text-emerald-700", solid: "bg-emerald-600", border: "border-emerald-500" },
  { badge: "bg-fuchsia-100 text-fuchsia-700", solid: "bg-fuchsia-600", border: "border-fuchsia-500" },
  { badge: "bg-orange-100 text-orange-700", solid: "bg-orange-600", border: "border-orange-500" },
  { badge: "bg-teal-100 text-teal-700", solid: "bg-teal-600", border: "border-teal-500" },
] as const;

/** Deterministic color for a divisi name, stable across renders and pages. */
export function divisiColor(divisi: string) {
  let hash = 0;
  for (let i = 0; i < divisi.length; i++) {
    hash = (hash * 31 + divisi.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
