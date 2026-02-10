"use client";

import api from "@/lib/axios";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EditTransactionForm } from "./edit-transaction-form";

export default function EditTransactionPage() {
   const router = useRouter();
   const params = useParams(); // Now standard use client hook
   const id = params?.id;

   const [transaction, setTransaction] = useState(null);
   const [expenseCategories, setExpenseCategories] = useState([]);
   const [incomeCategories, setIncomeCategories] = useState([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (!id) return;

      const fetchData = async () => {
         try {
            const [trxRes, expRes, incRes] = await Promise.all([api.get(`/transactions/${id}`), api.get("/categories?type=EXPENSE"), api.get("/categories?type=INCOME")]);

            if (trxRes.data.success) {
               setTransaction(trxRes.data.data);
            } else {
               alert("Transaction not found");
               router.push("/");
               return;
            }
            if (expRes.data.success) setExpenseCategories(expRes.data.data);
            if (incRes.data.success) setIncomeCategories(incRes.data.data);
         } catch (error) {
            console.error("Failed to fetch data", error);
            // Handle error generally
         } finally {
            setLoading(false);
         }
      };

      fetchData();
   }, [id, router]);

   if (loading) {
      return (
         <div className="flex h-screen items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
         </div>
      );
   }

   if (!transaction) return null;

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

         <EditTransactionForm transaction={transaction} expenseCategories={expenseCategories} incomeCategories={incomeCategories} />
      </div>
   );
}
