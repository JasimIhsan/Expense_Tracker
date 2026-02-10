import { getTransactions } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/util";
import { isToday, isYesterday } from "date-fns";
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ExpenseActions } from "./expense-actions";

export const revalidate = 0;

type Props = {
   searchParams: Promise<{ page?: string }>;
};

export default async function ExpensesPage(props: Props) {
   const searchParams = await props.searchParams;
   const page = Number(searchParams.page) || 1;
   const limit = 20;
   const { data: transactions, totalPages } = await getTransactions({ page, limit });

   if (!transactions) {
      return <div>Failed to load transactions</div>;
   }

   const groupedTransactions = new Map<string, typeof transactions>();

   if (transactions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transactions.forEach((t: any) => {
         const date = new Date(t.date);
         let key = formatDate(date);
         if (isToday(date)) key = "Today";
         else if (isYesterday(date)) key = "Yesterday";

         if (!groupedTransactions.has(key)) {
            groupedTransactions.set(key, []);
         }
         groupedTransactions.get(key)!.push(t);
      });
   }

   return (
      <div className="min-h-screen pb-20 pt-6">
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
               <Link href="/" className="mr-4 p-2 -ml-2 rounded-full hover:bg-muted">
                  <ArrowLeft className="w-6 h-6" />
               </Link>
               <h1 className="text-2xl font-bold">All Transactions</h1>
            </div>
         </div>

         <div className="space-y-6 mb-8">
            {transactions?.length === 0 ? (
               <div className="text-center py-10 text-muted-foreground">No transactions found.</div>
            ) : (
               Array.from(groupedTransactions.entries()).map(([date, group]) => (
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
                              <ExpenseActions id={t.id} />
                           </div>
                        </div>
                     ))}
                  </div>
               ))
            )}
         </div>

         {totalPages && totalPages > 1 && (
            <div className="flex justify-center space-x-2">
               <Button variant="outline" disabled={page <= 1} asChild={page > 1}>
                  {page > 1 ? (
                     <Link href={`/expenses?page=${page - 1}`}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                     </Link>
                  ) : (
                     <span>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                     </span>
                  )}
               </Button>
               <Button variant="outline" disabled={page >= totalPages} asChild={page < totalPages}>
                  {page < totalPages ? (
                     <Link href={`/expenses?page=${page + 1}`}>
                        Next <ArrowRight className="w-4 h-4 ml-2" />
                     </Link>
                  ) : (
                     <span>
                        Next <ArrowRight className="w-4 h-4 ml-2" />
                     </span>
                  )}
               </Button>
            </div>
         )}
      </div>
   );
}

// http://localhost:3000/expenses/2/edit
