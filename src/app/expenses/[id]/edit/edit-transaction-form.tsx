"use client";

import { deleteTransaction, updateTransaction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionType } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = {
   id: number;
   name: string;
};

type Transaction = {
   id: number;
   amount: number;
   type: TransactionType;
   categoryId: number;
   date: Date;
   note: string | null;
};

export function EditTransactionForm({ transaction, expenseCategories, incomeCategories }: { transaction: Transaction; expenseCategories: Category[]; incomeCategories: Category[] }) {
   const router = useRouter();
   const [type, setType] = useState<TransactionType>(transaction.type);
   const [saving, setSaving] = useState(false);
   const [deleting, setDeleting] = useState(false);
   const [formData, setFormData] = useState({
      amount: transaction.amount.toString(),
      categoryId: transaction.categoryId.toString(),
      date: new Date(transaction.date).toISOString().split("T")[0],
      note: transaction.note || "",
   });

   const categories = type === "EXPENSE" ? expenseCategories : incomeCategories;

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);

      try {
         const result = await updateTransaction(transaction.id, {
            amount: parseFloat(formData.amount),
            categoryId: parseInt(formData.categoryId),
            date: new Date(formData.date),
            note: formData.note,
            type,
         });

         if (result.success) {
            router.push("/");
            router.refresh();
         } else {
            alert("Failed to update transaction");
         }
      } catch (error) {
         console.error(error);
         alert("An error occurred");
      } finally {
         setSaving(false);
      }
   };

   const handleDelete = async () => {
      if (!confirm("Are you sure you want to delete this transaction?")) return;
      setDeleting(true);
      try {
         const result = await deleteTransaction(transaction.id);
         if (result.success) {
            router.push("/");
            router.refresh();
         } else {
            alert("Failed to delete transaction");
         }
      } catch (error) {
         console.error(error);
         alert("An error occurred");
      } finally {
         setDeleting(false);
      }
   };

   return (
      <>
         <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="EXPENSE">Expense</TabsTrigger>
               <TabsTrigger value="INCOME">Income</TabsTrigger>
            </TabsList>
         </Tabs>

         <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
               <label className="text-sm font-medium">Amount</label>
               <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground">₹</span>
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
                     {categories.length > 0 ? (
                        categories.map((category) => (
                           <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                           </SelectItem>
                        ))
                     ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">No categories found for {type.toLowerCase()}.</div>
                     )}
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

            <div className="flex gap-4">
               <Button type="button" variant="destructive" className="flex-1 h-12 text-lg" onClick={handleDelete} disabled={deleting || saving}>
                  {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
               </Button>
               <Button type="submit" className={`flex-1 h-12 text-lg ${type === "INCOME" ? "bg-green-600 hover:bg-green-700" : ""}`} disabled={saving || deleting}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
               </Button>
            </div>
         </form>
      </>
   );
}
