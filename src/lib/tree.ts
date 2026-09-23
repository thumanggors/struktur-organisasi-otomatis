export type Person = {
  id: string;
  nama: string;
  jabatan: string;
  divisi: string | null;
  jobdesk: string | null;
  fotoUrl: string | null;
  atasanId: string | null;
};

export type PersonNode = Omit<Person, "atasanId"> & { children: PersonNode[] };

export function buildTree(people: Person[]): PersonNode[] {
  const idSet = new Set(people.map((p) => p.id));
  const nodeById = new Map<string, PersonNode>();

  for (const p of people) {
    nodeById.set(p.id, {
      id: p.id,
      nama: p.nama,
      jabatan: p.jabatan,
      divisi: p.divisi,
      jobdesk: p.jobdesk,
      fotoUrl: p.fotoUrl,
      children: [],
    });
  }

  const roots: PersonNode[] = [];

  for (const p of people) {
    const node = nodeById.get(p.id)!;
    const hasValidAtasan = p.atasanId !== null && idSet.has(p.atasanId);
    if (hasValidAtasan) {
      nodeById.get(p.atasanId!)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** People in `divisi`, plus every ancestor above them up to the top of the org. */
export function withAncestors(people: Person[], divisi: string): Person[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const included = new Set<string>();

  for (const p of people) {
    if (p.divisi !== divisi) continue;
    let current: Person | undefined = p;
    while (current && !included.has(current.id)) {
      included.add(current.id);
      current = current.atasanId ? byId.get(current.atasanId) : undefined;
    }
  }

  return people.filter((p) => included.has(p.id));
}

/** Distinct, sorted, non-empty divisi values present in `people`. */
export function listDivisi(people: Pick<Person, "divisi">[]): string[] {
  return Array.from(new Set(people.map((p) => p.divisi).filter((d): d is string => !!d))).sort(
    (a, b) => a.localeCompare(b)
  );
}

/** Deputy/secretary-style positions get a side branch in the chart instead of the main line. */
export function isStaffPosition(jabatan: string): boolean {
  return /wakil direktur|sekretaris/i.test(jabatan);
}

/** Splits a node's children into staff (side branch) and line (normal cascade) reports. */
export function splitStaff(children: PersonNode[]): { staff: PersonNode[]; line: PersonNode[] } {
  const staff = children.filter((c) => isStaffPosition(c.jabatan));
  const line = children.filter((c) => !isStaffPosition(c.jabatan));
  return { staff, line };
}
