type PersonRef = { id: string; atasanId: string | null };

export function wouldCreateCycle(
  personId: string,
  candidateAtasanId: string | null,
  people: PersonRef[]
): boolean {
  if (candidateAtasanId === null) return false;
  if (candidateAtasanId === personId) return true;

  const byId = new Map(people.map((p) => [p.id, p]));
  let current: string | null = candidateAtasanId;
  const visited = new Set<string>();

  while (current !== null) {
    if (current === personId) return true;
    if (visited.has(current)) return false; // already-corrupt data, avoid infinite loop
    visited.add(current);
    current = byId.get(current)?.atasanId ?? null;
  }

  return false;
}
