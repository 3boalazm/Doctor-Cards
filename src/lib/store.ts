import { databaseUrl, pgQuery } from './db';
import { createPgStore } from './store-pg';
import * as json from './store-json';

export type { DoctorCard } from './store-json';
// Postgres when a connection string exists (Vercel); local JSON file otherwise (dev only).
const pg = databaseUrl() ? createPgStore(pgQuery) : null;
const impl = pg ?? json;
export const listCards = (...a: Parameters<typeof json.listCards>) => impl.listCards(...a);
export const createCard = (...a: Parameters<typeof json.createCard>) => impl.createCard(...a);
export const createBlankCards = (...a: Parameters<typeof json.createBlankCards>) => impl.createBlankCards(...a);
export const getUnclaimedCard = (...a: Parameters<typeof json.getUnclaimedCard>) => impl.getUnclaimedCard(...a);
export const claimUnclaimedCard = (...a: Parameters<typeof json.claimUnclaimedCard>) => impl.claimUnclaimedCard(...a);
export const updateCard = (...a: Parameters<typeof json.updateCard>) => impl.updateCard(...a);
export const getCardForPrint = (...a: Parameters<typeof json.getCardForPrint>) => impl.getCardForPrint(...a);
export const getPublicCard = (...a: Parameters<typeof json.getPublicCard>) => impl.getPublicCard(...a);
export const getPublicCardSnapshot = (...a: Parameters<typeof json.getPublicCardSnapshot>) => impl.getPublicCardSnapshot(...a);
export const cleanupExpiredScans = (...a: Parameters<typeof json.cleanupExpiredScans>) => impl.cleanupExpiredScans(...a);
