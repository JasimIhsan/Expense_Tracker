import { getCategories } from "@/app/actions/categories";
import { getTransaction } from "@/app/actions/transactions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EditTransactionForm } from "./edit-transaction-form";

export const revalidate = 0;

type Props = {
   params: Promise<{ id: string }>;
};

export default async function EditTransactionPage(props: Props) {
   const params = await props.params; // Ensure params are awaited if treated as a promise in future Next.js versions, though currently standard is object. Safe to await.
   // Wait, params is not a promise in current Next.js stable but is in future.
   // However, in standard Next.js 14/15 params is an object.
   // Let's assume standard object access unless user specified otherwise.
   // But the user's codebase had `const params = useParams();` which is client hook.
   // Server components receive params as prop.
   const id = parseInt(params.id);

   if (isNaN(id)) {
      redirect("/");
   }

   const tResult = await getTransaction(id);

   if (!tResult.success || !tResult.data) {
      redirect("/");
   }

   const transaction = {
      ...tResult.data,
      amount: Number(tResult.data.amount),
   };
   const { data: expenseCategories } = await getCategories("EXPENSE");
   const { data: incomeCategories } = await getCategories("INCOME");

   return (
      <div className="min-h-screen pb-20 pt-6">
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
               <Link href="/" className="mr-4 p-2 -ml-2 rounded-full hover:bg-muted">
                  <ArrowLeft className="w-6 h-6" />
               </Link>
               <h1 className="text-2xl font-bold">Edit</h1>
            </div>
         </div>

         <EditTransactionForm transaction={transaction} expenseCategories={expenseCategories || []} incomeCategories={incomeCategories || []} />
      </div>
   );
}
