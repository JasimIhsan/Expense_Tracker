"use client";

import api from "@/lib/axios";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { StatisticsCharts } from "./statistics-charts";
import { StatisticsControls } from "./statistics-controls";

function StatisticsContent() {
   const searchParams = useSearchParams();
   const mode = (searchParams.get("mode") as "monthly" | "yearly") || "monthly";
   const date = new Date();
   const month = Number(searchParams.get("month")) || date.getMonth() + 1;
   const year = Number(searchParams.get("year")) || date.getFullYear();

   const [financials, setFinancials] = useState({ income: 0, expense: 0, balance: 0 });
   const [breakdown, setBreakdown] = useState<{ name: string; value: number }[]>([]);
   const [avgDaily, setAvgDaily] = useState(0);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchData = async () => {
         setLoading(true);
         try {
            // We can fetch everything in one go or separate.
            // The API supports fetching all if no type specified, but our types are different.
            // Let's use separate calls or a combined call if specific.
            // The route default returns all.
            const response = await api.get(`/statistics?mode=${mode}&year=${year}&month=${month}`);

            if (response.data.success) {
               if (mode === "monthly") {
                  const { summary, breakdown: breakdownData, avgDaily: avg } = response.data.data;
                  setFinancials(summary);
                  setAvgDaily(avg);
                  if (breakdownData) {
                     setBreakdown(Object.entries(breakdownData).map(([name, value]) => ({ name, value: value as number })));
                  } else {
                     setBreakdown([]);
                  }
               } else {
                  // Yearly mode - API behaves slightly differently based on implementation plan/code
                  // Let's check the API code. It returns different structure for yearly.
                  // Wait, the API route returns `result` directly for yearly which is `{ success, data: { income... } }`.
                  // It does NOT return breakdown or avg for yearly in the current code path.
                  // So we need to handle that structure.
                  setFinancials(response.data.data);
                  setBreakdown([]);
                  setAvgDaily(0);
               }
            }
         } catch (error) {
            console.error("Failed to fetch statistics", error);
         } finally {
            setLoading(false);
         }
      };

      fetchData();
   }, [mode, month, year]);

   return (
      <div className="min-h-screen pb-24 pt-6">
         <div className="flex items-center mb-6">
            <Link href="/" className="mr-4 p-2 -ml-2 rounded-full hover:bg-muted">
               <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold">Statistics</h1>
         </div>

         <StatisticsControls />

         {loading ? <div className="h-96 flex items-center justify-center text-muted-foreground">Loading statistics...</div> : <StatisticsCharts mode={mode} financials={financials} avgDaily={avgDaily} breakdown={breakdown} />}
      </div>
   );
}

export default function StatisticsPage() {
   return (
      <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
         <StatisticsContent />
      </Suspense>
   );
}
