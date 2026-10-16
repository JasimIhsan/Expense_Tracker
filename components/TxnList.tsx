"use client";

import { useMemo, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { ArrowLeftRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CategoryIcon } from "@/components/CategoryIcon";
import { TxnForm } from "@/components/TxnForm";
import { useLookups } from "@/hooks/useData";
import type { Transaction } from "@/lib/db/schema";
import { formatMoney, useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

function dayLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, d MMM");
}

export function TxnList({ txns, emptyText = "Nothing here yet." }: { txns: Transaction[]; emptyText?: string }) {
  const { categoryById, accountById } = useLookups();
  const settings = useSettings();
  const [editing, setEditing] = useState<Transaction | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: Transaction[]; net: number }>();
    for (const t of txns) {
      const key = t.occurred_at.slice(0, 10);
      const g = map.get(key) ?? { label: dayLabel(t.occurred_at), items: [], net: 0 };
      g.items.push(t);
      if (t.type === "debit") g.net -= t.amount;
      if (t.type === "credit") g.net += t.amount;
      map.set(key, g);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [txns]);

  if (txns.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {groups.map(([key, g]) => (
          <section key={key}>
            <header className="flex items-baseline justify-between px-1 pb-1 text-xs text-muted-foreground">
              <span className="font-medium">{g.label}</span>
              <span className={cn("tabular-nums", g.net < 0 ? "" : "text-emerald-600 dark:text-emerald-400")}>
                {g.net < 0 ? "−" : "+"}
                {formatMoney(Math.abs(g.net), settings)}
              </span>
            </header>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {g.items.map((t) => {
                const cat = t.category_id ? categoryById.get(t.category_id) : undefined;
                const acc = t.account_id ? accountById.get(t.account_id) : undefined;
                const to = t.to_account_id ? accountById.get(t.to_account_id) : undefined;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(t)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-muted"
                    >
                      {t.type === "transfer" ? (
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                          <ArrowLeftRight className="size-4" />
                        </span>
                      ) : (
                        <CategoryIcon icon={cat?.icon} color={cat?.color} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {t.note || cat?.name || (t.type === "transfer" ? "Transfer" : "Untitled")}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t.type === "transfer"
                            ? `${acc?.name ?? "?"} → ${to?.name ?? "?"}`
                            : [cat?.name, acc?.name, format(new Date(t.occurred_at), "h:mm a")].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          t.type === "credit" && "text-emerald-600 dark:text-emerald-400",
                          t.type === "transfer" && "text-muted-foreground",
                        )}
                      >
                        {t.type === "debit" ? "−" : t.type === "credit" ? "+" : ""}
                        {formatMoney(t.amount, settings)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-md overflow-y-auto rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="p-0">
            <SheetTitle>Edit</SheetTitle>
          </SheetHeader>
          {editing && <TxnForm key={editing.id} initial={editing} onDone={() => setEditing(null)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
