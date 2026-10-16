"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { addMonths, format, parse, startOfMonth } from "date-fns";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { useLookups, useTransactionsBetween, sumByType } from "@/hooks/useData";
import { formatMoney, useSettings } from "@/lib/settings";

/** Printable month report: use the browser's Print → Save as PDF (works on Android and iOS share sheets). */
function ReportInner() {
  const params = useSearchParams();
  const settings = useSettings();
  const { categoryById, accountById } = useLookups();
  const month = useMemo(() => {
    const m = params.get("month");
    return m ? startOfMonth(parse(m, "yyyy-MM", new Date())) : startOfMonth(new Date());
  }, [params]);
  const txns = useTransactionsBetween(month.toISOString(), addMonths(month, 1).toISOString());
  const totals = sumByType(txns);
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) if (t.type === "debit") m.set(t.category_id ?? "", (m.get(t.category_id ?? "") ?? 0) + t.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [txns]);
  const fm = (n: number) => formatMoney(n, settings);
  const sorted = [...txns].sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : 1));

  return (
    <main className="flex flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))] print:p-0 print:text-black">
      <div className="print:hidden">
        <PageHeader
          title="Monthly report"
          back="/analytics"
          right={
            <Button size="sm" onClick={() => window.print()}>
              <Printer data-icon="inline-start" /> Save as PDF
            </Button>
          }
        />
      </div>

      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{format(month, "MMMM yyyy")}</h2>
        <span className="text-xs text-muted-foreground print:text-black">Paisa · generated {format(new Date(), "d MMM yyyy")}</span>
      </header>

      <table className="w-full text-sm">
        <tbody>
          <tr><td className="py-0.5">Spent</td><td className="text-right tabular-nums">{fm(totals.debit)}</td></tr>
          <tr><td className="py-0.5">Received</td><td className="text-right tabular-nums">{fm(totals.credit)}</td></tr>
          <tr className="font-semibold"><td className="py-0.5">Net</td><td className="text-right tabular-nums">{fm(totals.net)}</td></tr>
        </tbody>
      </table>

      <h3 className="mt-2 text-sm font-semibold">By category</h3>
      <table className="w-full text-sm">
        <tbody>
          {byCategory.map(([id, amount]) => (
            <tr key={id} className="border-t border-border print:border-gray-300">
              <td className="py-1">{categoryById.get(id)?.name ?? "Uncategorised"}</td>
              <td className="py-1 text-right tabular-nums text-muted-foreground print:text-black">{totals.debit ? Math.round((amount / totals.debit) * 100) : 0}%</td>
              <td className="py-1 text-right tabular-nums">{fm(amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-2 text-sm font-semibold">Transactions ({sorted.length})</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground print:text-black">
            <th className="py-1 font-medium">Date</th>
            <th className="py-1 font-medium">Note</th>
            <th className="py-1 font-medium">Category</th>
            <th className="py-1 font-medium">Account</th>
            <th className="py-1 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <tr key={t.id} className="border-t border-border print:border-gray-300">
              <td className="py-1 whitespace-nowrap">{format(new Date(t.occurred_at), "d MMM")}</td>
              <td className="py-1">{t.note}</td>
              <td className="py-1">{t.type === "transfer" ? "Transfer" : (categoryById.get(t.category_id ?? "")?.name ?? "")}</td>
              <td className="py-1">{accountById.get(t.account_id ?? "")?.name ?? ""}</td>
              <td className="py-1 text-right tabular-nums whitespace-nowrap">
                {t.type === "debit" ? "−" : t.type === "credit" ? "+" : ""}
                {fm(t.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportInner />
    </Suspense>
  );
}
