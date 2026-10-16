"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { startOfDay, startOfMonth, startOfWeek, addDays } from "date-fns";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { TxnList } from "@/components/TxnList";
import { useRecentTransactions, useTransactionsBetween, sumByType } from "@/hooks/useData";
import { formatMoney, useSettings } from "@/lib/settings";
import { useSyncState } from "@/lib/sync/engine";
import { cn } from "@/lib/utils";

function Stat({ label, debit, credit }: { label: string; debit: number; credit: number }) {
  const s = useSettings();
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{formatMoney(debit, s)}</span>
      <span className="text-xs tabular-nums text-emerald-600 dark:text-emerald-400">+{formatMoney(credit, s)}</span>
    </div>
  );
}

export default function HomePage() {
  const settings = useSettings();
  const sync = useSyncState();
  const [today0] = useState(() => startOfDay(new Date()));
  const range = useMemo(() => {
    const day = today0.toISOString();
    const week = startOfWeek(today0, { weekStartsOn: settings.weekStartsOn }).toISOString();
    const month = startOfMonth(today0).toISOString();
    const end = addDays(today0, 1).toISOString();
    return { day, week, month, end };
  }, [today0, settings.weekStartsOn]);

  const monthTxns = useTransactionsBetween(range.month < range.week ? range.month : range.week, range.end);
  const today = sumByType(monthTxns.filter((t) => t.occurred_at >= range.day));
  const week = sumByType(monthTxns.filter((t) => t.occurred_at >= range.week));
  const month = sumByType(monthTxns.filter((t) => t.occurred_at >= range.month));
  const recent = useRecentTransactions(8);

  return (
    <main className="flex flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Paisa</h1>
        <Link href="/settings" className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Sync status">
          {sync.status === "syncing" ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : sync.status === "disabled" || sync.status === "offline" ? (
            <CloudOff className="size-4" />
          ) : (
            <Cloud className={cn("size-4", sync.status === "error" && "text-destructive")} />
          )}
          {sync.pending > 0 && <span>{sync.pending}</span>}
        </Link>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Today" {...today} />
        <Stat label="This week" {...week} />
        <Stat label="This month" {...month} />
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-sm font-medium">Recent</h2>
          <Link href="/transactions" className="text-xs text-muted-foreground">
            See all
          </Link>
        </div>
        <TxnList txns={recent} emptyText="Tap + to add your first entry." />
      </section>
    </main>
  );
}
