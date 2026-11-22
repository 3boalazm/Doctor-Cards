import { randomBytes, randomUUID } from 'node:crypto';
import type { DoctorCard } from './store-json';

export type Query = (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
type Create = Omit<DoctorCard, 'id' | 'token' | 'createdAt' | 'status' | 'serial' | 'distributionStatus'>;
type Patch = Partial<Pick<DoctorCard, 'doctorNameAr' | 'doctorNameEn' | 'specialty' | 'phone' | 'whatsapp' | 'email' | 'clinicAddress' | 'mapsUrl' | 'website' | 'bio' | 'edition' | 'status' | 'distributionStatus' | 'consentProfile' | 'consentPhoto'>>;

const SCHEMA = `
CREATE SEQUENCE IF NOT EXISTS dc_serial_seq;
CREATE TABLE IF NOT EXISTS dc_cards (
  id uuid PRIMARY KEY, token text UNIQUE NOT NULL, serial text UNIQUE NOT NULL,
  doctor_name_ar text NOT NULL, doctor_name_en text NOT NULL DEFAULT '', specialty text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '', whatsapp text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '',
  clinic_address text NOT NULL DEFAULT '', maps_url text NOT NULL DEFAULT '', website text NOT NULL DEFAULT '', bio text NOT NULL DEFAULT '',
  edition text NOT NULL DEFAULT 'STANDARD', status text NOT NULL DEFAULT 'ACTIVE', distribution_status text NOT NULL DEFAULT 'NOT_DISTRIBUTED',
  distributed_at timestamptz, consent_profile boolean NOT NULL DEFAULT false, consent_photo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dc_scans (card_id uuid NOT NULL REFERENCES dc_cards(id) ON DELETE CASCADE, at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS dc_scans_at ON dc_scans(at);
CREATE TABLE IF NOT EXISTS dc_monthly (card_id uuid NOT NULL REFERENCES dc_cards(id) ON DELETE CASCADE, month text NOT NULL, count integer NOT NULL DEFAULT 0, PRIMARY KEY (card_id, month));`;

const COL: Record<string, string> = { doctorNameAr: 'doctor_name_ar', doctorNameEn: 'doctor_name_en', specialty: 'specialty', phone: 'phone', whatsapp: 'whatsapp', email: 'email', clinicAddress: 'clinic_address', mapsUrl: 'maps_url', website: 'website', bio: 'bio', edition: 'edition', status: 'status', distributionStatus: 'distribution_status', consentProfile: 'consent_profile', consentPhoto: 'consent_photo' };
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? new Date(String(v)).toISOString() : undefined);
function toCard(r: Record<string, unknown>): DoctorCard {
  return { id: String(r.id), token: String(r.token), serial: String(r.serial), doctorNameAr: String(r.doctor_name_ar), doctorNameEn: String(r.doctor_name_en), specialty: String(r.specialty), phone: String(r.phone), whatsapp: String(r.whatsapp), email: String(r.email), clinicAddress: String(r.clinic_address), mapsUrl: String(r.maps_url), website: String(r.website), bio: String(r.bio), edition: r.edition as DoctorCard['edition'], status: r.status as DoctorCard['status'], distributionStatus: r.distribution_status as DoctorCard['distributionStatus'], distributedAt: iso(r.distributed_at), consentProfile: Boolean(r.consent_profile), consentPhoto: Boolean(r.consent_photo), createdAt: iso(r.created_at)! };
}

export function createPgStore(query: Query) {
  let ready: Promise<unknown> | null = null;
  const init = () => (ready ??= query(SCHEMA).catch((e) => { ready = null; throw e; }));
  return {
    async listCards() {
      await init();
      const { rows } = await query(`SELECT c.*, COALESCE((SELECT SUM(count) FROM dc_monthly m WHERE m.card_id = c.id), 0)::int AS scans FROM dc_cards c ORDER BY c.created_at DESC`);
      return rows.map((r) => ({ ...toCard(r), scans: Number(r.scans) }));
    },
    async createCard(input: Create) {
      await init();
      const prefix = input.edition === 'LIMITED' ? 'AZM-L' : input.edition === 'DEMO' ? 'AZM-D' : 'AZM-S';
      const { rows } = await query(
        `INSERT INTO dc_cards (id, token, serial, doctor_name_ar, doctor_name_en, specialty, phone, whatsapp, email, clinic_address, maps_url, website, bio, edition, consent_profile, consent_photo)
         VALUES ($1,$2,$3 || lpad(nextval('dc_serial_seq')::text, 3, '0'),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [randomUUID(), randomBytes(24).toString('base64url'), prefix, input.doctorNameAr, input.doctorNameEn, input.specialty, input.phone, input.whatsapp, input.email, input.clinicAddress, input.mapsUrl, input.website, input.bio, input.edition, input.consentProfile, input.consentPhoto]);
      return toCard(rows[0]);
    },
    async updateCard(token: string, patch: Patch) {
      await init();
      const sets: string[] = []; const params: unknown[] = [token];
      for (const [k, v] of Object.entries(patch)) { if (v === undefined || !COL[k]) continue; params.push(v); sets.push(`${COL[k]} = $${params.length}`); }
      if (patch.distributionStatus) sets.push(patch.distributionStatus === 'DISTRIBUTED' ? 'distributed_at = now()' : 'distributed_at = NULL');
      if (!sets.length) return null;
      const { rows } = await query(`UPDATE dc_cards SET ${sets.join(', ')} WHERE token = $1 RETURNING *`, params);
      return rows[0] ? toCard(rows[0]) : null;
    },
    async getCardForPrint(token: string) {
      await init();
      const { rows } = await query(`SELECT * FROM dc_cards WHERE token = $1 AND status = 'ACTIVE' AND consent_profile`, [token]);
      if (!rows[0]) return null;
      const c = toCard(rows[0]);
      return { doctorNameAr: c.doctorNameAr, doctorNameEn: c.doctorNameEn, specialty: c.specialty, serial: c.serial, token: c.token, edition: c.edition };
    },
    async getPublicCardSnapshot(token: string) {
      await init();
      const { rows } = await query(`SELECT * FROM dc_cards WHERE token = $1 AND status = 'ACTIVE' AND consent_profile`, [token]);
      return rows[0] ? toCard(rows[0]) : null;
    },
    async getPublicCard(token: string) {
      await init();
      const { rows } = await query(`SELECT * FROM dc_cards WHERE token = $1 AND status = 'ACTIVE' AND consent_profile`, [token]);
      if (!rows[0]) return null;
      const c = toCard(rows[0]);
      await query(`INSERT INTO dc_monthly (card_id, month, count) VALUES ($1, to_char(now() at time zone 'utc','YYYY-MM'), 1) ON CONFLICT (card_id, month) DO UPDATE SET count = dc_monthly.count + 1`, [c.id]);
      await query(`INSERT INTO dc_scans (card_id) VALUES ($1)`, [c.id]);
      await query(`DELETE FROM dc_scans WHERE at < now() - interval '60 days'`);
      return c;
    },
    async cleanupExpiredScans() { await init(); await query(`DELETE FROM dc_scans WHERE at < now() - interval '60 days'`); },
  };
}
