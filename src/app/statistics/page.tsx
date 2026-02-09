"use client";

import { getCategoryBreakdown, getMonthlyTotal, getYearlyTotal } from "@/app/actions/statistics";
import { format } from "date-fns";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"];

export default function StatisticsPage() {
   const [mode, setMode] = useState<"monthly" | "yearly">("monthly");
   const [date, setDate] = useState(new Date());
   const [breakdown, setBreakdown] = useState<{ name: string; value: number }[]>([]);
   const [total, setTotal] = useState(0);

   useEffect(() => {
      const fetchData = async () => {
         const year = date.getFullYear();
         const month = date.getMonth() + 1;

         if (mode === "monthly") {
            const { data: breakdownData } = await getCategoryBreakdown(year, month);
            const { data: totalData } = await getMonthlyTotal(year, month);

            if (breakdownData) {
               setBreakdown(Object.entries(breakdownData).map(([name, value]) => ({ name, value })));
            }
            if (totalData) setTotal(totalData);
         } else {
            const { data: totalData } = await getYearlyTotal(year);
            if (totalData) setTotal(totalData);
            setBreakdown([]);
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

   return (
      <div className="min-h-screen pb-20 pt-6">
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

         <div className="bg-card border rounded-xl p-6 shadow-sm mb-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
            <h3 className="text-3xl font-bold">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
         </div>

         {mode === "monthly" && breakdown.length > 0 ? (
            <div className="bg-card border rounded-xl p-6 shadow-sm h-[400px]">
               <h3 className="font-semibold mb-4">Category Breakdown</h3>
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie data={breakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {breakdown.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip formatter={(value: number | undefined) => `$${(value || 0).toLocaleString()}`} />
                     <Legend />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         ) : mode === "monthly" ? (
            <div className="text-center py-10 text-muted-foreground">No data for this month.</div>
         ) : (
            <div className="text-center py-10 text-muted-foreground">Yearly breakdown chart not implemented yet.</div>
         )}
      </div>
   );
}
