"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { useLookups } from "@/hooks/useData";
import { db, nowIso, type Debt } from "@/lib/db/schema";
import { addTransaction, upsertRow } from "@/lib/db/repo";
import { formatMoney, useSettings } from "@/lib/settings";
import { scheduleSync } from "@/lib/sync/engine";
import { cn } from "@/lib/utils";

const selectCls = "h-10 rounded-lg border border-input bg-background px-3 text-sm";

export default function DebtsPage() {
  const settings = useSettings();
  const { categories, accounts } = useLookups();
  const debts = useLiveQuery(() => db.debts.filter((d) => !d.deleted_at).reverse().sortBy("created_at"), [], [] as Debt[]);

  const [person, setPerson] = useState("");
  const [direction, setDirection] = useState<Debt["direction"]>("lent");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState("");
  const [showSettled, setShowSettled] = useState(false);

  const effAccount = accounts.some((a) => a.id === accountId) ? accountId : (accounts[0]?.id ?? null);
  const catFor = (kind: "expense" | "income", name: RegExp) => categories.find((c) => c.kind === kind && name.test(c.name))?.id ?? null;

  // Net position per person: positive = they owe you.
  const byPerson = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of debts) {
      if (d.settled_at) continue;
      m.set(d.person, (m.get(d.person) ?? 0) + (d.direction === "lent" ? d.amount : -d.amount));
    }
    return [...m.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  }, [debts]);

  async function add() {
    const n = Number(amount);
    if (!person.trim() || !(n > 0)) return;
    await upsertRow<Debt>(db.debts, { person: person.trim(), direction, amount: n, note: note.trim(), settled_at: null });
    // Money actually moved, so it is also a transaction.
    await addTransaction({
      type: direction === "lent" ? "debit" : "credit",
      amount: n,
      account_id: effAccount,
      to_account_id: null,
      category_id: direction === "lent" ? catFor("expense", /^lent/i) : catFor("income", /^borrowed/i),
      note: `${direction === "lent" ? "Lent to" : "Borrowed from"} ${person.trim()}`,
      tags: ["debt"],
      occurred_at: nowIso(),
      source: "manual",
      raw_input: null,
    });
    scheduleSync();
    setAmount("");
    setNote("");
    toast.success("Recorded");
  }

  async function settle(d: Debt) {
    await upsertRow<Debt>(db.debts, { ...d, settled_at: nowIso() });
    await addTransaction({
      type: d.direction === "lent" ? "credit" : "debit",
      amount: d.amount,
      account_id: effAccount,
      to_account_id: null,
      category_id: d.direction === "lent" ? catFor("income", /^refund|^other income/i) : catFor("expense", /^lent|^other/i),
      note: `${d.direction === "lent" ? "Repaid by" : "Repaid to"} ${d.person}`,
      tags: ["debt"],
      occurred_at: nowIso(),
      source: "manual",
      raw_input: null,
    });
    scheduleSync();
    toast.success("Settled");
  }

  const visible = debts.filter((d) => showSettled || !d.settled_at);

  return (
    <main className="flex flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <PageHeader title="Lend & borrow" />

      {byPerson.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {byPerson.map(([name, net]) => (
            <li key={name} className={cn("rounded-full border px-3 py-1 text-xs", net >= 0 ? "border-emerald-500/40" : "border-red-500/40")}>
              <span className="font-medium">{name}</span>{" "}
              <span className={cn("tabular-nums", net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                {net >= 0 ? "owes you " : "you owe "}
                {formatMoney(Math.abs(net), settings)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <select value={direction} onChange={(e) => setDirection(e.target.value as Debt["direction"])} className={selectCls} aria-label="Direction">
            <option value="lent">I gave (lent)</option>
            <option value="borrowed">I took (borrowed)</option>
          </select>
          <Input inputMode="decimal" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10" />
          <Input placeholder="Person" value={person} onChange={(e) => setPerson(e.target.value)} className="h-10" autoComplete="off" />
          <select value={effAccount ?? ""} onChange={(e) => setAccountId(e.target.value)} className={selectCls} aria-label="Account">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="h-10" />
          <Button type="submit" size="lg" disabled={!person.trim() || !(Number(amount) > 0)}>
            Record
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-medium">Entries</h2>
        <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setShowSettled((s) => !s)}>
          {showSettled ? "Hide settled" : "Show settled"}
        </button>
      </div>
      {visible.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nothing outstanding.</p>}
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {visible.map((d) => (
          <li key={d.id} className={cn("flex items-center gap-3 px-3 py-2.5", d.settled_at && "opacity-50")}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {d.direction === "lent" ? "Lent to" : "Borrowed from"} {d.person}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {format(new Date(d.created_at), "d MMM")}
                {d.note ? ` · ${d.note}` : ""}
                {d.settled_at ? ` · settled ${format(new Date(d.settled_at), "d MMM")}` : ""}
              </div>
            </div>
            <span className={cn("text-sm font-semibold tabular-nums", d.direction === "lent" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
              {formatMoney(d.amount, settings)}
            </span>
            {!d.settled_at && (
              <Button variant="outline" size="sm" onClick={() => settle(d)}>
                Settle
              </Button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
