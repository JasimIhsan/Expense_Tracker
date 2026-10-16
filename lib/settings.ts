"use client";

import { useSyncExternalStore } from "react";

/**
 * Device-local settings. Kept in localStorage (not Dexie) so they are available
 * synchronously on first render and never leave the device.
 */
export interface GroqKey {
  id: string;
  label: string;
  key: string;
  /** Epoch ms until which the key is on cooldown after a 429. */
  cooldownUntil: number;
  invalid: boolean;
  lastUsed: number | null;
}

export interface Settings {
  onboarded: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** @deprecated Keys now live in the `api_keys` table; kept only so old installs migrate. */
  groqKeys: GroqKey[];
  models: string[];
  whisperModel: string;
  speechLang: string;
  /** "auto" = Web Speech where available, Whisper otherwise. */
  speechEngine: "auto" | "webspeech" | "whisper";
  currency: string;
  locale: string;
  weekStartsOn: 0 | 1;
  theme: "system" | "light" | "dark";
  autoSaveSeconds: number;
}

export const DEFAULT_MODELS = [
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
];

const DEFAULTS: Settings = {
  onboarded: false,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  groqKeys: [],
  models: DEFAULT_MODELS,
  whisperModel: "whisper-large-v3-turbo",
  speechLang: "en-IN",
  speechEngine: "auto",
  currency: "INR",
  locale: "en-IN",
  weekStartsOn: 1,
  theme: "system",
  autoSaveSeconds: 3,
};

const KEY = "et.settings.v1";
const listeners = new Set<() => void>();
let cache: Settings | null = null;

function read(): Settings {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULTS;
  } catch {
    cache = DEFAULTS;
  }
  return cache;
}

export function getSettings(): Settings {
  return read();
}

export function updateSettings(patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) {
  const current = read();
  const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: keep in memory only */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}

/** False during SSR and the hydration render, true once client state is real. */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function formatMoney(amount: number, s: Settings = read()) {
  return new Intl.NumberFormat(s.locale, {
    style: "currency",
    currency: s.currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
