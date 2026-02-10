"use client";

import api from "@/lib/axios";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CategoriesClient } from "./categories-client";

export default function CategoriesPage() {
   const [expenseCategories, setExpenseCategories] = useState([]);
   const [incomeCategories, setIncomeCategories] = useState([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchCategories = async () => {
         try {
            const [expRes, incRes] = await Promise.all([api.get("/categories?type=EXPENSE"), api.get("/categories?type=INCOME")]);

            if (expRes.data.success) setExpenseCategories(expRes.data.data);
            if (incRes.data.success) setIncomeCategories(incRes.data.data);
         } catch (error) {
            console.error("Failed to fetch categories", error);
         } finally {
            setLoading(false);
         }
      };

      fetchCategories();
   }, []);

   return (
      <div className="min-h-screen pb-20 pt-6">
         <div className="flex items-center mb-6">
            <Link href="/" className="mr-4 p-2 -ml-2 rounded-full hover:bg-muted">
               <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold">Categories</h1>
         </div>

         {loading ? <div className="text-center text-muted-foreground">Loading categories...</div> : <CategoriesClient initialExpenseCategories={expenseCategories} initialIncomeCategories={incomeCategories} />}
      </div>
   );
}
