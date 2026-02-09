"use client";

import { getCategories } from "@/app/actions/categories";
import { addExpense } from "@/app/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AddExpensePage() {
   const router = useRouter();
   const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
   const [loading, setLoading] = useState(false);
   const [formData, setFormData] = useState({
      amount: "",
      categoryId: "",
      date: new Date().toISOString().split("T")[0],
      note: "",
   });

   useEffect(() => {
      const fetchCategories = async () => {
         const { data } = await getCategories();
         if (data) setCategories(data);
      };
      fetchCategories();
   }, []);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
         const result = await addExpense({
            amount: parseFloat(formData.amount),
            categoryId: parseInt(formData.categoryId),
            date: new Date(formData.date),
            note: formData.note,
         });

         if (result.success) {
            router.push("/");
            router.refresh();
         } else {
            alert("Failed to add expense");
         }
      } catch (error) {
         console.error(error);
         alert("An error occurred");
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen pb-20 pt-6">
         <div className="flex items-center mb-6">
            <Link href="/" className="mr-4 p-2 -ml-2 rounded-full hover:bg-muted">
               <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold">Add Expense</h1>
         </div>

         <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
               <label className="text-sm font-medium">Amount</label>
               <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                  <Input type="number" step="0.01" required className="pl-7 text-lg" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-medium">Category</label>
               <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })} required>
                  <SelectTrigger>
                     <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                     {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                           {category.name}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-medium">Date</label>
               <Input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>

            <div className="space-y-2">
               <label className="text-sm font-medium">Note (Optional)</label>
               <Input value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} placeholder="What was this for?" />
            </div>

            <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
               {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add Expense"}
            </Button>
         </form>
      </div>
   );
}
