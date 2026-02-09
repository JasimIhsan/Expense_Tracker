import { getExpenses } from "@/app/actions/expenses";
import { getMonthlyTotal } from "@/app/actions/statistics";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Calendar, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export const revalidate = 0;

async function StatsCard() {
   const date = new Date();
   const currentMonth = date.getMonth() + 1;
   const currentYear = date.getFullYear();

   const lastMonthDate = new Date(date.getFullYear(), date.getMonth() - 1, 1);
   const lastMonth = lastMonthDate.getMonth() + 1;
   const lastYear = lastMonthDate.getFullYear();

   const { data: currentTotal } = await getMonthlyTotal(currentYear, currentMonth);
   const { data: lastTotal } = await getMonthlyTotal(lastYear, lastMonth);

   const current = currentTotal || 0;
   const last = lastTotal || 0;

   const diff = current - last;
   const percentage = last === 0 ? 100 : ((diff / last) * 100).toFixed(1);
   const isUp = diff > 0;

   return (
      <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6 mb-6">
         <div className="flex justify-between items-start">
            <div>
               <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
               <h2 className="text-3xl font-bold mt-2">${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            </div>
            <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${isUp ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"}`}>
               {isUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
               {Math.abs(Number(percentage))}%
            </div>
         </div>
         <p className="text-xs text-muted-foreground mt-4">vs last month (${last.toLocaleString()})</p>
      </div>
   );
}

async function RecentExpenses() {
   const { data: expenses } = await getExpenses({ limit: 5 });

   if (!expenses || expenses.length === 0) {
      return (
         <div className="text-center py-10">
            <p className="text-muted-foreground">No expenses yet.</p>
            <Link href="/add" className="text-primary font-medium mt-2 inline-block">
               Add your first expense
            </Link>
         </div>
      );
   }

   return (
      <div className="space-y-4">
         <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Recent Transactions</h3>
            <Link href="/expenses" className="text-sm text-primary hover:underline">
               View All
            </Link>
         </div>
         <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {expenses.map((expense: any) => (
               <div key={expense.id} className="flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm">
                  <div className="flex items-center space-x-4">
                     <div className="p-2 bg-primary/10 rounded-full">
                        <Calendar className="w-4 h-4 text-primary" />
                     </div>
                     <div>
                        <p className="font-medium">{expense.category.name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(expense.date), "MMM d, yyyy")}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="font-bold">-${Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                     {expense.note && <p className="text-xs text-muted-foreground max-w-[100px] truncate">{expense.note}</p>}
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
}

export default function Home() {
   return (
      <div className="flex flex-col min-h-screen pb-20">
         <header className="flex justify-between items-center py-6">
            <div>
               <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
               <p className="text-muted-foreground">Welcome back</p>
            </div>
            <Link href="/add" className="bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors">
               <Plus className="w-6 h-6" />
            </Link>
         </header>

         <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded-xl" />}>
            <StatsCard />
         </Suspense>

         <Suspense
            fallback={
               <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                     <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
               </div>
            }
         >
            <RecentExpenses />
         </Suspense>
      </div>
   );
}
