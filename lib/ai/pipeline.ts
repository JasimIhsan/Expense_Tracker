"use client";

import { db } from "../db/schema";
import { quickParse } from "../parse/quick";
import type { Draft, ParseContext } from "../parse/types";
import { aiParse } from "./parse";
import { hasAi } from "./keys";
import { AiError } from "./groq";

export async function loadParseContext(): Promise<ParseContext> {
  const [categories, accounts, aliases] = await Promise.all([
    db.categories.filter((c) => !c.deleted_at).sortBy("sort"),
    db.accounts.filter((a) => !a.deleted_at && !a.archived).sortBy("sort"),
    db.aliases.filter((a) => !a.deleted_at).toArray(),
  ]);
  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type })),
    aliases: aliases.map((a) => ({ phrase: a.phrase, category_id: a.category_id, account_id: a.account_id })),
  };
}

export type ParseOutcome = {
  drafts: Draft[];
  /** Text that still needs the AI but could not be parsed now (offline / no key / failure). */
  leftover: string | null;
  usedAi: boolean;
  error: string | null;
};

/**
 * Quick-parser first (instant, offline); only the segments it rejects go to the model.
 * Never throws: whatever could be parsed is returned, the rest comes back as `leftover`.
 */
export async function parseNote(text: string, source: Draft["source"], ctx?: ParseContext): Promise<ParseOutcome> {
  const context = ctx ?? (await loadParseContext());
  const quick = quickParse(text, context, source);
  if (quick.unparsed.length === 0) return { drafts: quick.drafts, leftover: null, usedAi: false, error: null };

  const rest = quick.unparsed.join(", ");
  if (!hasAi()) return { drafts: quick.drafts, leftover: rest, usedAi: false, error: "no-keys" };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { drafts: quick.drafts, leftover: rest, usedAi: false, error: "offline" };
  }
  try {
    const ai = await aiParse(rest, context, source);
    return { drafts: [...quick.drafts, ...ai], leftover: null, usedAi: true, error: null };
  } catch (e) {
    const msg = e instanceof AiError ? e.kind : e instanceof Error ? e.message : String(e);
    return { drafts: quick.drafts, leftover: rest, usedAi: false, error: msg };
  }
}
