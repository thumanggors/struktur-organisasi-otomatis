export type DivisiColorSet = { badge: string; solid: string; border: string; bg: string };

const PALETTE: DivisiColorSet[] = [
  { badge: "bg-sky-100 text-sky-700", solid: "bg-sky-600", border: "border-sky-500", bg: "bg-sky-500" },
  { badge: "bg-violet-100 text-violet-700", solid: "bg-violet-600", border: "border-violet-500", bg: "bg-violet-500" },
  { badge: "bg-rose-100 text-rose-700", solid: "bg-rose-600", border: "border-rose-500", bg: "bg-rose-500" },
  { badge: "bg-amber-100 text-amber-700", solid: "bg-amber-600", border: "border-amber-500", bg: "bg-amber-500" },
  { badge: "bg-emerald-100 text-emerald-700", solid: "bg-emerald-600", border: "border-emerald-500", bg: "bg-emerald-500" },
  { badge: "bg-fuchsia-100 text-fuchsia-700", solid: "bg-fuchsia-600", border: "border-fuchsia-500", bg: "bg-fuchsia-500" },
  { badge: "bg-orange-100 text-orange-700", solid: "bg-orange-600", border: "border-orange-500", bg: "bg-orange-500" },
  { badge: "bg-teal-100 text-teal-700", solid: "bg-teal-600", border: "border-teal-500", bg: "bg-teal-500" },
  { badge: "bg-indigo-100 text-indigo-700", solid: "bg-indigo-600", border: "border-indigo-500", bg: "bg-indigo-500" },
  { badge: "bg-lime-100 text-lime-700", solid: "bg-lime-600", border: "border-lime-500", bg: "bg-lime-500" },
  { badge: "bg-pink-100 text-pink-700", solid: "bg-pink-600", border: "border-pink-500", bg: "bg-pink-500" },
  { badge: "bg-cyan-100 text-cyan-700", solid: "bg-cyan-600", border: "border-cyan-500", bg: "bg-cyan-500" },
];

const FALLBACK: DivisiColorSet = {
  badge: "bg-slate-100 text-slate-700",
  solid: "bg-slate-600",
  border: "border-slate-400",
  bg: "bg-slate-400",
};

export type DivisiColorMap = Record<string, DivisiColorSet>;

/**
 * Assigns each divisi name a color by its position in `divisions` (e.g. the
 * output of `listDivisi()`), so two divisions never collide onto the same
 * color the way a hash could — every distinct name gets its own palette
 * slot up to `PALETTE.length` divisions, cycling only beyond that.
 *
 * A plain object (not a Map) so it survives the Server -> Client Component
 * prop boundary as-is.
 */
export function divisiColorMap(divisions: string[]): DivisiColorMap {
  const map: DivisiColorMap = {};
  divisions.forEach((d, i) => {
    map[d] = PALETTE[i % PALETTE.length];
  });
  return map;
}

export function divisiColorFor(map: DivisiColorMap, divisi: string): DivisiColorSet {
  return map[divisi] ?? FALLBACK;
}
