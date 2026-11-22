import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const createdTokens = [];
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
  const create = await fetch(`${base}/api/cards`, { method: 'POST', headers, body: JSON.stringify({ doctorNameAr: 'اختبار تكاملي', doctorNameEn: 'Integration Test', specialty: 'اختبار', phone: '+201000000000', email: 'test@example.test', portraitData: 'data:image/jpeg;base64,/9j/2Q==', edition: 'DEMO', consentProfile: true, consentPhoto: true }) });
  assert.equal(create.status, 201, 'authorized admin should create a demo card');
  const card = await create.json(); createdTokens.push(card.token);
  assert.match(card.serial, /^AZM-D\d{3}$/);
  assert.match(card.token, /^[A-Za-z0-9_-]{32}$/);
  const profileResponse = await fetch(`${base}/api/cards/${card.token}`);
  assert.equal(profileResponse.status, 200, 'active QR route should resolve a published profile');
  const profile = await profileResponse.json();
  assert.equal(profile.doctorNameAr, 'اختبار تكاملي');
  assert.equal(profile.portraitData, 'data:image/jpeg;base64,/9j/2Q==', 'consented portrait should render on public profile');
  assert.equal('serial' in profile, false, 'public profile must not expose internal serial');
  assert.equal('token' in profile, false, 'public profile must not expose token');
  const printResponse = await fetch(`${base}/api/cards/${card.token}?mode=print`);
  assert.equal((await printResponse.json()).portraitData, 'data:image/jpeg;base64,/9j/2Q==');
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
  const bulk = await fetch(`${base}/api/cards/bulk`, { method: 'POST', headers, body: JSON.stringify({ count: 2 }) });
  assert.equal(bulk.status, 201, 'admin should bulk-generate blank cards');
  const blankCards = (await bulk.json()).cards; assert.equal(blankCards.length, 2);
  const blank = blankCards[0]; createdTokens.push(...blankCards.map((item) => item.token));
  assert.equal(blank.status, 'UNCLAIMED'); assert.equal(blank.doctorNameAr, '');
  const claimLanding = await fetch(`${base}/api/cards/${blank.token}`);
  const claimPayload = await claimLanding.json();
  assert.equal(claimPayload.state, 'UNCLAIMED'); assert.equal(claimPayload.serial, blank.serial);
  const claimData = { doctorNameAr: 'طبيب مستلم', doctorNameEn: 'Claimed Doctor', specialty: 'باطنة', phone: '+201111111111', consentProfile: true };
  const claimed = await fetch(`${base}/api/cards/${blank.token}/claim`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(claimData) });
  assert.equal(claimed.status, 200, 'doctor may claim a blank card after explicit consent');
  const claimedProfile = await (await fetch(`${base}/api/cards/${blank.token}`)).json();
  assert.equal(claimedProfile.state, 'ACTIVE'); assert.equal(claimedProfile.doctorNameAr, 'طبيب مستلم');
  const duplicateClaim = await fetch(`${base}/api/cards/${blank.token}/claim`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(claimData) });
  assert.equal(duplicateClaim.status, 409, 'a card must not be claimed twice');
  console.log('Smoke tests passed: auth, create, portrait, QR privacy, suspension, distribution, bulk blank generation, and claim flow.');
} finally {
  // Remove only the synthetic test record; never mutate the demo or operational records.
  if (createdTokens.length) {
    try {
      const file = new URL('../.data/store.json', import.meta.url);
      const store = JSON.parse(await readFile(file, 'utf8'));
      const removed = store.cards.filter((item) => createdTokens.includes(item.token)).map((item) => item.id);
      store.cards = store.cards.filter((item) => !createdTokens.includes(item.token));
      store.scans = store.scans.filter((event) => !removed.includes(event.cardId));
      for (const key of Object.keys(store.monthly)) if (removed.some((id) => key.startsWith(`${id}:`))) delete store.monthly[key];
      await writeFile(file, JSON.stringify(store, null, 2));
    } catch { /* Test server may use a different storage path; synthetic test data is clearly named. */ }
  }
}
