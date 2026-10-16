"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useLookups } from "@/hooks/useData";
import { db, type RecurringRule, type TxnType } from "@/lib/db/schema";
import { softDelete } from "@/lib/db/repo";
import { decodeRule, saveRule, type Freq, type Mode, type RuleTemplate } from "@/lib/recurring";
import { formatMoney, useSettings } from "@/lib/settings";
import { scheduleSync } from "@/lib/sync/engine";

const selectCls = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

export default function RecurringPage() {
  const settings = useSettings();
  const { categories, accounts, categoryById, accountById } = useLookups();
  const rules = useLiveQuery(() => db.recurring_rules.filter((r) => !r.deleted_at).sortBy("next_run"), [], [] as RecurringRule[]);

  const [type, setType] = useState<TxnType>("debit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [freq, setFreq] = useState<Freq>("monthly");
  const [interval, setInterval] = useState("1");
  const [mode, setMode] = useState<Mode>("auto");
  const [start, setStart] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const kind = type === "credit" ? "income" : "expense";
  const cats = categories.filter((c) => c.kind === kind);
  const effCategory = cats.some((c) => c.id === categoryId) ? categoryId : (cats[0]?.id ?? "");
  const effAccount = accounts.some((a) => a.id === accountId) ? accountId : (accounts[0]?.id ?? "");
  const valid = Number(amount) > 0 && !!start;

  async function add() {
    if (!valid) return;
    const template: RuleTemplate = { type, amount: Number(amount), category_id: effCategory || null, account_id: effAccount || null, note: note.trim() };
    await saveRule({ template, freq, interval: Number(interval) || 1, mode, next_run: new Date(`${start}T09:00:00`).toISOString() });
    setAmount("");
    setNote("");
    toast.success("Recurring rule saved");
  }

  return (
    <main className="flex flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <PageHeader title="Recurring" />
      <p className="text-xs text-muted-foreground">Rent, EMI, subscriptions, salary. Auto rules add the entry on the day; remind rules ask first.</p>

      {rules.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No rules yet.</p>}
      <ul className="flex flex-col gap-2">
        {rules.map((r) => {
          const t = r.template as RuleTemplate;
          const { freq, interval, mode } = decodeRule(r.rrule);
          const cat = t.category_id ? categoryById.get(t.category_id) : undefined;
          return (
            <li key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <CategoryIcon icon={cat?.icon} color={cat?.color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.note || cat?.name || "Entry"}</div>
                <div className="text-xs text-muted-foreground">
                  Every {interval > 1 ? `${interval} ` : ""}
                  {freq === "daily" ? "day" : freq === "weekly" ? "week" : freq === "monthly" ? "month" : "year"}
                  {interval > 1 ? "s" : ""} · next {format(new Date(r.next_run), "d MMM")} · {mode} · {accountById.get(t.account_id ?? "")?.name ?? ""}
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {t.type === "credit" ? "+" : "−"}
                {formatMoney(t.amount, settings)}
              </span>
              <Button variant="ghost" size="icon-xs" aria-label="Delete rule" onClick={() => softDelete(db.recurring_rules, r.id).then(() => scheduleSync())}>
                <Trash2 />
              </Button>
            </li>
          );
        })}
      </ul>

      <form
        className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <span className="text-xs font-medium">New rule</span>
        <div className="grid grid-cols-2 gap-2">
          <select value={type} onChange={(e) => setType(e.target.value as TxnType)} className={selectCls} aria-label="Type">
            <option value="debit">Expense</option>
            <option value="credit">Income</option>
          </select>
          <Input inputMode="decimal" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10" />
          <select value={effCategory} onChange={(e) => setCategoryId(e.target.value)} className={selectCls} aria-label="Category">
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={effAccount} onChange={(e) => setAccountId(e.target.value)} className={selectCls} aria-label="Account">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <Input placeholder="Note (e.g. Rent)" value={note} onChange={(e) => setNote(e.target.value)} className="h-10" />
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-[11px]">Every</Label>
            <Input type="number" min={1} value={interval} onChange={(e) => setInterval(e.target.value)} className="h-10" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px]">Period</Label>
            <select value={freq} onChange={(e) => setFreq(e.target.value as Freq)} className={selectCls}>
              <option value="daily">Day</option>
              <option value="weekly">Week</option>
              <option value="monthly">Month</option>
              <option value="yearly">Year</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px]">Mode</Label>
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className={selectCls}>
              <option value="auto">Auto add</option>
              <option value="remind">Remind me</option>
            </select>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Label className="text-[11px]">First on</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-10" />
          </div>
          <Button type="submit" size="lg" disabled={!valid}>
            Save rule
          </Button>
        </div>
      </form>
    </main>
  );
}
