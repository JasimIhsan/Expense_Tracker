import { getExpenses } from "@/app/actions/expenses";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { DeleteExpenseButton } from "./delete-button";

export const revalidate = 0;

type Props = {
   searchParams: Promise<{ page?: string }>;
};

export default async function ExpensesPage(props: Props) {
   const searchParams = await props.searchParams;
   const page = Number(searchParams.page) || 1;
   const limit = 20;
   const { data: expenses, totalPages } = await getExpenses({ page, limit });

   if (!expenses) {
      return <div>Failed to load expenses</div>;
   }

   return (
      <div className="min-h-screen pb-20 pt-6">
         <div className="flex items-center mb-6">
            <Link href="/" className="mr-4 p-2 -ml-2 rounded-full hover:bg-muted">
               <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold">All Expenses</h1>
         </div>

         <div className="space-y-3 mb-8">
            {expenses.length === 0 ? (
               <div className="text-center py-10 text-muted-foreground">No expenses found.</div>
            ) : (
               expenses.map((expense: any) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm group">
                     <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-full">
                           <Calendar className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                           <p className="font-medium">{expense.category.name}</p>
                           <p className="text-xs text-muted-foreground">{format(new Date(expense.date), "MMM d, yyyy")}</p>
                        </div>
                     </div>
                     <div className="flex items-center space-x-3">
                        <div className="text-right">
                           <p className="font-bold">-${Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                           {expense.note && <p className="text-xs text-muted-foreground max-w-[100px] truncate">{expense.note}</p>}
                        </div>
                        <DeleteExpenseButton id={expense.id} />
                     </div>
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
