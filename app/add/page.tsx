"use client";

import { useRouter } from "next/navigation";
import { TxnForm } from "@/components/TxnForm";

export default function AddPage() {
  const router = useRouter();
  return (
    <main className="flex flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="text-xl font-semibold">Add</h1>
      <TxnForm onDone={() => router.push("/")} />
    </main>
  );
}
