"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Supabase comes from the deployment's environment; no in-app configuration. */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Supabase now issues `sb_publishable_…` keys; the legacy anon JWT still works too.
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let client: SupabaseClient | null = null;

export const isSupabaseConfigured = () => Boolean(URL && ANON);

/** Returns the Supabase client, or null when the deployment has no Supabase env. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
