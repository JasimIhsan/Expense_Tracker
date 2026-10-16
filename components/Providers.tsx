"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { useHydrated, useSettings } from "@/lib/settings";
import { startAuth, useSession } from "@/lib/auth/session";
import { seedDefaults } from "@/lib/db/seed";
import { resetCursors, syncNow } from "@/lib/sync/engine";
import { LOCAL_USER } from "@/lib/db/schema";
import { drainQueue } from "@/lib/ai/queue";

export function Providers({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // First launch → onboarding. Wait for hydration: the SSR snapshot says "not onboarded".
  const hydrated = useHydrated();
  useEffect(() => {
    if (hydrated && !settings.onboarded && pathname !== "/onboarding") router.replace("/onboarding");
  }, [hydrated, settings.onboarded, pathname, router]);

  // Seed defaults locally so the app is usable before (or without) sign-in.
  useEffect(() => {
    startAuth();
    seedDefaults(session?.user.id ?? LOCAL_USER).catch(console.error);
  }, [session?.user.id]);

  // Surface unhandled rejections (Dexie errors are async) with their stack.
  useEffect(() => {
    const onReject = (e: PromiseRejectionEvent) => console.error("[unhandled]", e.reason?.message, e.reason?.stack);
    window.addEventListener("unhandledrejection", onReject);
    return () => window.removeEventListener("unhandledrejection", onReject);
  }, []);

  // Parse queued notes on reconnect / resume, independent of sign-in.
  useEffect(() => {
    const run = () => document.visibilityState === "visible" && drainQueue().catch(console.error);
    run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, []);

  // Sync on sign-in, on reconnect and when the app comes back to the foreground.
  useEffect(() => {
    if (!session) return;
    resetCursors().then(() => syncNow());
    const onVisible = () => document.visibilityState === "visible" && syncNow();
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session]);

  return (
    <ThemeProvider attribute="class" defaultTheme={settings.theme} enableSystem>
      {children}
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}
