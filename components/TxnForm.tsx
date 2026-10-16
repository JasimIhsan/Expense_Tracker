"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useLookups } from "@/hooks/useData";
import { addTransaction, deleteTransaction, restoreTransaction, updateTransaction } from "@/lib/db/repo";
import type { Transaction, TxnType } from "@/lib/db/schema";
import { scheduleSync } from "@/lib/sync/engine";
import { cn } from "@/lib/utils";

const TYPES: Array<{ value: TxnType; label: string }> = [
  { value: "debit", label: "Expense" },
  { value: "credit", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

const toLocalInput = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm");

export function TxnForm({
  initial,
  onDone,
}: {
  initial?: Transaction;
  onDone?: () => void;
}) {
  const { categories, accounts } = useLookups();
  const [type, setType] = useState<TxnType>(initial?.type ?? "debit");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [pickedCategory, setCategoryId] = useState<string | null>(initial?.category_id ?? null);
  const [pickedAccount, setAccountId] = useState<string | null>(initial?.account_id ?? null);
  const [toAccountId, setToAccountId] = useState<string | null>(initial?.to_account_id ?? null);
  const [when, setWhen] = useState(toLocalInput(initial?.occurred_at ?? new Date().toISOString()));
  const [note, setNote] = useState(initial?.note ?? "");
  const [saving, setSaving] = useState(false);

  const kind = type === "credit" ? "income" : "expense";
  const visibleCategories = useMemo(() => categories.filter((c) => c.kind === kind), [categories, kind]);

  // Defaults are derived, not stored: first account, first category of the kind.
  const accountId = pickedAccount ?? accounts[0]?.id ?? null;
  const categoryId =
    pickedCategory && visibleCategories.some((c) => c.id === pickedCategory) ? pickedCategory : (visibleCategories[0]?.id ?? null);

  const amountNum = Number(amount.replace(/,/g, ""));
  const valid = amountNum > 0 && (type !== "transfer" || (toAccountId && toAccountId !== accountId));

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload = {
        type,
        amount: Math.round(amountNum * 100) / 100,
        account_id: accountId,
        to_account_id: type === "transfer" ? toAccountId : null,
        category_id: type === "transfer" ? null : categoryId,
        note: note.trim(),
        tags: initial?.tags ?? [],
        occurred_at: new Date(when).toISOString(),
        source: initial?.source ?? ("manual" as const),
        raw_input: initial?.raw_input ?? null,
      };
      if (initial) {
        await updateTransaction(initial.id, payload);
        toast.success("Updated");
      } else {
        const row = await addTransaction(payload);
        toast.success("Saved", {
          action: {
            label: "Undo",
            onClick: () => deleteTransaction(row.id).then(() => scheduleSync()),
          },
        });
      }
      scheduleSync();
      onDone?.();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial) return;
    await deleteTransaction(initial.id);
    scheduleSync();
    toast("Deleted", {
      action: { label: "Undo", onClick: () => restoreTransaction(initial.id).then(() => scheduleSync()) },
    });
    onDone?.();
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid grid-cols-3 rounded-lg bg-muted p-1 text-sm font-medium">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={cn(
              "rounded-md py-2 transition",
              type === t.value ? "bg-background shadow text-foreground" : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <span className="pb-2 text-2xl text-muted-foreground">₹</span>
        <input
          autoFocus={!initial}
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
          className="w-full bg-transparent text-5xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/40"
        />
      </div>

      {type !== "transfer" && (
        <div className="flex flex-col gap-2">
          <Label>Category</Label>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[11px] transition",
                  categoryId === c.id ? "border-foreground bg-muted" : "border-transparent",
                )}
              >
                <CategoryIcon icon={c.icon} color={c.color} />
                <span className="max-w-16 truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="account">{type === "transfer" ? "From" : "Account"}</Label>
          <select
            id="account"
            value={accountId ?? ""}
            onChange={(e) => setAccountId(e.target.value || null)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        {type === "transfer" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="to">To</Label>
            <select
              id="to"
              value={toAccountId ?? ""}
              onChange={(e) => setToAccountId(e.target.value || null)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Choose…</option>
              {accounts
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="when">When</Label>
            <Input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-10" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Note</Label>
        <Input id="note" placeholder="Tea at the station" value={note} onChange={(e) => setNote(e.target.value)} className="h-10" />
      </div>

      <div className="flex gap-2 pt-2">
        {initial && (
          <Button type="button" variant="destructive" size="lg" onClick={remove}>
            Delete
          </Button>
        )}
        <Button type="submit" size="lg" className="h-12 flex-1 text-base" disabled={!valid || saving}>
          {initial ? "Save changes" : "Save"}
        </Button>
      </div>
    </form>
  );
}
