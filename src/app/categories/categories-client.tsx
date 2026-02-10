"use client";

import { addCategory, deleteCategory, updateCategory } from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionType } from "@prisma/client";
import { Check, Edit2, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = {
   id: number;
   name: string;
};

export function CategoriesClient({ initialExpenseCategories, initialIncomeCategories }: { initialExpenseCategories: Category[]; initialIncomeCategories: Category[] }) {
   const router = useRouter();
   const [type, setType] = useState<TransactionType>("EXPENSE");
   const [newCategory, setNewCategory] = useState("");
   const [editingId, setEditingId] = useState<number | null>(null);
   const [editName, setEditName] = useState("");
   const [loading, setLoading] = useState(false);

   // We can rely on router.refresh() to update props, but for instant feedback
   // we might want optimistic updates. However, since the parent is a server component,
   // updating the list requires a refresh. To make it smooth, we can use local state
   // synced with props, similar to transactions list.
   // Or simpler: just use router.refresh() and let the UI update. Categories don't change often.
   // But to avoid "flash", we can use local state initialized from props.

   // Given the data is passed as separate props, let's derive the current list.
   // But wait, if we add a category, we need to know which list to update.
   // Actually, passing them as props means we rely on the server data.
   // Let's rely on router.refresh() for simplicity and correctness first.

   const categories = type === "EXPENSE" ? initialExpenseCategories : initialIncomeCategories;

   const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCategory.trim()) return;

      setLoading(true);
      try {
         const result = await addCategory(newCategory.trim(), type);
         if (result.success) {
            setNewCategory("");
            router.refresh();
         } else {
            alert(result.error);
         }
      } catch (error) {
         console.error(error);
         alert("Failed to add category");
      } finally {
         setLoading(false);
      }
   };

   const handleDelete = async (id: number) => {
      if (!confirm("Are you sure you want to delete this category?")) return;

      try {
         const result = await deleteCategory(id);
         if (result.success) {
            router.refresh();
         } else {
            alert(result.error);
         }
      } catch (error) {
         console.error(error);
         alert("Failed to delete category");
      }
   };

   const startEdit = (category: { id: number; name: string }) => {
      setEditingId(category.id);
      setEditName(category.name);
   };

   const cancelEdit = () => {
      setEditingId(null);
      setEditName("");
   };

   const handleUpdate = async () => {
      if (!editingId || !editName.trim()) return;

      try {
         const result = await updateCategory(editingId, editName.trim());
         if (result.success) {
            setEditingId(null);
            router.refresh();
         } else {
            alert(result.error);
         }
      } catch (error) {
         console.error(error);
         alert("Failed to update category");
      }
   };

   return (
      <>
         <Tabs defaultValue="EXPENSE" onValueChange={(v) => setType(v as TransactionType)} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="EXPENSE">Expense</TabsTrigger>
               <TabsTrigger value="INCOME">Income</TabsTrigger>
            </TabsList>
         </Tabs>

         <form onSubmit={handleAdd} className="flex gap-2 mb-8">
            <Input placeholder={`New ${type.toLowerCase()} category`} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1" />
            <Button type="submit" disabled={loading || !newCategory.trim()}>
               <Plus className="w-4 h-4 mr-2" />
               Add
            </Button>
         </form>

         <div className="space-y-2">
            {categories.length > 0 ? (
               categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                     {editingId === category.id ? (
                        <div className="flex flex-1 items-center gap-2">
                           <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" autoFocus />
                           <Button size="icon" variant="ghost" onClick={handleUpdate} className="h-8 w-8 text-green-500">
                              <Check className="h-4 w-4" />
                           </Button>
                           <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8 text-destructive">
                              <X className="h-4 w-4" />
                           </Button>
                        </div>
                     ) : (
                        <>
                           <span className="font-medium">{category.name}</span>
                           <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={() => startEdit(category)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                 <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(category.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                 <Trash2 className="h-4 w-4" />
                              </Button>
                           </div>
                        </>
                     )}
                  </div>
               ))
            ) : (
               <div className="text-center py-10 text-muted-foreground">No {type.toLowerCase()} categories found.</div>
            )}
         </div>
      </>
   );
}
