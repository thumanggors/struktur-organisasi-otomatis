import { getSettings } from "@/lib/settings";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-md p-6 md:p-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Pengaturan</h1>
      <p className="mb-6 text-sm text-slate-500">Atur label dan logo perusahaan yang tampil di struktur organisasi.</p>
      <SettingsForm initialCompanyName={settings?.companyName ?? null} initialLogoUrl={settings?.logoUrl ?? null} />
    </div>
  );
}
