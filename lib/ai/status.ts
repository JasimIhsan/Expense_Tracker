"use client";

import { useSyncExternalStore } from "react";

/** Whether the server has Groq keys. Fetched once; cached in localStorage for offline starts. */
export type AiStatus = { configured: boolean; keys: number; loaded: boolean };

const KEY = "et.ai-status.v1";
let status: AiStatus = { configured: false, keys: 0, loaded: false };
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function set(next: AiStatus) {
  status = next;
  listeners.forEach((l) => l());
}

function readCached(): AiStatus | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...(JSON.parse(raw) as AiStatus), loaded: true } : null;
  } catch {
    return null;
  }
}

export function loadAiStatus(): Promise<void> {
  if (loading) return loading;
  const cached = readCached();
  if (cached) set(cached);
  loading = fetch("/api/groq/status")
    .then((r) => r.json() as Promise<{ configured: boolean; keys: number }>)
    .then((s) => {
      set({ ...s, loaded: true });
      try {
        localStorage.setItem(KEY, JSON.stringify(s));
      } catch {
        /* ignore */
      }
    })
    .catch(() => {
      if (!cached) set({ ...status, loaded: true });
    });
  return loading;
}

export const hasAi = () => status.configured;
export const aiKeyCount = () => status.keys;

export function useAiStatus(): AiStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      void loadAiStatus();
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

/** Test helper. */
export function __setAiStatusForTests(s: Partial<AiStatus>) {
  loading = Promise.resolve();
  set({ ...status, loaded: true, ...s });
}
