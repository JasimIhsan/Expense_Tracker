"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSettings } from "../settings";

let client: SupabaseClient | null = null;
let clientUrl = "";

/** Returns a Supabase client for the configured project, or null when not configured. */
export function getSupabase(): SupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey } = getSettings();
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (client && clientUrl === supabaseUrl) return client;
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  clientUrl = supabaseUrl;
  return client;
}

export function resetSupabase() {
  client = null;
  clientUrl = "";
}
