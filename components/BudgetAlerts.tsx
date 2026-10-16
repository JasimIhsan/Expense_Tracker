"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useBudgetStatus } from "@/hooks/useBudgets";
import { useLookups } from "@/hooks/useData";
import { formatMoney, useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/** Compact warnings on the home page for budgets at 80% or over. */
export function BudgetAlerts() {
  const settings = useSettings();
  const { categoryById } = useLookups();
  const hot = useBudgetStatus().filter((s) => s.level !== "ok");
  if (hot.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {hot.map(({ budget, spent, ratio, level }) => (
        <li key={budget.id}>
          <Link
            href="/budgets"
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
              level === "over" ? "border-red-500/40 text-red-700 dark:text-red-300" : "border-amber-500/40 text-amber-700 dark:text-amber-300",
            )}
          >
            <AlertTriangle className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {budget.category_id ? categoryById.get(budget.category_id)?.name : "Overall"} budget {level === "over" ? "exceeded" : `${Math.round(ratio * 100)}% used`}
            </span>
            <span className="tabular-nums">
              {formatMoney(spent, settings)} / {formatMoney(budget.amount, settings)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
