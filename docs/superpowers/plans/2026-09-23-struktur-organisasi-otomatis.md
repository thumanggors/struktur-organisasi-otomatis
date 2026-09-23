# Struktur Organisasi Otomatis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Next.js web app, open to anyone (no login), where people are input (Nama, Jabatan, Divisi, Foto, Jobdesk, Atasan) and an auto-generated, exportable org chart is shown.

**Architecture:** Next.js 14+ App Router (TypeScript) monolith — API routes for data access, Prisma/SQLite for storage, no authentication (all routes and endpoints open), React components rendering the org tree client-side from a flat `Person[]` list, export via `html-to-image` + `jsPDF`.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Prisma (SQLite), react-organizational-chart, html-to-image, jsPDF, Vitest.

**Spec:** [docs/superpowers/specs/2026-09-23-struktur-organisasi-otomatis-design.md](../specs/2026-09-23-struktur-organisasi-otomatis-design.md)

> **Revision (2026-09-23):** the original plan had a login system (NextAuth, `User` model, Admin/Viewer roles). The user removed this requirement mid-implementation, after Task 1 and Task 2 were already built and reviewed — everyone can view and manage data with no login. Task 3 below (new) removes the now-unused `User` model and auth scaffolding that Task 2 had already added; the former Task 5 (Auth) is deleted; Tasks 6-8 below have their role checks stripped. Tasks 6 through 11 keep their original numbers — only Task 3 is new and the old Task 3/4 shifted to 4/5.

## Global Constraints

- Single organization only — no multi-tenant support.
- Hierarchy comes only from explicit `atasanId`, never inferred from `jabatan` text.
- `divisi` is a display-only field — must never affect tree structure or grouping logic.
- No login/authentication — every page and API endpoint is open to any visitor, no role distinction.
- Photo uploads: reject anything that isn't `image/jpeg` or `image/png`, and anything over 5MB — enforced both client and server side.
- Deleting a person must reparent their direct reports to `atasanId = null`, never cascade-delete them.

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: a running Next.js dev server at `http://localhost:3000` rendering a placeholder home page; `npm test` runs Vitest.

- [ ] **Step 1: Scaffold the Next.js app**

```bash
cd "D:\OneDrive\8. PICTOR\1. CLAUDE - 2\2. CODE"
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --no-import-alias --use-npm
```

When prompted, accept defaults (this creates `src/app/`, `tailwind.config.ts`, etc. in the current directory).

- [ ] **Step 2: Initialize git and commit the scaffold**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js app"
```

- [ ] **Step 3: Add Vitest**

```bash
npm install -D vitest
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

Add to `package.json` scripts:

```json
"test": "vitest run"
```

- [ ] **Step 4: Verify dev server and test runner both work**

Run: `npm run dev` (visit `http://localhost:3000`, confirm the default page loads, then stop the server)
Run: `npm test`
Expected: dev server serves the placeholder page; `npm test` reports "No test files found" (passes with 0 tests) — no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add vitest"
```

---

### Task 2: Prisma schema, client, and seed script

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `prisma/seed.ts`
- Modify: `package.json` (add `prisma.seed` config and scripts)
- Modify: `.gitignore` (ignore `prisma/dev.db`, `/public/uploads`)

**Interfaces:**
- Produces: `prisma.person` and `prisma.user` models available via `import { db } from "@/lib/db"`; `Person` fields `id, nama, jabatan, divisi, jobdesk, fotoUrl, atasanId, createdAt, updatedAt`; `User` fields `id, email, passwordHash, role` (`role: "ADMIN" | "VIEWER"`).

- [ ] **Step 1: Install Prisma**

```bash
npm install prisma @prisma/client
npm install -D tsx
npx prisma init --datasource-provider sqlite
```

- [ ] **Step 2: Write the schema**

Replace `prisma/schema.prisma` contents:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  VIEWER
}

model User {
  id           String @id @default(cuid())
  email        String @unique
  passwordHash String
  role         Role   @default(VIEWER)
}

model Person {
  id        String   @id @default(cuid())
  nama      String
  jabatan   String
  divisi    String?
  jobdesk   String?
  fotoUrl   String?
  atasanId  String?
  atasan    Person?  @relation("Reports", fields: [atasanId], references: [id])
  bawahan   Person[] @relation("Reports")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Confirm `prisma/.env` (or root `.env`) has `DATABASE_URL="file:./dev.db"`.

- [ ] **Step 3: Create the Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 4: Run the initial migration**

```bash
npx prisma migrate dev --name init
```

Expected: creates `prisma/dev.db` and `prisma/migrations/`, prints "Your database is now in sync with your schema."

- [ ] **Step 5: Write the seed script**

Install bcrypt (used here for the seed script; note: Task 3 below later removes this along with the `User` model, since the login requirement was dropped):

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@example.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin user already exists, skipping.");
    return;
  }
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: { email, passwordHash, role: "ADMIN" },
  });
  console.log(`Created admin user: ${email} / admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Add to `package.json`:

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
},
"scripts": {
  "seed": "prisma db seed"
}
```

(merge `"seed"` into the existing `scripts` block rather than replacing it)

- [ ] **Step 6: Run the seed and verify**

```bash
npm run seed
```

Expected: prints `Created admin user: admin@example.com / admin123`.

- [ ] **Step 7: Ignore local DB and uploads**

Append to `.gitignore`:

```
/prisma/dev.db
/public/uploads
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema, client, and admin seed script"
```

---

### Task 3: Remove auth/User model (scope revision)

**Files:**
- Modify: `prisma/schema.prisma` (remove the `User` model)
- Delete: `prisma/seed.ts`
- Modify: `package.json` (remove the `prisma.seed` config, the `seed` script, and the `bcryptjs`/`@types/bcryptjs` dependencies)
- Create: a new Prisma migration dropping the `User` table

**Interfaces:**
- Consumes: nothing.
- Produces: a `prisma/schema.prisma` with only the `Person` model — no other task depends on `User`, `Role`, or any auth-related export (confirmed: no task from this point on imports anything from `@/lib/auth` or references `session`/`role`).

- [ ] **Step 1: Remove the `User` model from the schema**

Edit `prisma/schema.prisma` to delete the entire `model User { ... }` block, leaving only the `generator`, `datasource`, and `model Person` blocks. The file should read:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Person {
  id        String   @id @default(cuid())
  nama      String
  jabatan   String
  divisi    String?
  jobdesk   String?
  fotoUrl   String?
  atasanId  String?
  atasan    Person?  @relation("Reports", fields: [atasanId], references: [id])
  bawahan   Person[] @relation("Reports")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Generate and apply the migration**

```bash
npx prisma migrate dev --name remove_user_auth
```

Expected: Prisma detects the `User` table needs to be dropped, generates a migration that does `DROP TABLE "User"`, and applies it. Confirm with `npx prisma migrate status` that there are no pending migrations.

- [ ] **Step 3: Delete the seed script and its wiring**

```bash
rm prisma/seed.ts
npm uninstall bcryptjs @types/bcryptjs
```

In `package.json`, remove the `"prisma": { "seed": "tsx prisma/seed.ts" }` block entirely, and remove the `"seed": "prisma db seed"` line from `"scripts"`.

- [ ] **Step 4: Verify**

Run: `npx prisma generate` (regenerates the Prisma Client without the `User` model — confirm no errors)
Run: `npm test`
Expected: `prisma generate` succeeds with no errors; `npm test` still passes (0 test files at this point, or the cycle/tree tests if already present — either way, no failures).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove auth/User model, no login required"
```

---

### Task 4: Cycle-detection utility (TDD)

**Files:**
- Create: `src/lib/cycle.ts`
- Test: `src/lib/cycle.test.ts`

**Interfaces:**
- Consumes: nothing (pure function, takes plain data).
- Produces: `wouldCreateCycle(personId: string, candidateAtasanId: string | null, people: { id: string; atasanId: string | null }[]): boolean` — used by Task 6's API route before saving `atasanId`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/cycle.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { wouldCreateCycle } from "./cycle";

const people = [
  { id: "a", atasanId: null },
  { id: "b", atasanId: "a" },
  { id: "c", atasanId: "b" },
];

describe("wouldCreateCycle", () => {
  it("allows setting no atasan", () => {
    expect(wouldCreateCycle("a", null, people)).toBe(false);
  });

  it("allows a valid non-cyclic assignment", () => {
    expect(wouldCreateCycle("c", "a", people)).toBe(false);
  });

  it("rejects a person becoming their own atasan", () => {
    expect(wouldCreateCycle("a", "a", people)).toBe(true);
  });

  it("rejects an indirect cycle (c is a's ancestor via b)", () => {
    expect(wouldCreateCycle("a", "c", people)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- cycle`
Expected: FAIL — "wouldCreateCycle is not defined" or module not found.

- [ ] **Step 3: Implement the function**

Create `src/lib/cycle.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- cycle`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add cycle-detection utility for org hierarchy"
```

---

### Task 5: Tree-building utility (TDD)

**Files:**
- Create: `src/lib/tree.ts`
- Test: `src/lib/tree.test.ts`

**Interfaces:**
- Consumes: nothing (pure function).
- Produces: `type PersonNode = { id: string; nama: string; jabatan: string; divisi: string | null; jobdesk: string | null; fotoUrl: string | null; children: PersonNode[] }` and `buildTree(people: Person[]): PersonNode[]` — used by Task 10's chart page. `Person` here is the shape returned by `GET /api/orang` (Task 6): `{ id: string; nama: string; jabatan: string; divisi: string | null; jobdesk: string | null; fotoUrl: string | null; atasanId: string | null }`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tree.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildTree, type Person } from "./tree";

const people: Person[] = [
  { id: "a", nama: "Alice", jabatan: "Direktur", divisi: null, jobdesk: null, fotoUrl: null, atasanId: null },
  { id: "b", nama: "Bob", jabatan: "Manager", divisi: "Ops", jobdesk: null, fotoUrl: null, atasanId: "a" },
  { id: "c", nama: "Cara", jabatan: "Staff", divisi: "Ops", jobdesk: null, fotoUrl: null, atasanId: "b" },
];

describe("buildTree", () => {
  it("nests children under their atasan", () => {
    const tree = buildTree(people);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("a");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe("b");
    expect(tree[0].children[0].children[0].id).toBe("c");
  });

  it("treats a missing/unknown atasanId as a root", () => {
    const orphan: Person = { id: "d", nama: "Dana", jabatan: "Staff", divisi: null, jobdesk: null, fotoUrl: null, atasanId: "does-not-exist" };
    const tree = buildTree([...people, orphan]);
    expect(tree.map((n) => n.id)).toContain("d");
  });

  it("returns an empty array for no people", () => {
    expect(buildTree([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tree`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the function**

Create `src/lib/tree.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tree`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add tree-building utility for org chart"
```

---

### Task 6: Person API routes (list, create, update, delete-with-reparent)

**Files:**
- Create: `src/app/api/orang/route.ts`
- Create: `src/app/api/orang/[id]/route.ts`

**Interfaces:**
- Consumes: `db` (Task 2), `wouldCreateCycle` (Task 4).
- Produces: `GET /api/orang` → `Person[]` (shape matches `Task 5`'s `Person` type); `POST /api/orang` (body: `{ nama, jabatan, divisi?, jobdesk?, fotoUrl?, atasanId? }`) → created `Person`; `PATCH /api/orang/[id]` (same body, partial) → updated `Person`; `DELETE /api/orang/[id]` → `{ ok: true }`, reparents direct reports to `atasanId: null`. No auth — every route is open.

- [ ] **Step 1: Implement the collection route**

Create `src/app/api/orang/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const people = await db.person.findMany({ orderBy: { nama: "asc" } });
  return NextResponse.json(people);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nama, jabatan, divisi, jobdesk, fotoUrl, atasanId } = body;

  if (!nama || !jabatan) {
    return NextResponse.json({ error: "Nama dan Jabatan wajib diisi" }, { status: 400 });
  }

  const created = await db.person.create({
    data: { nama, jabatan, divisi: divisi ?? null, jobdesk: jobdesk ?? null, fotoUrl: fotoUrl ?? null, atasanId: atasanId ?? null },
  });

  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 2: Implement the item route (update + delete-with-reparent)**

Create `src/app/api/orang/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wouldCreateCycle } from "@/lib/cycle";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { nama, jabatan, divisi, jobdesk, fotoUrl, atasanId } = body;

  if (!nama || !jabatan) {
    return NextResponse.json({ error: "Nama dan Jabatan wajib diisi" }, { status: 400 });
  }

  if (atasanId !== undefined && atasanId !== null) {
    const all = await db.person.findMany({ select: { id: true, atasanId: true } });
    if (wouldCreateCycle(params.id, atasanId, all)) {
      return NextResponse.json({ error: "Pilihan atasan ini akan membuat siklus" }, { status: 400 });
    }
  }

  const updated = await db.person.update({
    where: { id: params.id },
    data: { nama, jabatan, divisi: divisi ?? null, jobdesk: jobdesk ?? null, fotoUrl: fotoUrl ?? null, atasanId: atasanId ?? null },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.person.updateMany({
    where: { atasanId: params.id },
    data: { atasanId: null },
  });

  await db.person.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Manually verify with the running dev server**

Run: `npm run dev`, then in the browser devtools console at `http://localhost:3000`:

```javascript
await fetch("/api/orang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nama: "Alice", jabatan: "Direktur" }) }).then(r => r.json())
```

Expected: returns a created person JSON with an `id`. Then `await fetch("/api/orang").then(r => r.json())` shows it in the list. Test that a `DELETE` on a person with children sets those children's `atasanId` to `null` (create a second person with `atasanId` pointing at the first, delete the first, re-fetch the list, confirm the second now has `atasanId: null`).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Person API routes with cycle guard and delete-reparent"
```

---

### Task 7: Photo upload API route

**Files:**
- Create: `src/app/api/upload/route.ts`

**Interfaces:**
- Consumes: nothing beyond Node's `fs`.
- Produces: `POST /api/upload` (multipart form data, field `file`) → `{ url: string }` where `url` is a `/uploads/<filename>` path usable as `fotoUrl`. No auth — open route.

- [ ] **Step 1: Implement the upload route**

Create `src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipe file harus JPG atau PNG" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const ext = file.type === "image/png" ? "png" : "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`. In the browser devtools console at `http://localhost:3000`:

```javascript
const input = document.createElement("input");
input.type = "file";
document.body.appendChild(input);
// pick a small jpg/png, then:
const fd = new FormData();
fd.append("file", input.files[0]);
await fetch("/api/upload", { method: "POST", body: fd }).then(r => r.json())
```

Expected: `{ url: "/uploads/<name>.jpg" }`, and visiting `http://localhost:3000/uploads/<name>.jpg` in the browser shows the image. Also confirm a `.txt` file is rejected with a 400.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add photo upload API route"
```

---

### Task 8: Person list page (`/orang`)

**Files:**
- Create: `src/app/orang/page.tsx`
- Create: `src/components/PersonTable.tsx`

**Interfaces:**
- Consumes: `GET /api/orang` (Task 6).
- Produces: page rendering a table of all people, with "Tambah", "Edit", "Hapus" controls visible to everyone; used as the entry point to Task 9's forms.

- [ ] **Step 1: Build the table component**

Create `src/components/PersonTable.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Person = {
  id: string;
  nama: string;
  jabatan: string;
  divisi: string | null;
  fotoUrl: string | null;
};

export default function PersonTable({ people }: { people: Person[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Hapus orang ini? Bawahan langsungnya akan naik jadi posisi puncak.")) return;
    await fetch(`/api/orang/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b">
          <th className="py-2">Foto</th>
          <th className="py-2">Nama</th>
          <th className="py-2">Jabatan</th>
          <th className="py-2">Divisi</th>
          <th className="py-2">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {people.map((p) => (
          <tr key={p.id} className="border-b">
            <td className="py-2">
              {p.fotoUrl ? <img src={p.fotoUrl} alt={p.nama} className="h-10 w-10 rounded-full object-cover" /> : "-"}
            </td>
            <td className="py-2">{p.nama}</td>
            <td className="py-2">{p.jabatan}</td>
            <td className="py-2">{p.divisi ?? "-"}</td>
            <td className="flex gap-2 py-2">
              <Link href={`/orang/${p.id}/edit`} className="text-blue-600 underline">
                Edit
              </Link>
              <button onClick={() => handleDelete(p.id)} className="text-red-600 underline">
                Hapus
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Build the page**

Create `src/app/orang/page.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import PersonTable from "@/components/PersonTable";

export default async function OrangPage() {
  const people = await db.person.findMany({ orderBy: { nama: "asc" } });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Daftar Orang</h1>
        <Link href="/orang/baru" className="rounded bg-black px-3 py-2 text-white">
          Tambah Orang
        </Link>
      </div>
      <PersonTable people={people} />
    </main>
  );
}
```

- [ ] **Step 3: Manually verify**

Run: `npm run dev`, visit `/orang`. Expected: table lists any people created in Task 6's manual test, "Tambah Orang" button visible, Edit/Hapus links visible per row. Confirm Hapus removes a row and (if it had children) their `atasanId` becomes `null` — re-check via `/api/orang` in devtools console.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add person list page"
```

---

### Task 9: Person form (create + edit)

**Files:**
- Create: `src/components/PersonForm.tsx`
- Create: `src/app/orang/baru/page.tsx`
- Create: `src/app/orang/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `GET /api/orang`, `POST /api/orang`, `PATCH /api/orang/[id]` (Task 6), `POST /api/upload` (Task 7).
- Produces: working create/edit UI, reachable from Task 8's list page.

- [ ] **Step 1: Build the shared form component**

Create `src/components/PersonForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Person = {
  id: string;
  nama: string;
  jabatan: string;
  divisi: string | null;
  jobdesk: string | null;
  fotoUrl: string | null;
  atasanId: string | null;
};

export default function PersonForm({
  initial,
  allPeople,
}: {
  initial?: Person;
  allPeople: Pick<Person, "id" | "nama">[];
}) {
  const router = useRouter();
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [jabatan, setJabatan] = useState(initial?.jabatan ?? "");
  const [divisi, setDivisi] = useState(initial?.divisi ?? "");
  const [jobdesk, setJobdesk] = useState(initial?.jobdesk ?? "");
  const [atasanId, setAtasanId] = useState(initial?.atasanId ?? "");
  const [fotoUrl, setFotoUrl] = useState(initial?.fotoUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const ALLOWED_TYPES = ["image/jpeg", "image/png"];
  const MAX_SIZE = 5 * 1024 * 1024;

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Tipe file harus JPG atau PNG");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Ukuran file maksimal 5MB");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Upload gagal");
      return;
    }
    const { url } = await res.json();
    setFotoUrl(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      nama,
      jabatan,
      divisi: divisi || null,
      jobdesk: jobdesk || null,
      fotoUrl: fotoUrl || null,
      atasanId: atasanId || null,
    };

    const res = await fetch(initial ? `/api/orang/${initial.id}` : "/api/orang", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Gagal menyimpan");
      return;
    }

    router.push("/orang");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama" className="rounded border px-3 py-2" required />
      <input value={jabatan} onChange={(e) => setJabatan(e.target.value)} placeholder="Jabatan" className="rounded border px-3 py-2" required />
      <input value={divisi} onChange={(e) => setDivisi(e.target.value)} placeholder="Divisi (opsional)" className="rounded border px-3 py-2" />
      <textarea value={jobdesk} onChange={(e) => setJobdesk(e.target.value)} placeholder="Jobdesk (opsional)" className="rounded border px-3 py-2" />
      <select value={atasanId} onChange={(e) => setAtasanId(e.target.value)} className="rounded border px-3 py-2">
        <option value="">-- Tanpa atasan (posisi puncak) --</option>
        {allPeople
          .filter((p) => p.id !== initial?.id)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama}
            </option>
          ))}
      </select>
      <input type="file" accept="image/jpeg,image/png" onChange={handleFotoChange} />
      {uploading && <p className="text-sm text-gray-500">Mengunggah foto...</p>}
      {fotoUrl && <img src={fotoUrl} alt="Preview" className="h-16 w-16 rounded-full object-cover" />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="rounded bg-black px-3 py-2 text-white">
        Simpan
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Build the create page**

Create `src/app/orang/baru/page.tsx`:

```tsx
import { db } from "@/lib/db";
import PersonForm from "@/components/PersonForm";

export default async function NewPersonPage() {
  const allPeople = await db.person.findMany({ select: { id: true, nama: true }, orderBy: { nama: "asc" } });

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-xl font-semibold">Tambah Orang</h1>
      <PersonForm allPeople={allPeople} />
    </main>
  );
}
```

- [ ] **Step 3: Build the edit page**

Create `src/app/orang/[id]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import PersonForm from "@/components/PersonForm";

export default async function EditPersonPage({ params }: { params: { id: string } }) {
  const [person, allPeople] = await Promise.all([
    db.person.findUnique({ where: { id: params.id } }),
    db.person.findMany({ select: { id: true, nama: true }, orderBy: { nama: "asc" } }),
  ]);

  if (!person) notFound();

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-xl font-semibold">Edit Orang</h1>
      <PersonForm initial={person} allPeople={allPeople} />
    </main>
  );
}
```

- [ ] **Step 4: Manually verify**

Run: `npm run dev`. Go to `/orang/baru`, fill the form, upload a photo, pick an atasan, submit — expect redirect to `/orang` with the new row visible. Edit that same person, change jabatan, submit — expect the change reflected. Try setting a person's atasan to one of their own descendants — expect the "Pilihan atasan ini akan membuat siklus" error shown inline.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add person create/edit forms"
```

---

### Task 10: Org chart page (`/`)

**Files:**
- Create: `src/components/OrgChart.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `buildTree`, `PersonNode` (Task 4), `GET /api/orang` (Task 6).
- Produces: `/` renders the full org tree; exposes a `<div id="org-chart-capture">` wrapper that Task 11's export buttons will screenshot.

- [ ] **Step 1: Install the chart library**

```bash
npm install react-organizational-chart
```

- [ ] **Step 2: Build the chart component**

Create `src/components/OrgChart.tsx`:

```tsx
"use client";

import { Tree, TreeNode } from "react-organizational-chart";
import type { PersonNode } from "@/lib/tree";

function Card({ node }: { node: PersonNode }) {
  return (
    <div className="inline-flex flex-col items-center gap-1 rounded border bg-white p-3 shadow-sm">
      {node.fotoUrl ? (
        <img src={node.fotoUrl} alt={node.nama} className="h-14 w-14 rounded-full object-cover" />
      ) : (
        <div className="h-14 w-14 rounded-full bg-gray-200" />
      )}
      <p className="font-semibold">{node.nama}</p>
      <p className="text-sm text-gray-600">{node.jabatan}</p>
      {node.divisi && <p className="text-xs text-gray-400">{node.divisi}</p>}
    </div>
  );
}

function renderNode(node: PersonNode) {
  return (
    <TreeNode key={node.id} label={<Card node={node} />}>
      {node.children.map((child) => renderNode(child))}
    </TreeNode>
  );
}

export default function OrgChart({ roots }: { roots: PersonNode[] }) {
  if (roots.length === 0) {
    return <p className="text-gray-500">Belum ada data orang.</p>;
  }

  return (
    <div id="org-chart-capture" className="inline-block bg-white p-4">
      {roots.map((root) => (
        <Tree key={root.id} label={<Card node={root} />} lineWidth="2px" lineColor="#bbb" lineBorderRadius="8px">
          {root.children.map((child) => renderNode(child))}
        </Tree>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire up the page**

Replace `src/app/page.tsx`:

```tsx
import { db } from "@/lib/db";
import { buildTree } from "@/lib/tree";
import OrgChart from "@/components/OrgChart";

export default async function HomePage() {
  const people = await db.person.findMany();
  const roots = buildTree(people);

  return (
    <main className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Struktur Organisasi</h1>
      <div className="overflow-auto">
        <OrgChart roots={roots} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Manually verify**

Run: `npm run dev`, visit `/`. Expected: people entered in earlier tasks render as a connected tree matching their `atasanId` relationships; someone with no `atasanId` (or a broken one) appears as a separate root tree.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add org chart page"
```

---

### Task 11: Export to PNG/PDF

**Files:**
- Create: `src/components/ExportButtons.tsx`
- Modify: `src/app/page.tsx` (render `<ExportButtons />`)

**Interfaces:**
- Consumes: the `#org-chart-capture` DOM node from Task 10.
- Produces: two buttons, "Export PNG" and "Export PDF", that download the current chart.

- [ ] **Step 1: Install export libraries**

```bash
npm install html-to-image jspdf
```

- [ ] **Step 2: Build the export buttons**

Create `src/components/ExportButtons.tsx`:

```tsx
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
```

- [ ] **Step 3: Wire into the chart page**

In `src/app/page.tsx`, import `ExportButtons` and render it above `<OrgChart roots={roots} />`:

```tsx
import ExportButtons from "@/components/ExportButtons";
```

```tsx
<ExportButtons />
<div className="overflow-auto">
  <OrgChart roots={roots} />
</div>
```

- [ ] **Step 4: Manually verify**

Run: `npm run dev`, visit `/` with at least a couple of people in the chart. Click "Export PNG" — expect a `struktur-organisasi.png` download that visually matches the on-screen chart. Click "Export PDF" — expect a `struktur-organisasi.pdf` download that opens and shows the same chart.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add PNG/PDF export for org chart"
```

---

## Post-plan checklist (manual, not a task)

- Confirm no page or API route requires a session — open `/`, `/orang`, `/orang/baru` in a fresh incognito window with no cookies and confirm all work.
- Run `npm test` — all Vitest suites (`cycle.test.ts`, `tree.test.ts`) pass.
