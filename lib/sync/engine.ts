"use client";

import { useSyncExternalStore } from "react";
import { db, SYNC_TABLES, type SyncTable, type SyncedRow } from "../db/schema";
import { getSupabase } from "../supabase/client";
import { getSession } from "../auth/session";

/**
 * Local-first sync. Push: every row with dirty=1 is upserted. Pull: rows whose
 * updated_at is newer than the per-table cursor are merged with last-write-wins.
 * Soft deletes travel as deleted_at tombstones.
 */
export type SyncState = {
  status: "idle" | "syncing" | "error" | "offline" | "disabled";
  lastSync: number | null;
  pending: number;
  error: string | null;
};

let state: SyncState = { status: "idle", lastSync: null, pending: 0, error: null };
const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useSyncState() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
    () => state,
  );
}

const cursorKey = (t: SyncTable) => `sync.cursor.${t}`;

/** Columns that only exist locally. */
const LOCAL_ONLY = new Set(["dirty"]);
function toRemote(row: SyncedRow) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!LOCAL_ONLY.has(k)) out[k] = v;
  return out;
}

async function pushTable(table: SyncTable, userId: string) {
  const sb = getSupabase()!;
  const rows = (await db.table(table).where("dirty").equals(1).toArray()) as SyncedRow[];
  if (rows.length === 0) return;
  const payload = rows.map((r) => toRemote({ ...r, user_id: userId }));
  const { error } = await sb.from(table).upsert(payload, { onConflict: "id" });
  if (error) throw new Error(`${table}: ${error.message}`);
  await db.table(table).bulkPut(rows.map((r) => ({ ...r, user_id: userId, dirty: 0 })));
}

async function pullTable(table: SyncTable) {
  const sb = getSupabase()!;
  const cursor = ((await db.kv.get(cursorKey(table)))?.value as string | undefined) ?? "1970-01-01T00:00:00Z";
  const PAGE = 1000;
  let since = cursor;
  for (;;) {
    const { data, error } = await sb
      .from(table)
      .select("*")
      .gt("updated_at", since)
      .order("updated_at", { ascending: true })
      .limit(PAGE);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    const remote = data as SyncedRow[];
    await db.transaction("rw", db.table(table), async () => {
      for (const r of remote) {
        const local = (await db.table(table).get(r.id)) as SyncedRow | undefined;
        // Keep a newer local edit that has not been pushed yet.
        if (local?.dirty && local.updated_at > r.updated_at) continue;
        await db.table(table).put({ ...r, dirty: 0 });
      }
    });
    since = remote[remote.length - 1].updated_at;
    await db.kv.put({ key: cursorKey(table), value: since });
    if (remote.length < PAGE) break;
  }
}

export async function countPending() {
  let n = 0;
  for (const t of SYNC_TABLES) n += await db.table(t).where("dirty").equals(1).count();
  set({ pending: n });
  return n;
}

export function syncNow(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const sb = getSupabase();
    const session = getSession();
    if (!sb || !session) {
      set({ status: "disabled" });
      await countPending();
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ status: "offline" });
      await countPending();
      return;
    }
    set({ status: "syncing", error: null });
    try {
      for (const t of SYNC_TABLES) await pushTable(t, session.user.id);
      for (const t of SYNC_TABLES) await pullTable(t);
      set({ status: "idle", lastSync: Date.now() });
    } catch (e) {
      set({ status: "error", error: e instanceof Error ? e.message : String(e) });
    } finally {
      await countPending();
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Debounced sync, called after local writes. */
export function scheduleSync(delayMs = 1500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delayMs);
}

/** Clears pull cursors so the next sync re-downloads everything (after sign-in on a new device). */
export async function resetCursors() {
  for (const t of SYNC_TABLES) await db.kv.delete(cursorKey(t));
}
