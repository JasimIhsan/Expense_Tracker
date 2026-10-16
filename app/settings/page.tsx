"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { BookA, HandCoins, Repeat, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings, updateSettings } from "@/lib/settings";
import { addGroqKey, removeGroqKey } from "@/lib/ai/keys";
import { signOut, useSession } from "@/lib/auth/session";
import { getSupabase, resetSupabase } from "@/lib/supabase/client";
import { syncNow, useSyncState } from "@/lib/sync/engine";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const selectCls = "h-10 rounded-lg border border-input bg-background px-3 text-sm";

const MORE_LINKS = [
  { href: "/budgets", label: "Budgets", Icon: Target },
  { href: "/recurring", label: "Recurring", Icon: Repeat },
  { href: "/debts", label: "Lend & borrow", Icon: HandCoins },
  { href: "/aliases", label: "Vocabulary", Icon: BookA },
] as const;

export default function SettingsPage() {
  const s = useSettings();
  const session = useSession();
  const sync = useSyncState();
  const [newKey, setNewKey] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState(s.supabaseUrl);
  const [anon, setAnon] = useState(s.supabaseAnonKey);
  const [now] = useState(() => Date.now());

  async function sendLink() {
    const sb = getSupabase();
    if (!sb) return toast.error("Add your Supabase URL and anon key first");
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    if (error) toast.error(error.message);
    else toast.success("Magic link sent");
  }

  return (
    <main className="flex flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="text-xl font-semibold">More</h1>

      <nav className="grid grid-cols-2 gap-2">
        {MORE_LINKS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-medium active:bg-muted">
            <Icon className="size-4 text-muted-foreground" />
            {label}
          </Link>
        ))}
      </nav>

      <Section title="Sync">
        {session ? (
          <>
            <p className="text-sm">
              Signed in as <b>{session.user.email}</b>
            </p>
            <p className="text-xs text-muted-foreground">
              {sync.status === "syncing"
                ? "Syncing…"
                : sync.status === "error"
                  ? `Error: ${sync.error}`
                  : sync.lastSync
                    ? `Last synced ${new Date(sync.lastSync).toLocaleTimeString()}`
                    : "Not synced yet"}
              {sync.pending > 0 && ` · ${sync.pending} pending`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => syncNow()}>
                Sync now
              </Button>
              <Button variant="ghost" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="url">Supabase URL</Label>
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="anon">Anon key</Label>
              <Input id="anon" value={anon} onChange={(e) => setAnon(e.target.value)} placeholder="eyJ…" />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                updateSettings({ supabaseUrl: url.trim(), supabaseAnonKey: anon.trim() });
                resetSupabase();
                toast.success("Saved");
              }}
            >
              Save project
            </Button>
            <div className="flex gap-2">
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button onClick={sendLink} disabled={!email}>
                Send link
              </Button>
            </div>
          </>
        )}
      </Section>

      <Section title="AI keys (Groq)">
        <p className="text-xs text-muted-foreground">
          Keys stay on this device. When one is rate-limited the next is used; when every key fails, the next model in the list is tried.
        </p>
        <ul className="flex flex-col gap-2">
          {s.groqKeys.map((k) => {
            const cooling = k.cooldownUntil > now;
            return (
              <li key={k.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">
                  {k.label} <span className="font-mono text-xs text-muted-foreground">…{k.key.slice(-6)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {k.invalid ? "invalid" : cooling ? "rate limited" : k.lastUsed ? "ok" : "unused"}
                  </span>
                </span>
                <Button variant="ghost" size="icon-sm" aria-label="Remove key" onClick={() => removeGroqKey(k.id)}>
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2">
          <Input placeholder="gsk_…" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
          <Button
            disabled={!newKey.trim()}
            onClick={() => {
              addGroqKey(newKey.trim());
              setNewKey("");
            }}
          >
            Add
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="models">Model chain (one per line, tried in order)</Label>
          <textarea
            id="models"
            rows={3}
            className="rounded-lg border border-input bg-background p-2 font-mono text-xs"
            value={s.models.join("\n")}
            onChange={(e) => updateSettings({ models: e.target.value.split("\n").map((m) => m.trim()).filter(Boolean) })}
          />
        </div>
      </Section>

      <Section title="Voice">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lang">Speech language</Label>
            <select id="lang" className={selectCls} value={s.speechLang} onChange={(e) => updateSettings({ speechLang: e.target.value })}>
              <option value="en-IN">English (India)</option>
              <option value="en-US">English (US)</option>
              <option value="ml-IN">Malayalam</option>
              <option value="hi-IN">Hindi</option>
              <option value="ta-IN">Tamil</option>
              <option value="te-IN">Telugu</option>
              <option value="kn-IN">Kannada</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="engine">Engine</Label>
            <select
              id="engine"
              className={selectCls}
              value={s.speechEngine}
              onChange={(e) => updateSettings({ speechEngine: e.target.value as typeof s.speechEngine })}
            >
              <option value="auto">Auto</option>
              <option value="webspeech">Browser (free)</option>
              <option value="whisper">Groq Whisper</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Preferences">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" value={s.currency} onChange={(e) => updateSettings({ currency: e.target.value.toUpperCase() })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="theme">Theme</Label>
            <select id="theme" className={selectCls} value={s.theme} onChange={(e) => updateSettings({ theme: e.target.value as typeof s.theme })}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="week">Week starts on</Label>
            <select id="week" className={selectCls} value={s.weekStartsOn} onChange={(e) => updateSettings({ weekStartsOn: Number(e.target.value) as 0 | 1 })}>
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="autosave">Auto-save after (s)</Label>
            <Input id="autosave" type="number" min={0} max={30} value={s.autoSaveSeconds} onChange={(e) => updateSettings({ autoSaveSeconds: Number(e.target.value) })} />
          </div>
        </div>
      </Section>
    </main>
  );
}
