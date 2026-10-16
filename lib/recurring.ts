"use client";

import { addDays, addMonths, addWeeks, addYears, setDate, startOfDay } from "date-fns";
import { toast } from "sonner";
import { db, nowIso, type RecurringRule, type Transaction } from "./db/schema";
import { addTransaction, upsertRow } from "./db/repo";
import { scheduleSync } from "./sync/engine";

export type Freq = "daily" | "weekly" | "monthly" | "yearly";
export type Mode = "auto" | "remind";

/** `rrule` is stored as "<freq>:<interval>:<mode>", e.g. "monthly:1:auto". */
export function encodeRule(freq: Freq, interval: number, mode: Mode) {
  return `${freq}:${Math.max(1, interval)}:${mode}`;
}
export function decodeRule(rrule: string): { freq: Freq; interval: number; mode: Mode } {
  const [freq = "monthly", interval = "1", mode = "auto"] = rrule.split(":");
  return { freq: freq as Freq, interval: Number(interval) || 1, mode: mode as Mode };
}

export function advance(date: Date, freq: Freq, interval: number) {
  switch (freq) {
    case "daily":
      return addDays(date, interval);
    case "weekly":
      return addWeeks(date, interval);
    case "yearly":
      return addYears(date, interval);
    default: {
      // Keep the intended day-of-month when the next month is shorter.
      const next = addMonths(date, interval);
      const wanted = date.getDate();
      return wanted > 28 ? setDate(next, Math.min(wanted, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate())) : next;
    }
  }
}

export type RuleTemplate = Pick<Transaction, "type" | "amount" | "category_id" | "account_id" | "note">;

export async function saveRule(input: { id?: string; template: RuleTemplate; freq: Freq; interval: number; mode: Mode; next_run: string }) {
  const row = await upsertRow<RecurringRule>(db.recurring_rules, {
    id: input.id,
    template: input.template,
    rrule: encodeRule(input.freq, input.interval, input.mode),
    next_run: input.next_run,
  });
  scheduleSync();
  return row;
}

async function createFromRule(rule: RecurringRule, when: Date) {
  const t = rule.template as RuleTemplate;
  return addTransaction({
    type: t.type,
    amount: t.amount,
    account_id: t.account_id ?? null,
    to_account_id: null,
    category_id: t.category_id ?? null,
    note: t.note ?? "",
    tags: ["recurring"],
    occurred_at: when.toISOString(),
    source: "manual",
    raw_input: null,
  });
}

let running = false;

/**
 * Runs due rules: "auto" rules create the entries (catching up missed periods, max 12),
 * "remind" rules show a toast with an Add action. Call on app open / resume.
 */
export async function runDueRules(now = new Date()) {
  if (running) return;
  running = true;
  try {
    const rules = await db.recurring_rules.filter((r) => !r.deleted_at && r.next_run <= now.toISOString()).toArray();
    let created = 0;
    for (const rule of rules) {
      const { freq, interval, mode } = decodeRule(rule.rrule);
      let next = new Date(rule.next_run);
      let guard = 0;
      const due: Date[] = [];
      while (next <= now && guard++ < 12) {
        due.push(next);
        next = advance(next, freq, interval);
      }
      if (mode === "auto") {
        for (const d of due) {
          await createFromRule(rule, d);
          created++;
        }
      } else {
        const t = rule.template as RuleTemplate;
        toast(`Due: ${t.note || "recurring entry"} · ${t.amount}`, {
          duration: 15_000,
          action: { label: "Add", onClick: () => createFromRule(rule, startOfDay(now)).then(() => scheduleSync()) },
        });
      }
      await db.recurring_rules.update(rule.id, { next_run: next.toISOString(), updated_at: nowIso(), dirty: 1 });
    }
    if (created > 0) {
      toast.success(`Added ${created} recurring ${created === 1 ? "entry" : "entries"}`);
    }
    if (rules.length > 0) scheduleSync();
  } finally {
    running = false;
  }
}
