import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { emptyExtras, normalizeExtras, type ProfileExtras } from './profile-extras';

export type DoctorCard = {
  id: string;
  doctorNameAr: string;
  doctorNameEn: string;
  specialty: string;
  phone: string;
  whatsapp: string;
  email: string;
  clinicAddress: string;
  mapsUrl: string;
  website: string;
  bio: string;
  portraitData: string | null;
  extras: ProfileExtras;
  serial: string;
  token: string;
  edition: 'STANDARD' | 'LIMITED' | 'DEMO';
  status: 'UNCLAIMED' | 'ACTIVE' | 'SUSPENDED';
  distributionStatus: 'NOT_DISTRIBUTED' | 'DISTRIBUTED';
  distributedAt?: string;
  consentProfile: boolean;
  consentPhoto: boolean;
  createdAt: string;
};
type ScanEvent = { cardId: string; at: string };
type Store = { cards: DoctorCard[]; scans: ScanEvent[]; monthly: Record<string, number> };
const dataDir = path.join(process.cwd(), '.data');
const dataFile = path.join(dataDir, 'store.json');
let writeQueue: Promise<unknown> = Promise.resolve();

// P1 local development adapter only. Replace with PostgreSQL/Prisma before any real or production data.
async function readStore(): Promise<Store> {
  try {
    const raw = JSON.parse(await readFile(dataFile, 'utf8')) as Partial<Store>;
    return { cards: (raw.cards ?? []).map((card) => ({ ...card, portraitData: card.portraitData ?? null, extras: normalizeExtras(card.extras), distributionStatus: card.distributionStatus ?? 'NOT_DISTRIBUTED' })), scans: raw.scans ?? [], monthly: raw.monthly ?? {} };
  } catch { return { cards: [], scans: [], monthly: {} }; }
}
async function writeStore(store: Store) {
  await mkdir(dataDir, { recursive: true });
  const temp = `${dataFile}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(store, null, 2), 'utf8');
  await rename(temp, dataFile);
}
async function mutate<T>(fn: (store: Store) => T | Promise<T>): Promise<T> {
  let resolve!: (value: T) => void; let reject!: (reason?: unknown) => void;
  const result = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  writeQueue = writeQueue.then(async () => {
    try { const store = await readStore(); const value = await fn(store); await writeStore(store); resolve(value); }
    catch (error) { reject(error); }
  });
  await result; return result;
}
function pruneEvents(store: Store, now = Date.now()) {
  const cutoff = now - 60 * 24 * 60 * 60 * 1000;
  store.scans = store.scans.filter((event) => new Date(event.at).getTime() >= cutoff);
}
export async function cleanupExpiredScans() {
  await mutate((store) => { pruneEvents(store); });
}
export async function listCards() {
  const store = await readStore();
  return store.cards.map((card) => ({ ...card, scans: Object.entries(store.monthly).filter(([key]) => key.startsWith(`${card.id}:`)).reduce((sum, [, count]) => sum + count, 0) }));
}
export async function createCard(input: Omit<DoctorCard, 'id' | 'token' | 'createdAt' | 'status' | 'serial' | 'distributionStatus'>) {
  return mutate((store) => {
    const sequence = store.cards.length + 1;
    const prefix = input.edition === 'LIMITED' ? 'AZM-L' : input.edition === 'DEMO' ? 'AZM-D' : 'AZM-S';
    const card: DoctorCard = { ...input, id: randomUUID(), serial: `${prefix}${String(sequence).padStart(3, '0')}`, token: randomBytes(24).toString('base64url'), status: 'ACTIVE', distributionStatus: 'NOT_DISTRIBUTED', createdAt: new Date().toISOString() };
    store.cards.unshift(card); return card;
  });
}
export async function createBlankCards(count: number) {
  return mutate((store) => {
    const start = store.cards.length;
    const cards = Array.from({ length: count }, (_, index): DoctorCard => ({
      id: randomUUID(), token: randomBytes(24).toString('base64url'), serial: `AZM-S${String(start + index + 1).padStart(3, '0')}`,
      doctorNameAr: '', doctorNameEn: '', specialty: '', phone: '', whatsapp: '', email: '', clinicAddress: '', mapsUrl: '', website: '', bio: '', portraitData: null, extras: emptyExtras(),
      edition: 'STANDARD', status: 'UNCLAIMED', distributionStatus: 'NOT_DISTRIBUTED', consentProfile: false, consentPhoto: false, createdAt: new Date().toISOString(),
    }));
    store.cards.unshift(...cards);
    return cards;
  });
}
export async function getUnclaimedCard(token: string) {
  return mutate((store) => {
    const card = store.cards.find((item) => item.token === token && item.status === 'UNCLAIMED');
    if (!card) return null;
    const now = new Date(); const month = now.toISOString().slice(0, 7); const key = `${card.id}:${month}`;
    store.monthly[key] = (store.monthly[key] ?? 0) + 1; store.scans.push({ cardId: card.id, at: now.toISOString() }); pruneEvents(store, now.getTime());
    return { serial: card.serial };
  });
}
type ClaimInput = Pick<DoctorCard, 'doctorNameAr' | 'doctorNameEn' | 'specialty' | 'phone' | 'whatsapp' | 'email' | 'clinicAddress' | 'mapsUrl' | 'website' | 'bio' | 'portraitData' | 'extras' | 'consentPhoto'>;
export async function claimUnclaimedCard(token: string, profile: ClaimInput) {
  return mutate((store) => {
    const card = store.cards.find((item) => item.token === token && item.status === 'UNCLAIMED');
    if (!card) return null;
    Object.assign(card, profile, { consentProfile: true, status: 'ACTIVE' as const });
    return card;
  });
}
export async function updateCard(token: string, patch: Partial<Pick<DoctorCard, 'doctorNameAr' | 'doctorNameEn' | 'specialty' | 'phone' | 'whatsapp' | 'email' | 'clinicAddress' | 'mapsUrl' | 'website' | 'bio' | 'portraitData' | 'extras' | 'edition' | 'status' | 'distributionStatus' | 'consentProfile' | 'consentPhoto'>>) {
  return mutate((store) => {
    const card = store.cards.find((item) => item.token === token); if (!card) return null;
    Object.assign(card, patch);
    if (patch.distributionStatus) card.distributedAt = patch.distributionStatus === 'DISTRIBUTED' ? new Date().toISOString() : undefined;
    return card;
  });
}
export async function getCardForPrint(token: string) {
  const store = await readStore(); const card = store.cards.find((item) => item.token === token);
  if (!card || (card.status !== 'UNCLAIMED' && (card.status !== 'ACTIVE' || !card.consentProfile))) return null;
  const { doctorNameAr, doctorNameEn, specialty, serial, token: qrToken, edition, portraitData, status } = card;
  return { doctorNameAr, doctorNameEn, specialty, serial, token: qrToken, edition, status, portraitData: card.consentPhoto ? portraitData : null };
}
export async function getPublicCardSnapshot(token: string) {
  const store = await readStore();
  const card = store.cards.find((item) => item.token === token);
  return card && card.status === 'ACTIVE' && card.consentProfile ? card : null;
}
export async function getPublicCard(token: string) {
  return mutate((store) => {
    const card = store.cards.find((item) => item.token === token);
    if (!card || card.status !== 'ACTIVE' || !card.consentProfile) return null;
    const now = new Date(); const month = now.toISOString().slice(0, 7); const key = `${card.id}:${month}`;
    store.monthly[key] = (store.monthly[key] ?? 0) + 1;
    store.scans.push({ cardId: card.id, at: now.toISOString() }); pruneEvents(store, now.getTime());
    return card;
  });
}
