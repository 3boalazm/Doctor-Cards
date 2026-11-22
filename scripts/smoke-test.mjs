import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
let createdToken;
try {
  const login = await fetch(`${base}/api/auth`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || 'doctorcards-preview-only' }) });
  assert.equal(login.status, 200, 'local admin login should succeed');
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie, 'login should set an HttpOnly session cookie');
  const headers = { 'content-type': 'application/json', cookie };
  const denied = await fetch(`${base}/api/cards`);
  assert.equal(denied.status, 401, 'admin listing must reject unauthenticated requests');
  const invalid = await fetch(`${base}/api/cards`, { method: 'POST', headers, body: JSON.stringify({ doctorNameAr: 'ناقص موافقة' }) });
  assert.equal(invalid.status, 400, 'profile publication must require recorded consent');
  const create = await fetch(`${base}/api/cards`, { method: 'POST', headers, body: JSON.stringify({ doctorNameAr: 'اختبار تكاملي', doctorNameEn: 'Integration Test', specialty: 'اختبار', phone: '+201000000000', email: 'test@example.test', edition: 'DEMO', consentProfile: true, consentPhoto: false }) });
  assert.equal(create.status, 201, 'authorized admin should create a demo card');
  const card = await create.json(); createdToken = card.token;
  assert.match(card.serial, /^AZM-D\d{3}$/);
  assert.match(card.token, /^[A-Za-z0-9_-]{32}$/);
  const profileResponse = await fetch(`${base}/api/cards/${card.token}`);
  assert.equal(profileResponse.status, 200, 'active QR route should resolve a published profile');
  const profile = await profileResponse.json();
  assert.equal(profile.doctorNameAr, 'اختبار تكاملي');
  assert.equal('serial' in profile, false, 'public profile must not expose internal serial');
  assert.equal('token' in profile, false, 'public profile must not expose token');
  const vcfResponse = await fetch(`${base}/api/cards/${card.token}/vcf`);
  assert.equal(vcfResponse.status, 200);
  assert.match(vcfResponse.headers.get('content-type'), /text\/vcard/);
  const vcf = await vcfResponse.text();
  assert.match(vcf, /VERSION:3\.0\r\n/);
  assert.match(vcf, /FN:اختبار تكاملي \/ Integration Test\r\n/);
  assert.match(vcf, /TEL;TYPE=WORK,VOICE:\+201000000000\r\n/);
  const suspend = await fetch(`${base}/api/cards/${card.token}`, { method: 'PATCH', headers, body: JSON.stringify({ action: 'toggle-status', status: 'SUSPENDED' }) });
  assert.equal(suspend.status, 200);
  const hidden = await fetch(`${base}/api/cards/${card.token}`);
  assert.equal(hidden.status, 404, 'suspended card must hide its profile');
  const reactivate = await fetch(`${base}/api/cards/${card.token}`, { method: 'PATCH', headers, body: JSON.stringify({ action: 'toggle-status', status: 'ACTIVE' }) });
  assert.equal(reactivate.status, 200);
  const distribution = await fetch(`${base}/api/cards/${card.token}`, { method: 'PATCH', headers, body: JSON.stringify({ action: 'toggle-distribution', distributionStatus: 'DISTRIBUTED' }) });
  assert.equal(distribution.status, 200);
  console.log('Smoke tests passed: login, access control, consent validation, create, QR privacy, suspension, and distribution.');
} finally {
  // Remove only the synthetic test record; never mutate the demo or operational records.
  if (createdToken) {
    try {
      const file = new URL('../.data/store.json', import.meta.url);
      const store = JSON.parse(await readFile(file, 'utf8'));
      const removed = store.cards.filter((item) => item.token === createdToken).map((item) => item.id);
      store.cards = store.cards.filter((item) => item.token !== createdToken);
      store.scans = store.scans.filter((event) => !removed.includes(event.cardId));
      for (const key of Object.keys(store.monthly)) if (removed.some((id) => key.startsWith(`${id}:`))) delete store.monthly[key];
      await writeFile(file, JSON.stringify(store, null, 2));
    } catch { /* Test server may use a different storage path; synthetic test data is clearly named. */ }
  }
}
