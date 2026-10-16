"use client";

import { getSettings, updateSettings, type GroqKey } from "../settings";

export function addGroqKey(key: string, label?: string) {
  updateSettings((s) => ({
    groqKeys: [
      ...s.groqKeys,
      {
        id: crypto.randomUUID(),
        label: label ?? `Key ${s.groqKeys.length + 1}`,
        key,
        cooldownUntil: 0,
        invalid: false,
        lastUsed: null,
      },
    ],
  }));
}

export function removeGroqKey(id: string) {
  updateSettings((s) => ({ groqKeys: s.groqKeys.filter((k) => k.id !== id) }));
}

export function patchGroqKey(id: string, patch: Partial<GroqKey>) {
  updateSettings((s) => ({ groqKeys: s.groqKeys.map((k) => (k.id === id ? { ...k, ...patch } : k)) }));
}

/** Usable keys, least-recently-used first. */
export function availableKeys(now = Date.now()): GroqKey[] {
  return getSettings()
    .groqKeys.filter((k) => !k.invalid && k.cooldownUntil <= now)
    .sort((a, b) => (a.lastUsed ?? 0) - (b.lastUsed ?? 0));
}

export const hasAi = () => getSettings().groqKeys.some((k) => !k.invalid);
