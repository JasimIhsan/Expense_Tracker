import { getAvgDailyExpense, getCategoryBreakdown, getFinancialSummary, getYearlySummary } from "@/app/actions/statistics";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { StatisticsCharts } from "./statistics-charts";
import { StatisticsControls } from "./statistics-controls";

export const revalidate = 0;

type Props = {
   searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function StatisticsPage(props: Props) {
   const searchParams = await props.searchParams;
   const mode = (searchParams.mode as "monthly" | "yearly") || "monthly";
   const date = new Date();
   const month = Number(searchParams.month) || date.getMonth() + 1;
   const year = Number(searchParams.year) || date.getFullYear();

   let financials = { income: 0, expense: 0, balance: 0 };
   let breakdown: { name: string; value: number }[] = [];
   let avgDaily = 0;

   if (mode === "monthly") {
      const { data: breakdownData } = await getCategoryBreakdown(year, month);
      const { data: financialData } = await getFinancialSummary(year, month);
      const { data: avgData } = await getAvgDailyExpense(year, month);

      if (breakdownData) {
         breakdown = Object.entries(breakdownData).map(([name, value]) => ({ name, value }));
      }
      if (financialData) financials = financialData;
      if (avgData) avgDaily = avgData;
   } else {
      const { data: financialData } = await getYearlySummary(year);
      if (financialData) financials = financialData;
   }

   return (
      <div className="min-h-screen pb-24 pt-6">
         <div className="flex items-center mb-6">
            <Link href="/" className="mr-4 p-2 -ml-2 rounded-full hover:bg-muted">
               <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold">Statistics</h1>
         </div>

         <StatisticsControls />

         <StatisticsCharts mode={mode} financials={financials} avgDaily={avgDaily} breakdown={breakdown} />
      </div>
   );
}
