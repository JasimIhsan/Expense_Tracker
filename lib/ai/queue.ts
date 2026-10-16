"use client";

import { toast } from "sonner";
import { db, newId, nowIso, type TxnSource } from "../db/schema";
import { addTransactions } from "../db/repo";
import { scheduleSync } from "../sync/engine";
import { parseNote } from "./pipeline";
import { hasAi } from "./keys";

/** Notes that need the AI but could not be parsed yet (offline, rate-limited, no key). */
export async function enqueue(text: string, source: TxnSource) {
  await db.ai_queue.add({ id: newId(), text, source, created_at: nowIso(), error: null });
}

let draining = false;

/** Parses queued notes and saves the results. Called on reconnect and app resume. */
export async function drainQueue() {
  if (draining || !hasAi()) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  draining = true;
  try {
    const items = await db.ai_queue.orderBy("created_at").toArray();
    let saved = 0;
    for (const item of items) {
      const out = await parseNote(item.text, item.source);
      if (out.leftover) {
        await db.ai_queue.update(item.id, { error: out.error });
        if (out.error === "offline" || out.error === "all-failed") break;
        continue;
      }
      if (out.drafts.length > 0) {
        await addTransactions(
          out.drafts.map((d) => ({
            id: d.id,
            type: d.type,
            amount: d.amount,
            account_id: d.account_id,
            to_account_id: null,
            category_id: d.category_id,
            note: d.note,
            tags: [],
            occurred_at: d.occurred_at,
            source: d.source,
            raw_input: d.raw_input,
          })),
        );
        saved += out.drafts.length;
      }
      await db.ai_queue.delete(item.id);
    }
    if (saved > 0) {
      scheduleSync();
      toast.success(`Parsed ${saved} queued ${saved === 1 ? "entry" : "entries"}`);
    }
  } finally {
    draining = false;
  }
}
