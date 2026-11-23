// Runs the Postgres store against an in-memory PGlite (real Postgres engine, no server needed).
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { createPgStore } from '../src/lib/store-pg.ts';
const db = new PGlite();
const store = createPgStore(async (t, p) => p?.length ? db.query(t, p) : { rows: ((await db.exec(t)).at(-1)?.rows ?? []) });
const base = { doctorNameEn: '', specialty: 'x', phone: '', whatsapp: '', email: '', clinicAddress: '', mapsUrl: '', website: '', bio: '', portraitData: null, consentPhoto: false };
const portrait = 'data:image/jpeg;base64,/9j/2Q==';
const a = await store.createCard({ ...base, doctorNameAr: 'أ', edition: 'STANDARD', consentProfile: true, consentPhoto: true, portraitData: portrait });
const b = await store.createCard({ ...base, doctorNameAr: 'ب', edition: 'LIMITED', consentProfile: true });
assert.equal(a.serial, 'AZM-S001'); assert.equal(b.serial, 'AZM-L002'); assert.match(a.token, /^[A-Za-z0-9_-]{32}$/);
assert.equal((await store.getPublicCard(a.token)).doctorNameAr, 'أ');
assert.equal((await store.getCardForPrint(a.token)).portraitData, portrait, 'consented portrait is available to print service');
await store.getPublicCard(a.token);
assert.equal((await store.listCards()).find((c) => c.id === a.id).scans, 2);
assert.equal((await store.updateCard(a.token, { status: 'SUSPENDED' })).status, 'SUSPENDED');
assert.equal(await store.getPublicCard(a.token), null);
assert.equal(await store.getCardForPrint(a.token), null);
const d = await store.updateCard(b.token, { distributionStatus: 'DISTRIBUTED' });
assert.ok(d.distributedAt);
assert.equal(await store.updateCard('nope', { status: 'ACTIVE' }), null);
const blanks = await store.createBlankCards(3);
assert.equal(blanks.length, 3); assert.ok(blanks.every((card) => card.status === 'UNCLAIMED' && !card.doctorNameAr));
const unclaimed = await store.getUnclaimedCard(blanks[0].token); assert.equal(unclaimed.serial, blanks[0].serial);
assert.equal((await store.getCardForPrint(blanks[0].token)).status, 'UNCLAIMED');
const claim = { doctorNameAr: 'تفعيل', doctorNameEn: '', specialty: '', phone: '', whatsapp: '', email: '', clinicAddress: '', mapsUrl: '', website: '', bio: '', portraitData: null, consentPhoto: false };
assert.equal((await store.claimUnclaimedCard(blanks[0].token, claim)).status, 'ACTIVE');
assert.equal(await store.getUnclaimedCard(blanks[0].token), null);
assert.equal(await store.claimUnclaimedCard(blanks[0].token, claim), null, 'claim must be one-time');
// Extended profile sections round-trip through the jsonb column (create, update, claim).
const extras = { workplaces: ['مستشفى'], bookingUrl: 'https://book.example/', bookingPhone: '0100', hours: [{ day: 1, open: true, from: '17:00', to: '22:00' }], hoursNote: '', credentials: ['MD'], services: ['إيكو'], fees: { consultation: '500', followUp: '' }, insurance: [] };
assert.deepEqual((await store.createCard({ ...base, doctorNameAr: 'ج', edition: 'STANDARD', consentProfile: true, extras })).extras.services, ['إيكو']);
assert.deepEqual((await store.updateCard(b.token, { extras: { ...extras, credentials: ['PhD'] } })).extras.credentials, ['PhD']);
assert.deepEqual((await store.listCards()).find((c) => c.id === a.id).extras.workplaces, [], 'cards created without extras read back empty');
assert.deepEqual((await store.claimUnclaimedCard(blanks[1].token, { ...claim, extras })).extras.hours[0].to, '22:00');
await store.cleanupExpiredScans();
// Simulate an existing pre-portrait schema: CREATE TABLE IF NOT EXISTS leaves it intact,
// then the idempotent ALTER TABLE migration must add the new column.
const legacyDb = new PGlite();
const legacyStore = createPgStore(async (text, params) => {
  const compatibleSql = text.replace('portrait_data text, created_at', 'created_at');
  return params?.length ? legacyDb.query(compatibleSql, params) : { rows: ((await legacyDb.exec(compatibleSql)).at(-1)?.rows ?? []) };
});
const migrated = await legacyStore.createCard({ ...base, doctorNameAr: 'قديم', edition: 'STANDARD', consentProfile: true, consentPhoto: true, portraitData: portrait });
assert.equal((await legacyStore.getCardForPrint(migrated.token)).portraitData, portrait, 'legacy schema must migrate safely with portrait column');
console.log('PG store tests passed, including legacy portrait migration');
