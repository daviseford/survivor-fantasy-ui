import type { Draft, Season } from "../../types";

/**
 * Single-use authentication intents (KTD1).
 *
 * When a signed-out visitor starts a protected action (start or join a draft),
 * the action is stored here under an unguessable state key so authentication,
 * including a password reset completed in another tab, can resume it later.
 * Records live in browser-local storage for at most 60 minutes, are removed
 * when claimed, and are validated on every read so malformed, expired,
 * cross-origin, or forged data can never execute an action.
 */

export type StartDraftIntent = {
  kind: "start-draft";
  seasonId: Season["id"];
  /** Preallocated draft ID, stable across retries so creation is idempotent. */
  draftId: Draft["id"];
  /** Same-origin path to return to after authentication. */
  returnPath: string;
};

export type JoinDraftIntent = {
  kind: "join-draft";
  draftId: Draft["id"];
  returnPath: string;
};

export type AuthIntent = StartDraftIntent | JoinDraftIntent;

/** Minimal Storage-shaped boundary; injectable for deterministic tests. */
export interface AuthIntentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AuthIntentOptions {
  storage?: AuthIntentStorage;
  now?: () => number;
}

export const AUTH_INTENT_TTL_MS = 60 * 60 * 1000;

const STORAGE_KEY = "survivor_auth_intents";
const STORAGE_VERSION = 1;

const SEASON_ID_PATTERN = /^season_\d+$/;
const DRAFT_ID_PATTERN = /^draft_[A-Za-z0-9_-]+$/;

type StoredIntentRecord = {
  intent: AuthIntent;
  createdAt: number;
};

type StoredIntentFile = {
  version: typeof STORAGE_VERSION;
  records: Record<string, StoredIntentRecord>;
};

let fallbackStorage: AuthIntentStorage | null = null;

const createMemoryStorage = (): AuthIntentStorage => {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
};

/**
 * Resolve the storage boundary lazily so importing this module never touches
 * browser globals. Uses localStorage when available, otherwise a shared
 * in-memory fallback.
 */
const resolveStorage = (storage?: AuthIntentStorage): AuthIntentStorage => {
  if (storage) return storage;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Access to localStorage can throw (privacy modes); fall through.
  }
  fallbackStorage ??= createMemoryStorage();
  return fallbackStorage;
};

const resolveNow = (now?: () => number): (() => number) => now ?? Date.now;

export const generateAuthStateKey = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
};

/**
 * Same-origin absolute paths only; rejects absolute and protocol-relative
 * URLs. Backslashes are rejected outright because URL parsers treat them as
 * slashes, letting "/\evil.com" resolve protocol-relative.
 */
const isSameOriginPath = (value: unknown): value is string =>
  typeof value === "string" &&
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !/[\\\r\n]/.test(value);

const isValidIntent = (value: unknown): value is AuthIntent => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (!isSameOriginPath(candidate.returnPath)) return false;
  if (candidate.kind === "start-draft") {
    return (
      typeof candidate.seasonId === "string" &&
      SEASON_ID_PATTERN.test(candidate.seasonId) &&
      typeof candidate.draftId === "string" &&
      DRAFT_ID_PATTERN.test(candidate.draftId)
    );
  }
  if (candidate.kind === "join-draft") {
    return (
      typeof candidate.draftId === "string" &&
      DRAFT_ID_PATTERN.test(candidate.draftId)
    );
  }
  return false;
};

const readFile = (storage: AuthIntentStorage): StoredIntentFile => {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { version: STORAGE_VERSION, records: {} };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as StoredIntentFile).version === STORAGE_VERSION &&
      typeof (parsed as StoredIntentFile).records === "object" &&
      (parsed as StoredIntentFile).records !== null
    ) {
      return parsed as StoredIntentFile;
    }
  } catch {
    // Malformed payload; discard below.
  }
  storage.removeItem(STORAGE_KEY);
  return { version: STORAGE_VERSION, records: {} };
};

const writeFile = (
  storage: AuthIntentStorage,
  file: StoredIntentFile,
): void => {
  if (Object.keys(file.records).length === 0) {
    storage.removeItem(STORAGE_KEY);
    return;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(file));
};

const isExpired = (record: StoredIntentRecord, now: number): boolean =>
  now - record.createdAt >= AUTH_INTENT_TTL_MS;

const assertValidIntent = (intent: AuthIntent): void => {
  if (!isValidIntent(intent)) {
    throw new TypeError("Invalid authentication intent");
  }
};

/**
 * Persist an intent and return its unguessable state key. Throws on invalid
 * input, including cross-origin return paths.
 */
export const saveAuthIntent = (
  intent: AuthIntent,
  options: AuthIntentOptions = {},
): string => {
  assertValidIntent(intent);
  const storage = resolveStorage(options.storage);
  const now = resolveNow(options.now);
  const stateKey = generateAuthStateKey();
  const file = readFile(storage);
  file.records[stateKey] = { intent, createdAt: now() };
  writeFile(storage, file);
  return stateKey;
};

/**
 * Return the intent bound to a state key without consuming it. Unknown,
 * forged, malformed, or expired keys return null; invalid records are
 * discarded from storage.
 */
export const readAuthIntent = (
  stateKey: string,
  options: AuthIntentOptions = {},
): AuthIntent | null => {
  const storage = resolveStorage(options.storage);
  const now = resolveNow(options.now);
  const file = readFile(storage);
  const record = file.records[stateKey];
  if (!record) return null;
  if (
    typeof record !== "object" ||
    typeof record.createdAt !== "number" ||
    isExpired(record, now()) ||
    !isValidIntent(record.intent)
  ) {
    delete file.records[stateKey];
    writeFile(storage, file);
    return null;
  }
  return record.intent;
};

/**
 * Remove the intent bound to a state key and return it. The record is removed
 * before validation, so a claimed intent can never execute twice and a second
 * claim always returns null.
 */
export const claimAuthIntent = (
  stateKey: string,
  options: AuthIntentOptions = {},
): AuthIntent | null => {
  const storage = resolveStorage(options.storage);
  const now = resolveNow(options.now);
  const file = readFile(storage);
  const record = file.records[stateKey];
  if (!record) return null;
  delete file.records[stateKey];
  writeFile(storage, file);
  if (
    typeof record !== "object" ||
    typeof record.createdAt !== "number" ||
    isExpired(record, now()) ||
    !isValidIntent(record.intent)
  ) {
    return null;
  }
  return record.intent;
};

/**
 * Scan every pending record, claim (remove) the first valid, unexpired
 * intent that satisfies the predicate, and return it with its state key.
 * The scan and the claim happen in a single storage write, so concurrent
 * consumers can never claim the same record. Expired or invalid records
 * encountered during the scan are discarded.
 *
 * This is the refresh-recovery path: after a reload the in-memory state
 * key is gone, so a route claims by matching kind plus its own route IDs.
 */
export const claimAuthIntentMatching = (
  predicate: (intent: AuthIntent) => boolean,
  options: AuthIntentOptions = {},
): { stateKey: string; intent: AuthIntent } | null => {
  const storage = resolveStorage(options.storage);
  const now = resolveNow(options.now);
  const file = readFile(storage);
  let changed = false;
  let found: { stateKey: string; intent: AuthIntent } | null = null;

  for (const [stateKey, record] of Object.entries(file.records)) {
    if (
      typeof record !== "object" ||
      record === null ||
      typeof record.createdAt !== "number" ||
      isExpired(record, now()) ||
      !isValidIntent(record.intent)
    ) {
      delete file.records[stateKey];
      changed = true;
      continue;
    }
    if (!found && predicate(record.intent)) {
      found = { stateKey, intent: record.intent };
      delete file.records[stateKey];
      changed = true;
    }
  }

  if (changed) writeFile(storage, file);
  return found;
};

/**
 * Scan every pending record and return the first valid, unexpired intent
 * that satisfies the predicate, with its state key, WITHOUT consuming it.
 * With no predicate, the first valid pending intent is returned. Expired or
 * invalid records encountered during the scan are discarded.
 *
 * This is the non-destructive lookup used when a flow (for example the
 * password-reset request) needs the current continuation's state key but
 * must leave the intent pending for its owning route to claim.
 */
export const findAuthIntent = (
  predicate: (intent: AuthIntent) => boolean = () => true,
  options: AuthIntentOptions = {},
): { stateKey: string; intent: AuthIntent } | null => {
  const storage = resolveStorage(options.storage);
  const now = resolveNow(options.now);
  const file = readFile(storage);
  let changed = false;
  let found: { stateKey: string; intent: AuthIntent } | null = null;

  for (const [stateKey, record] of Object.entries(file.records)) {
    if (
      typeof record !== "object" ||
      record === null ||
      typeof record.createdAt !== "number" ||
      isExpired(record, now()) ||
      !isValidIntent(record.intent)
    ) {
      delete file.records[stateKey];
      changed = true;
      continue;
    }
    if (!found && predicate(record.intent)) {
      found = { stateKey, intent: record.intent };
    }
  }

  if (changed) writeFile(storage, file);
  return found;
};

/**
 * Explicit retry path: restore a previously claimed intent under its original
 * state key, preserving the preallocated draft ID, with a fresh expiry
 * window. This is the only way a claimed intent becomes pending again.
 */
export const restoreClaimedIntent = (
  stateKey: string,
  intent: AuthIntent,
  options: AuthIntentOptions = {},
): void => {
  assertValidIntent(intent);
  const storage = resolveStorage(options.storage);
  const now = resolveNow(options.now);
  const file = readFile(storage);
  file.records[stateKey] = { intent, createdAt: now() };
  writeFile(storage, file);
};

/** Remove every pending intent (account-entry cancellation or sign-out). */
export const clearAuthIntents = (options: AuthIntentOptions = {}): void => {
  resolveStorage(options.storage).removeItem(STORAGE_KEY);
};
