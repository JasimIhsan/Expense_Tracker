"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/lib/settings";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type Step = "welcome" | "signin";

/** First launch: sign in for sync (when the deployment has Supabase configured) or go local-only. */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const syncAvailable = isSupabaseConfigured();

  function finish() {
    updateSettings({ onboarded: true });
    router.replace("/");
  }

  async function sendMagicLink() {
    const sb = getSupabase();
    if (!sb) return toast.error("Sync is not configured on this deployment");
    setBusy(true);
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  async function signInGoogle() {
    const sb = getSupabase();
    if (!sb) return toast.error("Sync is not configured on this deployment");
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
            <p className="text-muted-foreground">Add expenses by voice or a quick note. Works offline and syncs across your devices.</p>
          </div>
          <div className="flex flex-col gap-2">
            {syncAvailable ? (
              <>
                <Button size="lg" className="h-12" onClick={() => setStep("signin")}>
                  Sign in to sync
                </Button>
                <Button size="lg" variant="ghost" className="h-12" onClick={finish}>
                  Use on this device only
                </Button>
              </>
            ) : (
              <Button size="lg" className="h-12" onClick={finish}>
                Get started
              </Button>
            )}
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
          <Button size="lg" variant="ghost" className="h-12" onClick={finish}>
            {sent ? "Continue" : "Skip for now"}
          </Button>
        </>
      )}
    </main>
  );
}
