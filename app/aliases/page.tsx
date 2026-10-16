"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useLookups } from "@/hooks/useData";
import { db, type Alias } from "@/lib/db/schema";
import { softDelete, upsertRow } from "@/lib/db/repo";
import { scheduleSync } from "@/lib/sync/engine";

const selectCls = "h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm";

export default function AliasesPage() {
  const { categories, accounts, categoryById, accountById } = useLookups();
  const aliases = useLiveQuery(() => db.aliases.filter((a) => !a.deleted_at).sortBy("phrase"), [], [] as Alias[]);
  const [phrase, setPhrase] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");

  async function add() {
    const p = phrase.trim().toLowerCase();
    if (!p || (!categoryId && !accountId)) return;
    if (aliases.some((a) => a.phrase === p)) return toast.error("That word already has an alias");
    await upsertRow<Alias>(db.aliases, { phrase: p, category_id: categoryId || null, account_id: accountId || null });
    scheduleSync();
    setPhrase("");
    toast.success(`"${p}" learned`);
  }

  return (
    <main className="flex flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <PageHeader title="Vocabulary" />
      <p className="text-xs text-muted-foreground">
        Teach your own words: &ldquo;chaya&rdquo; → Food, &ldquo;gpay&rdquo; → UPI. Used by the instant parser and sent to the AI as hints.
      </p>

      <form
        className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input placeholder="Word or phrase" value={phrase} onChange={(e) => setPhrase(e.target.value)} className="h-10" autoComplete="off" />
        <div className="flex gap-2">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectCls} aria-label="Category">
            <option value="">Category (none)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kind === "income" ? "↑ " : ""}
                {c.name}
              </option>
            ))}
          </select>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={selectCls} aria-label="Account">
            <option value="">Account (none)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="lg" disabled={!phrase.trim() || (!categoryId && !accountId)}>
          Add alias
        </Button>
      </form>

      {aliases.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No aliases yet.</p>}
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {aliases.map((a) => {
          const cat = a.category_id ? categoryById.get(a.category_id) : undefined;
          const acc = a.account_id ? accountById.get(a.account_id) : undefined;
          return (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2">
              {cat ? <CategoryIcon icon={cat.icon} color={cat.color} size="sm" /> : <span className="size-7" />}
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="font-medium">{a.phrase}</span>
                <span className="text-muted-foreground"> → {[cat?.name, acc?.name].filter(Boolean).join(" · ")}</span>
              </span>
              <Button variant="ghost" size="icon-xs" aria-label="Remove alias" onClick={() => softDelete(db.aliases, a.id).then(() => scheduleSync())}>
                <Trash2 />
              </Button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
