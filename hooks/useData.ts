"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { db, type Account, type Category, type Transaction } from "@/lib/db/schema";

export function useCategories() {
  return useLiveQuery(
    () => db.categories.filter((c) => !c.deleted_at).sortBy("sort"),
    [],
    [] as Category[],
  );
}

export function useAccounts() {
  return useLiveQuery(
    () => db.accounts.filter((a) => !a.deleted_at && !a.archived).sortBy("sort"),
    [],
    [] as Account[],
  );
}

export function useLookups() {
  const categories = useCategories();
  const accounts = useAccounts();
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  return { categories, accounts, categoryById, accountById };
}

/** Transactions in [from, to), newest first. ISO strings. */
export function useTransactionsBetween(from: string, to: string) {
  return useLiveQuery(
    () =>
      db.transactions
        .where("occurred_at")
        .between(from, to, true, false)
        .filter((t) => !t.deleted_at)
        .reverse()
        .sortBy("occurred_at"),
    [from, to],
    [] as Transaction[],
  );
}

export function useRecentTransactions(limit = 20) {
  return useLiveQuery(
    () => db.transactions.orderBy("occurred_at").reverse().filter((t) => !t.deleted_at).limit(limit).toArray(),
    [limit],
    [] as Transaction[],
  );
}

export function sumByType(txns: Transaction[]) {
  let debit = 0;
  let credit = 0;
  for (const t of txns) {
    if (t.type === "debit") debit += t.amount;
    else if (t.type === "credit") credit += t.amount;
  }
  return { debit, credit, net: credit - debit };
}
