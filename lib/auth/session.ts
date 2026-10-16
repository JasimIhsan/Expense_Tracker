"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import { db, LOCAL_USER, SYNC_TABLES, nowIso } from "../db/schema";

let currentUserId: string = LOCAL_USER;
let session: Session | null = null;
const listeners = new Set<(s: Session | null) => void>();
let started = false;

export function getUserId() {
  return currentUserId;
}

export function getSession() {
  return session;
}

function setSession(next: Session | null) {
  session = next;
  currentUserId = next?.user.id ?? LOCAL_USER;
  listeners.forEach((l) => l(next));
}

/** Rows created before sign-in belong to "local"; hand them to the signed-in user. */
async function claimLocalRows(userId: string) {
  const t = nowIso();
  await db.transaction("rw", SYNC_TABLES.map((n) => db.table(n)), async () => {
    for (const name of SYNC_TABLES) {
      await db.table(name).where("user_id").equals(LOCAL_USER).modify({ user_id: userId, updated_at: t, dirty: 1 });
    }
  });
}

export function startAuth() {
  if (started) return;
  started = true;
  const sb = getSupabase();
  if (!sb) return;
  sb.auth.getSession().then(({ data }) => setSession(data.session));
  sb.auth.onAuthStateChange((_event, s) => {
    setSession(s);
    if (s?.user.id) claimLocalRows(s.user.id).catch(console.error);
  });
}

function subscribe(onChange: () => void) {
  const l = () => onChange();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useSession() {
  useEffect(() => {
    startAuth();
  }, []);
  return useSyncExternalStore(subscribe, getSession, () => null);
}

export async function signOut() {
  await getSupabase()?.auth.signOut();
  setSession(null);
}
