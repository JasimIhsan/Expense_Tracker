"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mic, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useLookups } from "@/hooks/useData";
import { parseNote } from "@/lib/ai/pipeline";
import { enqueue } from "@/lib/ai/queue";
import { addTransactions, deleteTransaction } from "@/lib/db/repo";
import type { Draft } from "@/lib/parse/types";
import { formatMoney, useSettings } from "@/lib/settings";
import { scheduleSync } from "@/lib/sync/engine";
import { useVoice } from "@/lib/voice/useVoice";
import { cn } from "@/lib/utils";

export function QuickAdd() {
  const settings = useSettings();
  const params = useSearchParams();
  const { categories, accounts, categoryById } = useLookups();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setCountdown(null);
  };

  const saveDrafts = useCallback(
    async (items: Draft[]) => {
      clearTimer();
      setDrafts([]);
      if (items.length === 0) return;
      const rows = await addTransactions(
        items.map((d) => ({
          id: d.id,
          type: d.type,
          amount: d.amount,
          account_id: d.account_id,
          to_account_id: null,
          category_id: d.category_id,
          note: d.note,
          tags: [],
          occurred_at: d.occurred_at,
          source: d.source,
          raw_input: d.raw_input,
        })),
      );
      scheduleSync();
      const total = rows.reduce((s, r) => s + (r.type === "debit" ? r.amount : 0), 0);
      toast.success(`Saved ${rows.length} ${rows.length === 1 ? "entry" : "entries"} · ${formatMoney(total, settings)}`, {
        action: {
          label: "Undo",
          onClick: () => Promise.all(rows.map((r) => deleteTransaction(r.id))).then(() => scheduleSync()),
        },
      });
    },
    [settings],
  );

  // Auto-save countdown once drafts appear.
  const startCountdown = useCallback(
    (items: Draft[]) => {
      clearTimer();
      if (settings.autoSaveSeconds <= 0) {
        void saveDrafts(items);
        return;
      }
      let left = settings.autoSaveSeconds;
      setCountdown(left);
      timerRef.current = setInterval(() => {
        left -= 1;
        setCountdown(left);
        if (left <= 0) {
          setDrafts((current) => {
            void saveDrafts(current);
            return [];
          });
        }
      }, 1000);
    },
    [settings.autoSaveSeconds, saveDrafts],
  );

  const submit = useCallback(
    async (raw: string, source: Draft["source"]) => {
      const value = raw.trim();
      if (!value || busy) return;
      setBusy(true);
      try {
        const out = await parseNote(value, source);
        if (out.leftover) {
          if (out.error === "offline" || out.error === "all-failed") {
            await enqueue(out.leftover, source);
            toast(out.error === "offline" ? "Offline: queued, will parse when back online" : "AI busy: queued for later");
          } else if (out.error === "no-keys") {
            toast.error("Could not parse. Add a Groq key in Settings for smarter parsing.", {
              description: out.leftover,
            });
          } else {
            toast.error("AI could not parse this", { description: out.leftover });
          }
        }
        if (out.drafts.length > 0) {
          setText("");
          setDrafts((d) => {
            const next = [...d, ...out.drafts];
            startCountdown(next);
            return next;
          });
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, startCountdown],
  );

  const voice = useVoice((t) => {
    setText(t);
    void submit(t, "voice");
  });

  // App shortcut "/?voice=1" opens with the mic armed; a tap is still needed for permission.
  useEffect(() => {
    if (params.get("voice") === "1") inputRef.current?.focus();
  }, [params]);

  useEffect(() => clearTimer, []);

  const removeDraft = (id: string) =>
    setDrafts((d) => {
      const next = d.filter((x) => x.id !== id);
      if (next.length === 0) clearTimer();
      return next;
    });
  const patchDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((d) => d.map((x) => (x.id === id ? { ...x, ...patch, origin: "manual" } : x)));

  const listening = voice.state === "listening";

  return (
    <section className="flex flex-col gap-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(text, "text");
        }}
      >
        <input
          ref={inputRef}
          value={listening ? voice.interim || text : text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? "Listening…" : "tea 20, metro 40"}
          enterKeyHint="send"
          autoComplete="off"
          className={cn(
            "h-12 min-w-0 flex-1 rounded-full border border-input bg-card px-4 text-base outline-none focus:border-ring",
            listening && "border-red-500",
          )}
        />
        {text.trim() ? (
          <Button type="submit" size="icon" className="size-12 rounded-full" disabled={busy} aria-label="Add">
            {busy ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        ) : (
          <button
            type="button"
            aria-label="Hold to talk"
            disabled={voice.state === "unsupported" || voice.state === "processing"}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              void voice.start();
            }}
            onPointerUp={() => voice.stop()}
            onPointerCancel={() => voice.stop()}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
              "flex size-12 shrink-0 touch-none select-none items-center justify-center rounded-full transition",
              listening ? "scale-110 bg-red-500 text-white shadow-lg shadow-red-500/40" : "bg-primary text-primary-foreground",
              "disabled:opacity-40",
            )}
          >
            {voice.state === "processing" || busy ? <Loader2 className="size-5 animate-spin" /> : <Mic className="size-5" />}
          </button>
        )}
      </form>
      {voice.state === "unsupported" && (
        <p className="px-2 text-xs text-muted-foreground">Voice needs Chrome, or a Groq key for Whisper on this browser.</p>
      )}
      {voice.error && <p className="px-2 text-xs text-destructive">Voice: {voice.error}</p>}

      {drafts.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2">
          <ul className="flex flex-col divide-y divide-border">
            {drafts.map((d) => {
              const cat = d.category_id ? categoryById.get(d.category_id) : undefined;
              const kind = d.type === "credit" ? "income" : "expense";
              return (
                <li key={d.id} className="flex items-center gap-2 py-2">
                  <CategoryIcon icon={cat?.icon} color={cat?.color} size="sm" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <input
                      value={d.note}
                      onChange={(e) => patchDraft(d.id, { note: e.target.value })}
                      placeholder={cat?.name ?? "Note"}
                      className="min-w-0 bg-transparent text-sm font-medium outline-none"
                    />
                    <div className="flex gap-1 text-[11px] text-muted-foreground">
                      <select
                        value={d.category_id ?? ""}
                        onChange={(e) => patchDraft(d.id, { category_id: e.target.value || null })}
                        className="max-w-28 bg-transparent"
                      >
                        {categories
                          .filter((c) => c.kind === kind)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                      <span>·</span>
                      <select
                        value={d.account_id ?? ""}
                        onChange={(e) => patchDraft(d.id, { account_id: e.target.value || null })}
                        className="bg-transparent"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                      <span>·</span>
                      <button type="button" className="underline" onClick={() => patchDraft(d.id, { type: d.type === "debit" ? "credit" : "debit" })}>
                        {d.type === "debit" ? "expense" : "income"}
                      </button>
                    </div>
                  </div>
                  <span className="flex items-center text-sm font-semibold tabular-nums">
                    <span className="text-muted-foreground">{d.type === "debit" ? "−" : "+"}</span>
                    <input
                      inputMode="decimal"
                      value={d.amount}
                      onChange={(e) => patchDraft(d.id, { amount: Number(e.target.value) || 0 })}
                      className={cn("w-20 bg-transparent text-right outline-none", d.type === "credit" && "text-emerald-600 dark:text-emerald-400")}
                    />
                  </span>
                  <button type="button" aria-label="Remove" onClick={() => removeDraft(d.id)} className="p-1 text-muted-foreground">
                    <X className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {countdown !== null ? `Saving in ${countdown}s · tap to edit` : "Tap to edit"}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { clearTimer(); setDrafts([]); }}>
                Discard
              </Button>
              <Button size="sm" onClick={() => saveDrafts(drafts)} disabled={drafts.some((d) => !(d.amount > 0))}>
                Save now
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
