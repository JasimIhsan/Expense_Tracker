"use client";

import { getCategories } from "@/app/actions/categories";
import { deleteTransaction, getTransaction, updateTransaction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionType } from "@prisma/client";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditTransactionPage() {
   const router = useRouter();
   const params = useParams();
   const id = params?.id as string;
   const [type, setType] = useState<TransactionType>("EXPENSE");
   const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [deleting, setDeleting] = useState(false);
   const [formData, setFormData] = useState({
      amount: "",
      categoryId: "",
      date: "",
      note: "",
   });

   useEffect(() => {
      const fetchData = async () => {
         try {
            // Fetch transaction details
            const tResult = await getTransaction(parseInt(id));
            if (!tResult.success || !tResult.data) {
               alert("Transaction not found");
               router.push("/");
               return;
            }
            const transaction = tResult.data;

            setType(transaction.type);
            setFormData({
               amount: transaction.amount.toString(),
               categoryId: transaction.categoryId.toString(),
               date: new Date(transaction.date).toISOString().split("T")[0],
               note: transaction.note || "",
            });

            // Fetch categories for the transaction type
            const cResult = await getCategories(transaction.type);
            if (cResult.data) setCategories(cResult.data);
         } catch (error) {
            console.error(error);
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, [id, router]);

   // Update categories when type changes (if user switches type during edit)
   useEffect(() => {
      const fetchCategories = async () => {
         if (loading) return; // Skip initial load as it's handled above
         const { data } = await getCategories(type);
         if (data) setCategories(data);
         // Reset category if it doesn't exist in new list?
         // For now keep it simple, user will re-select.
      };
      fetchCategories();
   }, [type, loading]);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);

      try {
         const result = await updateTransaction(parseInt(id), {
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
         const result = await deleteTransaction(parseInt(id));
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

   if (loading) {
      return (
         <div className="flex h-screen items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
         </div>
      );
   }

   return (
      <div className="min-h-screen pb-20 pt-6">
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
               <Link href="/" className="mr-4 p-2 -ml-2 rounded-full hover:bg-muted">
                  <ArrowLeft className="w-6 h-6" />
               </Link>
               <h1 className="text-2xl font-bold">Edit</h1>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={deleting}>
               <Trash2 className="w-5 h-5" />
            </Button>
         </div>

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

            <Button type="submit" className={`w-full h-12 text-lg ${type === "INCOME" ? "bg-green-600 hover:bg-green-700" : ""}`} disabled={saving}>
               {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
         </form>
      </div>
   );
}
