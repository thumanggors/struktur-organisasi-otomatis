import { db } from "@/lib/db";
import PersonForm from "@/components/PersonForm";

export const dynamic = "force-dynamic";

export default async function NewPersonPage() {
  const allPeople = await db.person.findMany({ select: { id: true, nama: true }, orderBy: { nama: "asc" } });

  return (
    <div className="mx-auto max-w-md p-6 md:p-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Tambah Orang</h1>
      <PersonForm allPeople={allPeople} />
    </div>
  );
}
