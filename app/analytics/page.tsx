"use client";

import { useMemo, useState } from "react";
import { addMonths, differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MonthPicker } from "@/components/MonthPicker";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useLookups, useTransactionsBetween, sumByType } from "@/hooks/useData";
import { formatMoney, useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-card p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-lg font-semibold tabular-nums", tone === "good" && "text-emerald-600 dark:text-emerald-400")}>{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}

// Credits are emerald throughout the app; expenses use the neutral chart token.
const INCOME = "#10b981";

function TipBox({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-lg border border-border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow">
      <div className="mb-1 font-medium">{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{k}</span>
          <span className="tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const settings = useSettings();
  const { categoryById } = useLookups();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const monthEnd = addMonths(month, 1);
  const txns = useTransactionsBetween(month.toISOString(), monthEnd.toISOString());
  const prev = useTransactionsBetween(subMonths(month, 1).toISOString(), month.toISOString());
  const sixStart = subMonths(month, 5);
  const sixMonths = useTransactionsBetween(sixStart.toISOString(), monthEnd.toISOString());

  const totals = sumByType(txns);
  const prevTotals = sumByType(prev);
  const daysElapsed = isSameMonth(month, new Date()) ? new Date().getDate() : differenceInCalendarDays(endOfMonth(month), month) + 1;
  const avgPerDay = totals.debit / Math.max(1, daysElapsed);
  const change = prevTotals.debit > 0 ? ((totals.debit - prevTotals.debit) / prevTotals.debit) * 100 : null;

  // Category breakdown: top 6 + Other, colored by the category's own color (identity follows entity).
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) if (t.type === "debit") m.set(t.category_id ?? "none", (m.get(t.category_id ?? "none") ?? 0) + t.amount);
    const rows = [...m.entries()]
      .map(([id, amount]) => ({ id, name: categoryById.get(id)?.name ?? "Uncategorised", color: categoryById.get(id)?.color ?? "#737373", icon: categoryById.get(id)?.icon, amount }))
      .sort((a, b) => b.amount - a.amount);
    if (rows.length <= 7) return rows;
    const top = rows.slice(0, 6);
    const rest = rows.slice(6).reduce((s, r) => s + r.amount, 0);
    return [...top, { id: "other", name: "Other", color: "#737373", icon: "circle-ellipsis", amount: rest }];
  }, [txns, categoryById]);

  const daily = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) if (t.type === "debit") {
      const k = format(new Date(t.occurred_at), "yyyy-MM-dd");
      m.set(k, (m.get(k) ?? 0) + t.amount);
    }
    return eachDayOfInterval({ start: month, end: endOfMonth(month) }).map((d) => {
      const k = format(d, "yyyy-MM-dd");
      return { day: format(d, "d"), date: format(d, "EEE d MMM"), spent: m.get(k) ?? 0 };
    });
  }, [txns, month]);

  const cashflow = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => addMonths(sixStart, i));
    return months.map((m) => {
      const inMonth = sixMonths.filter((t) => isSameMonth(new Date(t.occurred_at), m));
      const s = sumByType(inMonth);
      return { month: format(m, "MMM"), income: s.credit, expense: s.debit };
    });
  }, [sixMonths, sixStart]);

  const topNotes = useMemo(() => {
    const m = new Map<string, { amount: number; count: number }>();
    for (const t of txns) if (t.type === "debit" && t.note) {
      const k = t.note.trim().toLowerCase();
      const e = m.get(k) ?? { amount: 0, count: 0 };
      e.amount += t.amount;
      e.count += 1;
      m.set(k, e);
    }
    return [...m.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 5);
  }, [txns]);

  const fm = (n: number) => formatMoney(n, settings);

  return (
    <main className="flex flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stats</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Tile label="Spent" value={fm(totals.debit)} sub={change === null ? undefined : `${change >= 0 ? "+" : ""}${change.toFixed(0)}% vs last month`} />
        <Tile label="Received" value={fm(totals.credit)} tone="good" />
        <Tile label="Net" value={fm(totals.net)} tone={totals.net >= 0 ? "good" : undefined} sub={totals.credit > 0 ? `${Math.round((totals.net / totals.credit) * 100)}% saved` : undefined} />
        <Tile label="Avg per day" value={fm(Math.round(avgPerDay))} sub={`${daysElapsed} days`} />
      </div>

      {txns.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No entries this month.</p>
      ) : (
        <>
          <Card title="By category">
            <div className="flex items-center gap-3">
              <div className="h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="amount" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={2} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
                      {byCategory.map((c) => (
                        <Cell key={c.id} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip content={({ payload }) => {
                      const p = payload?.[0]?.payload as (typeof byCategory)[number] | undefined;
                      return p ? <TipBox title={p.name} rows={[["Spent", fm(p.amount)], ["Share", `${Math.round((p.amount / totals.debit) * 100)}%`]]} /> : null;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs">
                {byCategory.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="tabular-nums">{fm(c.amount)}</span>
                    <span className="w-7 text-right tabular-nums text-muted-foreground">{Math.round((c.amount / totals.debit) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card title="Spent per day">
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap={2}>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} interval={6} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis hide domain={[0, "dataMax"]} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} content={({ payload }) => {
                    const p = payload?.[0]?.payload as (typeof daily)[number] | undefined;
                    return p ? <TipBox title={p.date} rows={[["Spent", fm(p.spent)]]} /> : null;
                  }} />
                  <Bar dataKey="spent" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Income vs expense, last 6 months">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflow} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barGap={2}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis hide domain={[0, "dataMax"]} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} content={({ payload }) => {
                    const p = payload?.[0]?.payload as (typeof cashflow)[number] | undefined;
                    return p ? <TipBox title={p.month} rows={[["Income", fm(p.income)], ["Expense", fm(p.expense)], ["Net", fm(p.income - p.expense)]]} /> : null;
                  }} />
                  <Bar dataKey="income" fill={INCOME} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="expense" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Legend items={[["Income", INCOME], ["Expense", "var(--chart-1)"]]} />
          </Card>

          {topNotes.length > 0 && (
            <Card title="Top items">
              <ul className="flex flex-col gap-1.5 text-sm">
                {topNotes.map(([note, v]) => (
                  <li key={note} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate capitalize">{note}</span>
                    <span className="text-xs text-muted-foreground">×{v.count}</span>
                    <span className="tabular-nums">{fm(v.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </main>
  );
}

function Legend({ items }: { items: Array<[string, string]> }) {
  return (
    <ul className="flex gap-4 text-xs text-muted-foreground">
      {items.map(([label, color]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: color }} />
          {label}
        </li>
      ))}
    </ul>
  );
}
