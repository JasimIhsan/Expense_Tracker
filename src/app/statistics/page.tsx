"use client";

import { getAvgDailyExpense, getCategoryBreakdown, getFinancialSummary, getYearlySummary } from "@/app/actions/statistics";
import { format } from "date-fns";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"];

export default function StatisticsPage() {
   const [mode, setMode] = useState<"monthly" | "yearly">("monthly");
   const [date, setDate] = useState(new Date());
   const [breakdown, setBreakdown] = useState<{ name: string; value: number }[]>([]);
   const [financials, setFinancials] = useState({ income: 0, expense: 0, balance: 0 });
   const [avgDaily, setAvgDaily] = useState(0);

   useEffect(() => {
      const fetchData = async () => {
         const year = date.getFullYear();
         const month = date.getMonth() + 1;

         if (mode === "monthly") {
            const { data: breakdownData } = await getCategoryBreakdown(year, month);
            const { data: financialData } = await getFinancialSummary(year, month);
            const { data: avgData } = await getAvgDailyExpense(year, month);

            if (breakdownData) {
               setBreakdown(Object.entries(breakdownData).map(([name, value]) => ({ name, value })));
            } else {
               setBreakdown([]);
            }
            if (financialData) setFinancials(financialData);
            if (avgData) setAvgDaily(avgData);
         } else {
            // Yearly mode
            const { data: financialData } = await getYearlySummary(year);
            // Yearly breakdown could be added later if needed, mostly expensive query
            setBreakdown([]);
            if (financialData) setFinancials(financialData);
            setAvgDaily(0); // Not implemented/relevant for yearly summary yet
         }
      };

      fetchData();
   }, [date, mode]);

   const navigate = (direction: "prev" | "next") => {
      const newDate = new Date(date);
      if (mode === "monthly") {
         newDate.setMonth(date.getMonth() + (direction === "next" ? 1 : -1));
      } else {
         newDate.setFullYear(date.getFullYear() + (direction === "next" ? 1 : -1));
      }
      setDate(newDate);
   };

   const comparisonData = [
      { name: "Income", amount: financials.income },
      { name: "Expense", amount: financials.expense },
   ];

   return (
      <div className="min-h-screen pb-24 pt-6">
         <div className="flex items-center mb-6">
            <Link href="/" className="mr-4 p-2 -ml-2 rounded-full hover:bg-muted">
               <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold">Statistics</h1>
         </div>

         <div className="flex justify-center mb-6">
            <div className="bg-muted p-1 rounded-lg flex">
               <button onClick={() => setMode("monthly")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  Monthly
               </button>
               <button onClick={() => setMode("yearly")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  Yearly
               </button>
            </div>
         </div>

         <div className="flex items-center justify-between mb-8">
            <button onClick={() => navigate("prev")} className="p-2 hover:bg-muted rounded-full">
               <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">{mode === "monthly" ? format(date, "MMMM yyyy") : format(date, "yyyy")}</h2>
            <button onClick={() => navigate("next")} className="p-2 hover:bg-muted rounded-full">
               <ChevronRight className="w-5 h-5" />
            </button>
         </div>

         {/* Financial Summary Cards */}
         <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-card border rounded-xl p-4 shadow-sm">
               <p className="text-xs text-muted-foreground mb-1">Total Income</p>
               <h3 className="text-lg font-bold text-green-600">₹{financials.income.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-card border rounded-xl p-4 shadow-sm">
               <p className="text-xs text-muted-foreground mb-1">Total Expense</p>
               <h3 className="text-lg font-bold text-red-600">₹{financials.expense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-card border rounded-xl p-4 shadow-sm col-span-2">
               <div className="flex justify-between items-center">
                  <div>
                     <p className="text-xs text-muted-foreground mb-1">Net Balance</p>
                     <h3 className="text-2xl font-bold">₹{financials.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
                  </div>
                  {mode === "monthly" && (
                     <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Avg. Daily Expense</p>
                        <h3 className="text-lg font-semibold">₹{avgDaily.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</h3>
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Income vs Expense Chart */}
         <div className="bg-card border rounded-xl p-6 pb-12 shadow-sm mb-6 h-[400px]">
            <h3 className="font-semibold mb-4">Income vs Expense</h3>
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number | undefined) => `₹${(value || 0).toLocaleString("en-IN")}`} cursor={{ fill: "transparent" }} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={50}>
                     {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === "Income" ? "#16a34a" : "#dc2626"} />
                     ))}
                  </Bar>
               </BarChart>
            </ResponsiveContainer>
         </div>

         {/* Category Breakdown */}
         {mode === "monthly" && breakdown.length > 0 ? (
            <div className="bg-card border rounded-xl p-6 pb-12 shadow-sm h-[400px]">
               <h3 className="font-semibold mb-4">Expense Breakdown</h3>
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie data={breakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {breakdown.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip formatter={(value: number | undefined) => `₹${(value || 0).toLocaleString("en-IN")}`} />
                     <Legend />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         ) : mode === "monthly" ? (
            <div className="text-center py-10 text-muted-foreground">No expense data for this month.</div>
         ) : null}
      </div>
   );
}
