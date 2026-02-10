"use client";

import { TransactionsList } from "@/app/expenses/transactions-list";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ExpensesContent() {
   const searchParams = useSearchParams();
   const page = Number(searchParams.get("page")) || 1;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const [transactions, setTransactions] = useState<any[]>([]);
   const [totalPages, setTotalPages] = useState(0);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchTransactions = async () => {
         setLoading(true);
         try {
            const response = await api.get(`/transactions?page=${page}&limit=20`);
            if (response.data.success) {
               setTransactions(response.data.data);
               setTotalPages(response.data.totalPages);
            }
         } catch (error) {
            console.error("Failed to fetch transactions", error);
         } finally {
            setLoading(false);
         }
      };

      fetchTransactions();
   }, [page]);

   if (loading) {
      return <div className="min-h-screen pt-6 text-center text-muted-foreground">Loading transactions...</div>;
   }

   return (
      <>
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
               <Link href="/" className="mr-4 p-2 -ml-2 rounded-full hover:bg-muted">
                  <ArrowLeft className="w-6 h-6" />
               </Link>
               <h1 className="text-2xl font-bold">All Transactions</h1>
            </div>
         </div>

         <TransactionsList initialTransactions={transactions} />

         {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-4">
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
      </>
   );
}

export default function ExpensesPage() {
   return (
      <div className="min-h-screen pb-20 pt-6">
         <Suspense fallback={<div className="text-center pt-10">Loading...</div>}>
            <ExpensesContent />
         </Suspense>
      </div>
   );
}
