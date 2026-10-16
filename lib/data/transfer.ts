"use client";

import { format } from "date-fns";
import { db, newId, nowIso, SYNC_TABLES, type Account, type Category, type SyncedRow, type Transaction } from "../db/schema";
import { getUserId } from "../auth/session";
import { scheduleSync } from "../sync/engine";

/** Tables included in a JSON backup. */
const BACKUP_TABLES = SYNC_TABLES;

export type Backup = {
  app: "paisa";
  version: 1;
  exported_at: string;
  tables: Record<string, SyncedRow[]>;
};

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => format(new Date(), "yyyy-MM-dd");

export async function exportJson() {
  const tables: Backup["tables"] = {};
  for (const t of BACKUP_TABLES) {
    tables[t] = ((await db.table(t).toArray()) as SyncedRow[])
      .filter((r) => !r.deleted_at)
      .map((r) => {
        const copy = { ...r } as Partial<SyncedRow>;
        delete copy.dirty; // local-only column
        return copy as SyncedRow;
      });
  }
  const backup: Backup = { app: "paisa", version: 1, exported_at: nowIso(), tables };
  download(`paisa-backup-${stamp()}.json`, JSON.stringify(backup, null, 2), "application/json");
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_HEADER = ["date", "type", "amount", "category", "account", "to_account", "note", "tags"] as const;

export async function exportCsv() {
  const [txns, cats, accs] = await Promise.all([
    db.transactions.filter((t) => !t.deleted_at).sortBy("occurred_at"),
    db.categories.toArray(),
    db.accounts.toArray(),
  ]);
  const cat = new Map(cats.map((c) => [c.id, c.name]));
  const acc = new Map(accs.map((a) => [a.id, a.name]));
  const lines = [CSV_HEADER.join(",")];
  for (const t of txns) {
    lines.push(
      [
        format(new Date(t.occurred_at), "yyyy-MM-dd HH:mm"),
        t.type,
        t.amount,
        t.category_id ? (cat.get(t.category_id) ?? "") : "",
        t.account_id ? (acc.get(t.account_id) ?? "") : "",
        t.to_account_id ? (acc.get(t.to_account_id) ?? "") : "",
        t.note,
        t.tags.join(" "),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  download(`paisa-transactions-${stamp()}.csv`, lines.join("\n"), "text/csv");
}

/** Minimal RFC-4180 parser (quotes, escaped quotes, newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

/** Imports a JSON backup: rows are upserted under the current user and marked for sync. */
export async function importJson(text: string): Promise<number> {
  const data = JSON.parse(text) as Partial<Backup>;
  if (data.app !== "paisa" || !data.tables) throw new Error("Not a Paisa backup file");
  const userId = getUserId();
  const t = nowIso();
  let n = 0;
  await db.transaction("rw", BACKUP_TABLES.map((name) => db.table(name)), async () => {
    for (const name of BACKUP_TABLES) {
      const rows = data.tables?.[name] ?? [];
      if (rows.length === 0) continue;
      await db.table(name).bulkPut(rows.map((r) => ({ ...r, user_id: userId, updated_at: t, dirty: 1 })));
      n += rows.length;
    }
  });
  scheduleSync();
  return n;
}

/**
 * Imports transactions from CSV with the same columns as the export. Unknown
 * categories and accounts are created; header matching is case-insensitive.
 */
export async function importCsv(text: string): Promise<number> {
  const rows = parseCsv(text);
  if (rows.length < 2) return 0;
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iDate = col("date");
  const iAmount = col("amount");
  if (iDate < 0 || iAmount < 0) throw new Error("CSV needs at least 'date' and 'amount' columns");
  const iType = col("type");
  const iCat = col("category");
  const iAcc = col("account");
  const iTo = col("to_account");
  const iNote = col("note");
  const iTags = col("tags");

  const userId = getUserId();
  const t = nowIso();
  const base = { user_id: userId, created_at: t, updated_at: t, deleted_at: null, dirty: 1 as const };
  const cats = await db.categories.toArray();
  const accs = await db.accounts.toArray();
  const findCat = async (name: string, kind: Category["kind"]) => {
    const key = name.trim().toLowerCase();
    if (!key) return null;
    let c = cats.find((x) => x.name.toLowerCase() === key && x.kind === kind) ?? cats.find((x) => x.name.toLowerCase() === key);
    if (!c) {
      c = { ...base, id: newId(), name: name.trim(), icon: "circle", color: "#737373", parent_id: null, kind, sort: 500 + cats.length };
      cats.push(c);
      await db.categories.add(c);
    }
    return c.id;
  };
  const findAcc = async (name: string) => {
    const key = name.trim().toLowerCase();
    if (!key) return null;
    let a = accs.find((x) => x.name.toLowerCase() === key);
    if (!a) {
      const type: Account["type"] = /upi|gpay|phonepe|paytm/.test(key) ? "upi" : /card/.test(key) ? "card" : /bank/.test(key) ? "bank" : /wallet/.test(key) ? "wallet" : "cash";
      a = { ...base, id: newId(), name: name.trim(), type, opening_balance: 0, archived: 0, sort: 50 + accs.length };
      accs.push(a);
      await db.accounts.add(a);
    }
    return a.id;
  };

  const out: Transaction[] = [];
  for (const r of rows.slice(1)) {
    const amount = Number(String(r[iAmount] ?? "").replace(/[^\d.-]/g, ""));
    const when = new Date(r[iDate]);
    if (!(Math.abs(amount) > 0) || isNaN(when.getTime())) continue;
    const rawType = (iType >= 0 ? r[iType] : "").trim().toLowerCase();
    const type: Transaction["type"] =
      rawType === "credit" || rawType === "income" || amount < 0 ? "credit" : rawType === "transfer" ? "transfer" : "debit";
    out.push({
      ...base,
      id: newId(),
      type,
      amount: Math.abs(amount),
      account_id: iAcc >= 0 ? await findAcc(r[iAcc] ?? "") : (accs[0]?.id ?? null),
      to_account_id: type === "transfer" && iTo >= 0 ? await findAcc(r[iTo] ?? "") : null,
      category_id: type === "transfer" || iCat < 0 ? null : await findCat(r[iCat] ?? "", type === "credit" ? "income" : "expense"),
      note: iNote >= 0 ? (r[iNote] ?? "").trim() : "",
      tags: iTags >= 0 ? (r[iTags] ?? "").split(/[\s,]+/).filter(Boolean) : [],
      occurred_at: when.toISOString(),
      source: "manual",
      raw_input: null,
    });
  }
  await db.transactions.bulkAdd(out);
  scheduleSync();
  return out.length;
}

/** Wipes everything on this device (the cloud copy is untouched). */
export async function wipeLocalData() {
  await db.delete();
  localStorage.clear();
  window.location.replace(window.location.origin);
}
