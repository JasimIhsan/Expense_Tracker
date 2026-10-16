"use client";

import { liveQuery } from "dexie";
import { useSyncExternalStore } from "react";
import { db, nowIso, type ApiKey } from "../db/schema";
import { upsertRow, softDelete } from "../db/repo";
import { getSettings, updateSettings } from "../settings";
import { scheduleSync } from "../sync/engine";

/**
 * Key pool backed by the `api_keys` table (synced per user). An in-memory
 * mirror keeps the hot path (`availableKeys`, `hasAi`) synchronous.
 */
let cache: ApiKey[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(rows: ApiKey[]) {
  cache = rows.filter((k) => !k.deleted_at);
  listeners.forEach((l) => l());
}

/** Loads the pool once and keeps the mirror in step with the database. */
export function startKeyStore(): Promise<void> {
  if (loaded) return loaded;
  loaded = db.api_keys
    .toArray()
    .then(publish)
    .then(() => {
      liveQuery(() => db.api_keys.toArray()).subscribe({ next: publish, error: console.error });
    });
  return loaded;
}

/** One-time move of keys that older versions kept in localStorage. */
export async function migrateLegacyKeys() {
  const legacy = getSettings().groqKeys;
  if (!legacy?.length) return;
  for (const k of legacy) {
    await upsertRow<ApiKey>(db.api_keys, {
      provider: "groq",
      label: k.label,
      key: k.key,
      cooldown_until: k.cooldownUntil,
      invalid: k.invalid ? 1 : 0,
      last_used: k.lastUsed,
    });
  }
  updateSettings({ groqKeys: [] });
  scheduleSync();
}

export async function addGroqKey(key: string, label?: string) {
  await startKeyStore();
  await upsertRow<ApiKey>(db.api_keys, {
    provider: "groq",
    label: label ?? `Key ${cache.length + 1}`,
    key: key.trim(),
    cooldown_until: 0,
    invalid: 0,
    last_used: null,
  });
  scheduleSync();
}

export async function removeGroqKey(id: string) {
  await softDelete(db.api_keys, id);
  scheduleSync();
}

/** Updates rotation state; the mirror is patched immediately so retries see it. */
export function patchGroqKey(id: string, patch: Partial<Pick<ApiKey, "cooldown_until" | "invalid" | "last_used">>) {
  publish(cache.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  void db.api_keys.update(id, { ...patch, updated_at: nowIso(), dirty: 1 });
}

export function allKeys(): ApiKey[] {
  return cache;
}

/** Usable keys, least-recently-used first. */
export function availableKeys(now = Date.now()): ApiKey[] {
  return cache.filter((k) => !k.invalid && k.cooldown_until <= now).sort((a, b) => (a.last_used ?? 0) - (b.last_used ?? 0));
}

export const hasAi = () => cache.some((k) => !k.invalid);

export function useApiKeys(): ApiKey[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      void startKeyStore();
      return () => listeners.delete(l);
    },
    () => cache,
    () => cache,
  );
}

/** Test helper: replaces the mirror without touching the database. */
export function __setKeysForTests(rows: ApiKey[]) {
  loaded = Promise.resolve();
  publish(rows);
}
