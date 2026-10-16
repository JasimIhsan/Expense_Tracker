"use client";

import { useMemo, useState } from "react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek,
} from "date-fns";
import { MonthPicker } from "@/components/MonthPicker";
import { TxnList } from "@/components/TxnList";
import { useTransactionsBetween, sumByType } from "@/hooks/useData";
import { formatMoney, useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

const WEEKDAYS_MON = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAYS_SUN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CalendarPage() {
  const settings = useSettings();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(null);
  const txns = useTransactionsBetween(month.toISOString(), addMonths(month, 1).toISOString());

  // Per-day totals keyed by yyyy-MM-dd (local time).
  const byDay = useMemo(() => {
    const m = new Map<string, { debit: number; credit: number }>();
    for (const t of txns) {
      const k = format(new Date(t.occurred_at), "yyyy-MM-dd");
      const d = m.get(k) ?? { debit: 0, credit: 0 };
      if (t.type === "debit") d.debit += t.amount;
      else if (t.type === "credit") d.credit += t.amount;
      m.set(k, d);
    }
    return m;
  }, [txns]);
  const maxDebit = useMemo(() => Math.max(0, ...[...byDay.values()].map((d) => d.debit)), [byDay]);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(month, { weekStartsOn: settings.weekStartsOn }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: settings.weekStartsOn }),
      }),
    [month, settings.weekStartsOn],
  );

  const totals = sumByType(txns);
  const dayTxns = useMemo(
    () => (selected ? txns.filter((t) => isSameDay(new Date(t.occurred_at), selected)) : []),
    [txns, selected],
  );

  return (
    <main className="flex flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <MonthPicker
          month={month}
          onChange={(m) => {
            setMonth(m);
            setSelected(null);
          }}
        />
      </header>

      <div className="flex justify-between px-1 text-xs text-muted-foreground">
        <span>Spent {formatMoney(totals.debit, settings)}</span>
        <span>Received {formatMoney(totals.credit, settings)}</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {(settings.weekStartsOn === 1 ? WEEKDAYS_MON : WEEKDAYS_SUN).map((d) => (
          <span key={d} className="pb-1 text-[11px] font-medium text-muted-foreground">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const d = byDay.get(key);
          const inMonth = isSameMonth(day, month);
          const intensity = d && maxDebit > 0 ? 0.15 + 0.85 * (d.debit / maxDebit) : 0;
          const isSel = selected && isSameDay(day, selected);
          return (
            <button
              key={key}
              type="button"
              disabled={!inMonth}
              onClick={() => setSelected(isSel ? null : day)}
              className={cn(
                "flex aspect-square flex-col items-center justify-start gap-0.5 rounded-lg border p-1 text-xs transition",
                inMonth ? "border-transparent" : "opacity-30",
                isSel && "border-foreground",
                isToday(day) && "font-bold",
                // Dark cells carry light ink and vice versa so the number stays readable at every step.
                intensity > 0.55 && "text-background",
              )}
              style={d?.debit ? { backgroundColor: `color-mix(in oklch, var(--chart-1) ${Math.round(intensity * 100)}%, var(--card))` } : undefined}
            >
              <span className={cn(isToday(day) && "underline underline-offset-2")}>{format(day, "d")}</span>
              {d?.debit ? <span className="truncate text-[9px] tabular-nums leading-none">{compact(d.debit)}</span> : null}
              {d?.credit ? (
                <span className={cn("truncate text-[9px] leading-none", intensity > 0.55 ? "text-background" : "text-emerald-600 dark:text-emerald-400")}>
                  +{compact(d.credit)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {selected ? (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-medium">{format(selected, "EEEE, d MMM")}</h2>
          <TxnList txns={dayTxns} emptyText="Nothing on this day." />
        </section>
      ) : (
        <p className="px-1 text-xs text-muted-foreground">Tap a day to see its entries. Darker = more spent.</p>
      )}
    </main>
  );
}

function compact(n: number) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(Math.round(n));
}
