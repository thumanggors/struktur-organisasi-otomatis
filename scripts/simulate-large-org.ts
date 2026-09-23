/**
 * Generates a large, realistic org structure to prove the app holds up at
 * scale: 10 divisions, several layers of management per division, and
 * enough leaf staff under each supervisor to exercise the chart's
 * many-children grid layout. Jabatan/nama are free text — nothing here is
 * a fixed enum, matching the app's "unlimited positions/people" model.
 *
 * Usage: npx tsx scripts/simulate-large-org.ts [staffPerSupervisor]
 * Builds on top of whatever root (top-level person) already exists, or
 * creates one named "Direktur Utama" if the database is empty.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DIVISIONS = [
  "Finance",
  "HR",
  "Operations",
  "Marketing",
  "Sales",
  "IT",
  "Legal",
  "Procurement",
  "R&D",
  "Customer Service",
];

const SUPERVISORS_PER_DIVISION = 5;
const STAFF_PER_SUPERVISOR = Number(process.argv[2]) || 9;

async function main() {
  let root = await prisma.person.findFirst({ where: { atasanId: null } });
  if (!root) {
    root = await prisma.person.create({ data: { nama: "Direktur Utama", jabatan: "Direktur" } });
  }

  await prisma.person.create({
    data: { nama: "Wakil Direktur Utama", jabatan: "Wakil Direktur", atasanId: root.id },
  });
  await prisma.person.create({
    data: { nama: "Sekretaris Direktur", jabatan: "Sekretaris", atasanId: root.id },
  });

  let created = 2;

  for (const divisi of DIVISIONS) {
    const manager = await prisma.person.create({
      data: { nama: `Manager ${divisi}`, jabatan: `${divisi} Manager`, divisi, atasanId: root.id },
    });
    created++;

    for (let s = 1; s <= SUPERVISORS_PER_DIVISION; s++) {
      const supervisor = await prisma.person.create({
        data: { nama: `Supervisor ${divisi} ${s}`, jabatan: "Supervisor", divisi, atasanId: manager.id },
      });
      created++;

      for (let st = 1; st <= STAFF_PER_SUPERVISOR; st++) {
        await prisma.person.create({
          data: { nama: `Staff ${divisi} ${s}-${st}`, jabatan: "Staff", divisi, atasanId: supervisor.id },
        });
        created++;
      }
    }
  }

  console.log(
    `Created ${created} people across ${DIVISIONS.length} divisions under "${root.nama}" (${SUPERVISORS_PER_DIVISION} supervisors x ${STAFF_PER_SUPERVISOR} staff per division).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
