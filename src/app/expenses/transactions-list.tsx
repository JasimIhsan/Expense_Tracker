"use client";

import { formatDate } from "@/util";
import { isToday, isYesterday } from "date-fns";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { ExpenseActions } from "./expense-actions";

type TransactionsListProps = {
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   initialTransactions: any[];
};

export function TransactionsList({ initialTransactions }: TransactionsListProps) {
   const [transactions, setTransactions] = useState(initialTransactions);

   useEffect(() => {
      setTransactions(initialTransactions);
   }, [initialTransactions]);

   const handleDelete = (id: number) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
   };

   const groupedTransactions = new Map<string, typeof transactions>();

   transactions.forEach((t) => {
      const date = new Date(t.date);
      let key = formatDate(date);
      if (isToday(date)) key = "Today";
      else if (isYesterday(date)) key = "Yesterday";

      if (!groupedTransactions.has(key)) {
         groupedTransactions.set(key, []);
      }
      groupedTransactions.get(key)!.push(t);
   });

   if (transactions.length === 0) {
      return <div className="text-center py-10 text-muted-foreground">No transactions found.</div>;
   }

   return (
      <div className="space-y-6 mb-8">
         {Array.from(groupedTransactions.entries()).map(([date, group]) => (
            <div key={date} className="space-y-3">
               <div className="flex justify-center my-4 sticky top-16 z-10">
                  <span className="bg-muted/80 backdrop-blur-sm text-xs font-medium px-3 py-1 rounded-full shadow-sm text-muted-foreground border">{date}</span>
               </div>
               {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
               {group.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm group">
                     <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${t.type === "INCOME" ? "bg-green-500/10" : "bg-red-500/10"}`}>{t.type === "INCOME" ? <ArrowDownRight className="w-4 h-4 text-green-500" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}</div>
                        <div>
                           <p className="font-medium">{t.category.name}</p>
                           <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                        </div>
                     </div>
                     <div className="flex items-center space-x-3">
                        <div className="text-right">
                           <p className={`font-bold ${t.type === "INCOME" ? "text-green-600" : "text-foreground"}`}>
                              {t.type === "INCOME" ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                           </p>
                           {t.note && <p className="text-xs text-muted-foreground max-w-[100px] truncate">{t.note}</p>}
                        </div>
                        <ExpenseActions id={t.id} onDelete={() => handleDelete(t.id)} />
                     </div>
                  </div>
               ))}
            </div>
         ))}
      </div>
   );
}
