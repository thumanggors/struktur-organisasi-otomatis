import { db } from "@/lib/db";

const SETTINGS_ID = "settings";

export async function getSettings() {
  return db.settings.findUnique({ where: { id: SETTINGS_ID } });
}

export async function saveSettings(data: { companyName: string | null; logoUrl: string | null }) {
  return db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });
}
