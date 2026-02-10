"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import api from "@/lib/axios";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function StatsCard() {
   const [financials, setFinancials] = useState({ income: 0, expense: 0, balance: 0 });
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchStats = async () => {
         try {
            const date = new Date();
            const currentMonth = date.getMonth() + 1;
            const currentYear = date.getFullYear();
            const response = await api.get(`/statistics?type=summary&year=${currentYear}&month=${currentMonth}`);
            if (response.data.success) {
               setFinancials(response.data.data);
            }
         } catch (error) {
            console.error("Failed to fetch stats", error);
         } finally {
            setLoading(false);
         }
      };
      fetchStats();
   }, []);

   if (loading) return <div className="h-32 mb-4 bg-muted animate-pulse rounded-xl" />;

   return (
      <div className="grid gap-4 mb-6">
         <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
                  <h2 className="text-3xl font-bold mt-2">₹{financials.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h2>
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
               <p className="text-xl font-bold text-green-600">₹{financials.income.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-4">
               <div className="flex items-center space-x-2 mb-2">
                  <div className="p-1.5 bg-red-500/10 rounded-full">
                     <ArrowUpRight className="w-4 h-4 text-red-500" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Expense</p>
               </div>
               <p className="text-xl font-bold text-red-600">₹{financials.expense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
         </div>
      </div>
   );
}

function RecentTransactions() {
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const [transactions, setTransactions] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchTransactions = async () => {
         try {
            const response = await api.get("/transactions?limit=100&date=today");
            if (response.data.success) {
               setTransactions(response.data.data);
            }
         } catch (error) {
            console.error("Failed to fetch transactions", error);
         } finally {
            setLoading(false);
         }
      };
      fetchTransactions();
   }, []);

   if (loading) {
      return (
         <div className="space-y-4">
            {[1, 2, 3].map((i) => (
               <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
         </div>
      );
   }

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
            <h3 className="font-semibold text-lg">Today&apos;s Transactions</h3>
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
                        {t.note && <p className="text-xs text-muted-foreground max-w-[100px] truncate">{t.note}</p>}
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="text-right">
                        <p className={`font-bold ${t.type === "INCOME" ? "text-green-600" : "text-foreground"}`}>
                           {t.type === "INCOME" ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                     </div>
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
            <ThemeToggle />
         </header>

         <StatsCard />
         <RecentTransactions />
      </div>
   );
}
