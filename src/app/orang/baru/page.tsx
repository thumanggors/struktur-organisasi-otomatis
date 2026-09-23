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
