"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSettings, updateSettings } from "@/lib/settings";
import { getSupabase, resetSupabase } from "@/lib/supabase/client";
import { addGroqKey } from "@/lib/ai/keys";

type Step = "welcome" | "supabase" | "signin" | "groq";

export default function OnboardingPage() {
  const router = useRouter();
  const s = getSettings();
  const [step, setStep] = useState<Step>("welcome");
  const [url, setUrl] = useState(s.supabaseUrl);
  const [anon, setAnon] = useState(s.supabaseAnonKey);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [groq, setGroq] = useState("");
  const [busy, setBusy] = useState(false);

  function finish() {
    updateSettings({ onboarded: true });
    router.replace("/");
  }

  async function saveSupabase() {
    updateSettings({ supabaseUrl: url.trim(), supabaseAnonKey: anon.trim() });
    resetSupabase();
    setStep("signin");
  }

  async function sendMagicLink() {
    const sb = getSupabase();
    if (!sb) return toast.error("Supabase is not configured");
    setBusy(true);
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  async function signInGoogle() {
    const sb = getSupabase();
    if (!sb) return toast.error("Supabase is not configured");
    updateSettings({ onboarded: true });
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) toast.error(error.message);
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center gap-6 p-6">
      {step === "welcome" && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold">Paisa</h1>
            <p className="text-muted-foreground">
              Add expenses by voice or a quick note. Works offline, syncs across devices, and uses your own API keys.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="lg" className="h-12" onClick={() => setStep("supabase")}>
              Set up sync
            </Button>
            <Button size="lg" variant="ghost" className="h-12" onClick={() => setStep("groq")}>
              Use on this device only
            </Button>
          </div>
        </>
      )}

      {step === "supabase" && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Your Supabase project</h1>
            <p className="text-sm text-muted-foreground">
              Create a free project at supabase.com, run <code>supabase/migrations/0001_init.sql</code> in its SQL editor, then paste the
              project URL and anon key from Settings → API. These stay on this device.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="url">Project URL</Label>
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" className="h-11" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="anon">Anon key</Label>
              <Input id="anon" value={anon} onChange={(e) => setAnon(e.target.value)} placeholder="eyJ…" className="h-11" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="lg" className="h-12" disabled={!url || !anon} onClick={saveSupabase}>
              Continue
            </Button>
            <Button size="lg" variant="ghost" className="h-12" onClick={() => setStep("welcome")}>
              Back
            </Button>
          </div>
        </>
      )}

      {step === "signin" && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="text-sm text-muted-foreground">A magic link keeps it simple: no password to remember.</p>
          </div>
          {sent ? (
            <p className="rounded-lg border border-border p-3 text-sm">
              Check <b>{email}</b> for the link. Open it on this device, then come back.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
              </div>
              <Button size="lg" className="h-12" disabled={!email || busy} onClick={sendMagicLink}>
                Send magic link
              </Button>
              <Button size="lg" variant="outline" className="h-12" onClick={signInGoogle}>
                Continue with Google
              </Button>
            </div>
          )}
          <Button size="lg" variant="ghost" className="h-12" onClick={() => setStep("groq")}>
            {sent ? "Continue" : "Skip for now"}
          </Button>
        </>
      )}

      {step === "groq" && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">AI (optional)</h1>
            <p className="text-sm text-muted-foreground">
              Paste a free Groq API key from console.groq.com to parse voice and text notes. Add more keys later in Settings; the app
              rotates between them when one hits its limit. Everything works without a key too.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="groq">Groq API key</Label>
            <Input id="groq" value={groq} onChange={(e) => setGroq(e.target.value)} placeholder="gsk_…" className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              className="h-12"
              onClick={() => {
                if (groq.trim()) addGroqKey(groq.trim());
                finish();
              }}
            >
              {groq.trim() ? "Save and start" : "Start without AI"}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
