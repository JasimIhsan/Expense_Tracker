import { getTransactions } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { TransactionsList } from "./transactions-list";

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

         <TransactionsList initialTransactions={transactions} />

         {(totalPages || 0) > 1 && (
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
               <Button variant="outline" disabled={page >= (totalPages || 0)} asChild={page < (totalPages || 0)}>
                  {page < (totalPages || 0) ? (
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
