"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Web Share Target: the OS share sheet lands here; we forward the text to quick-add. */
function ShareInner() {
  const params = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const text = [params.get("title"), params.get("text"), params.get("url")].filter(Boolean).join(" ").trim();
    router.replace(text ? `/?text=${encodeURIComponent(text)}` : "/");
  }, [params, router]);
  return <p className="p-6 text-center text-sm text-muted-foreground">Opening…</p>;
}

export default function SharePage() {
  return (
    <Suspense>
      <ShareInner />
    </Suspense>
  );
}
