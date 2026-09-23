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
