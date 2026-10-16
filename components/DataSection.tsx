"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportCsv, exportJson, importCsv, importJson, wipeLocalData } from "@/lib/data/transfer";

export function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const n = file.name.toLowerCase().endsWith(".json") || text.trimStart().startsWith("{") ? await importJson(text) : await importCsv(text);
      toast.success(`Imported ${n} ${n === 1 ? "row" : "rows"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Data</h2>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => exportCsv()}>
          Export CSV
        </Button>
        <Button variant="outline" onClick={() => exportJson()}>
          Backup JSON
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          Import CSV / JSON
        </Button>
        <input ref={fileRef} type="file" accept=".csv,.json,text/csv,application/json" className="hidden" onChange={onFile} />
      </div>
      <p className="text-xs text-muted-foreground">
        CSV columns: date, type, amount, category, account, to_account, note, tags. Unknown categories and accounts are created on import.
      </p>
      <Button
        variant="destructive"
        className="self-start"
        onClick={() => {
          if (confirm("Delete all data on this device? Synced data in Supabase is kept.")) wipeLocalData();
        }}
      >
        Delete data on this device
      </Button>
    </section>
  );
}
