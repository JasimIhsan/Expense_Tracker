"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useLookups } from "@/hooks/useData";
import { useBudgetStatus } from "@/hooks/useBudgets";
import { db, type Budget } from "@/lib/db/schema";
import { softDelete, upsertRow } from "@/lib/db/repo";
import { formatMoney, useSettings } from "@/lib/settings";
import { scheduleSync } from "@/lib/sync/engine";
import { cn } from "@/lib/utils";

const selectCls = "h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm";

export default function BudgetsPage() {
  const settings = useSettings();
  const { categories, categoryById } = useLookups();
  const statuses = useBudgetStatus();
  const [categoryId, setCategoryId] = useState<string>("__all__");
  const [amount, setAmount] = useState("");

  const used = new Set(statuses.map((s) => s.budget.category_id ?? "__all__"));
  const options = [{ id: "__all__", name: "Everything (overall)" }, ...categories.filter((c) => c.kind === "expense")].filter((c) => !used.has(c.id));

  async function add() {
    const n = Number(amount);
    if (!(n > 0)) return;
    await upsertRow<Budget>(db.budgets, { category_id: categoryId === "__all__" ? null : categoryId, period: "month", amount: n });
    scheduleSync();
    setAmount("");
    setCategoryId(options.find((o) => o.id !== categoryId)?.id ?? "__all__");
    toast.success("Budget set");
  }

  async function update(b: Budget, value: string) {
    const n = Number(value);
    if (!(n > 0) || n === b.amount) return;
    await upsertRow<Budget>(db.budgets, { ...b, amount: n });
    scheduleSync();
  }

  const sorted = [...statuses].sort((a, b) => (a.budget.category_id === null ? -1 : b.budget.category_id === null ? 1 : b.ratio - a.ratio));

  return (
    <main className="flex flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <PageHeader title="Budgets" />
      <p className="text-xs text-muted-foreground">Monthly limits. Bars turn amber at 80% and red when over.</p>

      {sorted.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No budgets yet.</p>}
      <ul className="flex flex-col gap-2">
        {sorted.map(({ budget, spent, ratio, level }) => {
          const cat = budget.category_id ? categoryById.get(budget.category_id) : undefined;
          return (
            <li key={budget.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                {cat ? <CategoryIcon icon={cat.icon} color={cat.color} size="sm" /> : <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-xs">Σ</span>}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{cat?.name ?? "Everything"}</span>
                <span className={cn("text-xs tabular-nums", level === "over" ? "text-red-600 dark:text-red-400" : level === "warn" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                  {formatMoney(spent, settings)} / {formatMoney(budget.amount, settings)}
                </span>
                <Button variant="ghost" size="icon-xs" aria-label="Remove budget" onClick={() => softDelete(db.budgets, budget.id).then(() => scheduleSync())}>
                  <Trash2 />
                </Button>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", level === "over" ? "bg-red-500" : level === "warn" ? "bg-amber-500" : "bg-emerald-500")}
                  style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{Math.round(ratio * 100)}% used{level === "over" ? ` · over by ${formatMoney(spent - budget.amount, settings)}` : ` · ${formatMoney(Math.max(0, budget.amount - spent), settings)} left`}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  defaultValue={budget.amount}
                  onBlur={(e) => update(budget, e.target.value)}
                  className="w-20 rounded border border-input bg-background px-1.5 py-0.5 text-right text-[11px] tabular-nums"
                  aria-label="Budget amount"
                />
              </div>
            </li>
          );
        })}
      </ul>

      {options.length > 0 && (
        <form
          className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <span className="text-xs font-medium">Add a budget</span>
          <div className="flex gap-2">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectCls}>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <Input inputMode="decimal" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 w-28" />
            <Button type="submit" size="lg" disabled={!(Number(amount) > 0)}>
              Add
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}
