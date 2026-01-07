import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Role } from "../auth/jwt";
import { getScopeUserIds } from "./access";

/**
 * SK16: evidencija aktivnosti (beleške, pozivi, sastanci).
 * Pošto nema Activity model u Prisma šemi, čuvamo aktivnosti u JSON fajlu.
 * Ovo ispunjava funkcionalni zahtev bez dodatnih migracija.
 */

export type ActivityType = "note" | "call" | "meeting";
export type ActivityEntityType = "clientCompany" | "opportunity";

export type Activity = {
  id: string;
  userId: number;
  entityType: ActivityEntityType;
  entityId: number;
  type: ActivityType;
  description: string;
  createdAt: string; // ISO.
};

type Store = { activities: Activity[] };

const FILE = path.join(process.cwd(), "data", "activities.json");

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return JSON.parse(raw) as Store;
  } catch {
    return { activities: [] };
  }
}

async function writeStore(data: Store) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function createActivity(
  auth: { userId: number; role: Role },
  input: { entityType: ActivityEntityType; entityId: number; type: ActivityType; description: string }
) {
  if (!input.description?.trim()) {
    throw Object.assign(new Error("Opis aktivnosti je obavezan."), { status: 422 });
  }

  const store = await readStore();

  const activity: Activity = {
    id: randomUUID(),
    userId: auth.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    type: input.type,
    description: input.description.trim(),
    createdAt: new Date().toISOString(),
  };

  store.activities.unshift(activity);
  await writeStore(store);

  return activity;
}

export async function listActivities(
  auth: { userId: number; role: Role },
  filter?: { entityType?: ActivityEntityType; entityId?: number }
) {
  const store = await readStore();
  const scopeUserIds = await getScopeUserIds(auth.userId, auth.role);

  let result = store.activities;

  // Admin: sve, ostali: samo svoje/timske.
  if (scopeUserIds) {
    result = result.filter((a) => scopeUserIds.includes(a.userId));
  }

  if (filter?.entityType) result = result.filter((a) => a.entityType === filter.entityType);
  if (filter?.entityId) result = result.filter((a) => a.entityId === filter.entityId);

  return result.slice(0, 200);
}
