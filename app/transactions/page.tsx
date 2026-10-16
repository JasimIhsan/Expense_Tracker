"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDays, addMonths, startOfDay, startOfMonth } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MonthPicker } from "@/components/MonthPicker";
import { TxnList } from "@/components/TxnList";
import { useLookups, useTransactionsBetween, sumByType } from "@/hooks/useData";
import { formatMoney, useSettings } from "@/lib/settings";

function TransactionsInner() {
  const params = useSearchParams();
  const settings = useSettings();
  const { categoryById } = useLookups();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [q, setQ] = useState("");
  const todayOnly = params.get("range") === "today";

  const from = todayOnly ? startOfDay(new Date()) : month;
  const to = todayOnly ? addDays(startOfDay(new Date()), 1) : addMonths(month, 1);
  const txns = useTransactionsBetween(from.toISOString(), to.toISOString());

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return txns;
    return txns.filter((t) => {
      const cat = t.category_id ? categoryById.get(t.category_id)?.name ?? "" : "";
      return (
        t.note.toLowerCase().includes(needle) ||
        cat.toLowerCase().includes(needle) ||
        String(t.amount).includes(needle) ||
        t.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [txns, q, categoryById]);
  const totals = sumByType(filtered);

  return (
    <main className="flex flex-col gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{todayOnly ? "Today" : "Transactions"}</h1>
        {!todayOnly && <MonthPicker month={month} onChange={setMonth} />}
      </header>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search note, category, amount" className="h-10 pl-9" />
      </div>
      <div className="flex justify-between px-1 text-xs text-muted-foreground">
        <span>Spent {formatMoney(totals.debit, settings)}</span>
        <span>Received {formatMoney(totals.credit, settings)}</span>
      </div>
      <TxnList txns={filtered} emptyText={q ? "No matches." : "No entries this month."} />
    </main>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsInner />
    </Suspense>
  );
}
