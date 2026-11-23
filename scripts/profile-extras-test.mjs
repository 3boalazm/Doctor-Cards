import assert from 'node:assert/strict';
import { normalizeExtras, openStatus, sanitizeExtras } from '../src/lib/profile-extras.ts';

// Lists accept newline text or arrays; trimmed, de-duplicated, capped.
const extras = sanitizeExtras({ workplaces: ' مستشفى أ \n\nمستشفى أ\nمركز ب', services: Array.from({ length: 30 }, (_, i) => `s${i}`), bookingUrl: 'http://insecure.example', bookingPhone: '0100', credentials: ['<b>x</b>'] });
assert.deepEqual(extras.workplaces, ['مستشفى أ', 'مركز ب']);
assert.equal(extras.services.length, 16);
assert.equal(extras.bookingUrl, '', 'non-HTTPS booking links are dropped');
assert.equal(sanitizeExtras({ bookingUrl: 'https://book.example/dr' }).bookingUrl, 'https://book.example/dr');
assert.deepEqual(extras.credentials, ['<b>x</b>'], 'text is stored as plain text (React escapes on render)');

// Hours: invalid times close the day; a week with no open day collapses to [].
assert.deepEqual(sanitizeExtras({ hours: [{ day: 1, open: true, from: '25:00', to: '10:00' }] }).hours, []);
const week = sanitizeExtras({ hours: [{ day: 1, open: true, from: '17:00', to: '22:00' }, { day: 2, open: true, from: '20:00', to: '01:00' }, { day: 9, open: true, from: '10:00', to: '12:00' }] }).hours;
assert.equal(week.length, 2);

// Open/closed, including a shift that runs past midnight.
assert.deepEqual(openStatus(week, { day: 1, minutes: 18 * 60 }), { open: true, closesAt: '22:00' });
assert.deepEqual(openStatus(week, { day: 1, minutes: 9 * 60 }), { open: false, next: { day: 1, from: '17:00' } });
assert.deepEqual(openStatus(week, { day: 1, minutes: 23 * 60 }), { open: false, next: { day: 2, from: '20:00' } });
assert.deepEqual(openStatus(week, { day: 3, minutes: 30 }), { open: true, closesAt: '01:00' }, 'Tuesday night shift still open after midnight');

// Fees are short free text; insurance is a capped list.
const priced = sanitizeExtras({ fees: { consultation: ' 500 ج.م ', followUp: 'x'.repeat(80) }, insurance: 'مصر للتأمين\nأكسا' });
assert.equal(priced.fees.consultation, '500 ج.م');
assert.equal(priced.fees.followUp.length, 40);
assert.deepEqual(priced.insurance, ['مصر للتأمين', 'أكسا']);
assert.deepEqual(sanitizeExtras({ fees: 'bad' }).fees, { consultation: '', followUp: '' });

// Old records without extras, or JSON strings from Postgres, normalize safely.
assert.deepEqual(normalizeExtras(undefined).workplaces, []);
assert.deepEqual(normalizeExtras('{"services":["a"]}').services, ['a']);
assert.deepEqual(normalizeExtras('not json').services, []);
console.log('Profile extras tests passed');
