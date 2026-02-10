import { getCategories } from "@/app/actions/categories";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AddTransactionForm } from "./add-transaction-form";

export const revalidate = 0;

export default async function AddTransactionPage() {
   const { data: expenseCategories } = await getCategories("EXPENSE");
   const { data: incomeCategories } = await getCategories("INCOME");

   return (
      <div className="min-h-screen pb-20 pt-6">
         <div className="flex items-center mb-6">
            <Link href="/" className="mr-4 p-2 -ml-2 rounded-full hover:bg-muted">
               <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold">Add Transaction</h1>
         </div>

         <AddTransactionForm expenseCategories={expenseCategories || []} incomeCategories={incomeCategories || []} />
      </div>
   );
}
