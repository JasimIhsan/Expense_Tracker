"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { addMonths, startOfMonth } from "date-fns";
import { db, type Budget } from "@/lib/db/schema";
import { useTransactionsBetween } from "./useData";

export function useBudgets() {
  return useLiveQuery(() => db.budgets.filter((b) => !b.deleted_at).toArray(), [], [] as Budget[]);
}

export type BudgetStatus = {
  budget: Budget;
  spent: number;
  ratio: number;
  level: "ok" | "warn" | "over";
};

/** Budgets with the current month's spend per category (null category = overall). */
export function useBudgetStatus(month: Date = startOfMonth(new Date())) {
  const budgets = useBudgets();
  const txns = useTransactionsBetween(month.toISOString(), addMonths(month, 1).toISOString());
  return useMemo(() => {
    const spentBy = new Map<string | null, number>();
    let total = 0;
    for (const t of txns) {
      if (t.type !== "debit") continue;
      total += t.amount;
      spentBy.set(t.category_id, (spentBy.get(t.category_id) ?? 0) + t.amount);
    }
    return budgets.map<BudgetStatus>((budget) => {
      const spent = budget.category_id ? (spentBy.get(budget.category_id) ?? 0) : total;
      const ratio = budget.amount > 0 ? spent / budget.amount : 0;
      return { budget, spent, ratio, level: ratio >= 1 ? "over" : ratio >= 0.8 ? "warn" : "ok" };
    });
  }, [budgets, txns]);
}
