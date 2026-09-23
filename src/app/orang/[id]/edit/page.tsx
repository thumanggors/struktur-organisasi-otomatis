import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import PersonForm from "@/components/PersonForm";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [person, allPeople] = await Promise.all([
    db.person.findUnique({ where: { id } }),
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
