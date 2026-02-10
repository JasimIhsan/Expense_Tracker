import { getAvgDailyExpense, getCategoryBreakdown, getFinancialSummary, getYearlySummary } from "@/app/actions/statistics";
import { NextRequest, NextResponse } from "next/server";

// Reusing logic from server actions to keep code DRY, but exposing via API
// Alternatively, logic could be moved to a shared lib/service.
export async function GET(request: NextRequest) {
   try {
      const searchParams = request.nextUrl.searchParams;
      const type = searchParams.get("type") as "summary" | "breakdown" | "daily_avg";
      const year = Number(searchParams.get("year"));
      const month = Number(searchParams.get("month"));
      const mode = (searchParams.get("mode") as "monthly" | "yearly") || "monthly";

      if (!year) {
         return NextResponse.json({ success: false, error: "Year is required" }, { status: 400 });
      }

      if (mode === "yearly") {
         const result = await getYearlySummary(year);
         return NextResponse.json(result);
      }

      if (!month) {
         return NextResponse.json({ success: false, error: "Month is required for monthly mode" }, { status: 400 });
      }

      switch (type) {
         case "summary":
            return NextResponse.json(await getFinancialSummary(year, month));
         case "breakdown":
            // Note: Breakdown might need transaction type filter if extended
            return NextResponse.json(await getCategoryBreakdown(year, month, "EXPENSE"));
         case "daily_avg":
            return NextResponse.json(await getAvgDailyExpense(year, month));
         default:
            // Return all for convenience if no specific type requested
            const [summary, breakdown, avg] = await Promise.all([getFinancialSummary(year, month), getCategoryBreakdown(year, month, "EXPENSE"), getAvgDailyExpense(year, month)]);
            return NextResponse.json({
               success: true,
               data: {
                  summary: summary.data,
                  breakdown: breakdown.data,
                  avgDaily: avg.data,
               },
            });
      }
   } catch (error) {
      console.error("Failed to get statistics:", error);
      return NextResponse.json({ success: false, error: "Failed to get statistics" }, { status: 500 });
   }
}
