"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"];

type StatisticsChartsProps = {
   mode: "monthly" | "yearly";
   financials: { income: number; expense: number; balance: number };
   avgDaily: number;
   breakdown: { name: string; value: number }[];
};

export function StatisticsCharts({ mode, financials, avgDaily, breakdown }: StatisticsChartsProps) {
   const comparisonData = [
      { name: "Income", amount: financials.income },
      { name: "Expense", amount: financials.expense },
   ];

   return (
      <>
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
      </>
   );
}
