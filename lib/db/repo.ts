import { db, newId, nowIso, type Transaction, type SyncedRow } from "./schema";
import { getUserId } from "../auth/session";

type NewTxn = Omit<Transaction, keyof SyncedRow> & Partial<Pick<SyncedRow, "id">>;

export async function addTransaction(input: NewTxn): Promise<Transaction> {
  const t = nowIso();
  const row: Transaction = {
    ...input,
    id: input.id ?? newId(),
    user_id: getUserId(),
    created_at: t,
    updated_at: t,
    deleted_at: null,
    dirty: 1,
  };
  await db.transactions.add(row);
  return row;
}

export async function addTransactions(inputs: NewTxn[]): Promise<Transaction[]> {
  const rows = await Promise.all(inputs.map((i) => addTransaction(i)));
  return rows;
}

export async function updateTransaction(id: string, patch: Partial<Transaction>) {
  await db.transactions.update(id, { ...patch, updated_at: nowIso(), dirty: 1 });
}

/** Soft delete so the tombstone syncs to other devices. */
export async function deleteTransaction(id: string) {
  await db.transactions.update(id, { deleted_at: nowIso(), updated_at: nowIso(), dirty: 1 });
}

export async function restoreTransaction(id: string) {
  await db.transactions.update(id, { deleted_at: null, updated_at: nowIso(), dirty: 1 });
}

/** Generic soft-delete / upsert helpers for the small lookup tables. */
export async function upsertRow<T extends SyncedRow>(
  table: { put(row: T): Promise<unknown>; get(id: string): Promise<T | undefined> },
  input: Omit<T, keyof SyncedRow> & Partial<SyncedRow>,
): Promise<T> {
  const t = nowIso();
  const existing = input.id ? await table.get(input.id) : undefined;
  const row = {
    ...(existing ?? {}),
    ...input,
    id: input.id ?? newId(),
    user_id: existing?.user_id ?? getUserId(),
    created_at: existing?.created_at ?? t,
    updated_at: t,
    deleted_at: input.deleted_at ?? null,
    dirty: 1,
  } as T;
  await table.put(row);
  return row;
}

export async function softDelete<T extends SyncedRow>(
  table: { update(id: string, patch: Partial<T>): Promise<unknown> },
  id: string,
) {
  await table.update(id, { deleted_at: nowIso(), updated_at: nowIso(), dirty: 1 } as Partial<T>);
}
