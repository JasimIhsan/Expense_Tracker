import { getFinancialSummary } from "@/app/actions/statistics";
import { getTransactions } from "@/app/actions/transactions";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export const revalidate = 0;

async function StatsCard() {
   const date = new Date();
   const currentMonth = date.getMonth() + 1;
   const currentYear = date.getFullYear();

   const { data } = await getFinancialSummary(currentYear, currentMonth);
   const income = data?.income || 0;
   const expense = data?.expense || 0;
   const balance = data?.balance || 0;

   return (
      <div className="grid gap-4 mb-6">
         <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
                  <h2 className="text-3xl font-bold mt-2">₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h2>
               </div>
               <div className="p-2 bg-primary/10 rounded-full">
                  <Wallet className="w-6 h-6 text-primary" />
               </div>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-4">
               <div className="flex items-center space-x-2 mb-2">
                  <div className="p-1.5 bg-green-500/10 rounded-full">
                     <ArrowDownRight className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Income</p>
               </div>
               <p className="text-xl font-bold text-green-600">₹{income.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-4">
               <div className="flex items-center space-x-2 mb-2">
                  <div className="p-1.5 bg-red-500/10 rounded-full">
                     <ArrowUpRight className="w-4 h-4 text-red-500" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Expense</p>
               </div>
               <p className="text-xl font-bold text-red-600">₹{expense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
         </div>
      </div>
   );
}

async function RecentTransactions() {
   const { data: transactions } = await getTransactions({ limit: 100, date: "today" });

   if (!transactions || transactions.length === 0) {
      return (
         <div className="text-center py-10">
            <p className="text-muted-foreground">No transactions for today.</p>
            <Link href="/add" className="text-primary font-medium mt-2 inline-block">
               Add a transaction
            </Link>
         </div>
      );
   }

   return (
      <div className="space-y-4">
         <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Today's Transactions</h3>
            <Link href="/expenses" className="text-sm text-primary hover:underline">
               View All
            </Link>
         </div>

         <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {transactions.map((t: any) => (
               <div key={t.id} className="group flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                     <div className={`p-2 rounded-full ${t.type === "INCOME" ? "bg-green-500/10" : "bg-red-500/10"}`}>{t.type === "INCOME" ? <ArrowDownRight className="w-4 h-4 text-green-500" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}</div>
                     <div>
                        <p className="font-medium">{t.category.name}</p>
                        {/* <p className="text-xs text-muted-foreground">{format(new Date(t.date), "h:mm a")}</p> */}
                        {t.note && <p className="text-xs text-muted-foreground max-w-[100px] truncate">{t.note}</p>}
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="text-right">
                        <p className={`font-bold ${t.type === "INCOME" ? "text-green-600" : "text-foreground"}`}>
                           {t.type === "INCOME" ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                     </div>
                     {/* <Link href={`/edit/${t.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground">
                        <Pencil className="w-4 h-4" />
                     </Link> */}
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
               <p className="text-muted-foreground">Welcome back, Jasim!</p>
            </div>
            {/* <Link href="/add" className="bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors">
               <Plus className="w-6 h-6" />
            </Link> */}
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
            <RecentTransactions />
         </Suspense>
      </div>
   );
}
