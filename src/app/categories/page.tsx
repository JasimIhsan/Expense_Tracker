"use client";

import { addCategory, deleteCategory, getCategories, updateCategory } from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionType } from "@prisma/client";
import { ArrowLeft, Check, Edit2, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function CategoriesPage() {
   const [type, setType] = useState<TransactionType>("EXPENSE");
   const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
   const [newCategory, setNewCategory] = useState("");
   const [editingId, setEditingId] = useState<number | null>(null);
   const [editName, setEditName] = useState("");
   const [loading, setLoading] = useState(false);

   const fetchCategories = useCallback(async () => {
      const { data } = await getCategories(type);
      if (data) setCategories(data);
   }, [type]);

   useEffect(() => {
      fetchCategories();
   }, [fetchCategories]);

   const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCategory.trim()) return;

      setLoading(true);
      try {
         const result = await addCategory(newCategory.trim(), type);
         if (result.success) {
            setNewCategory("");
            fetchCategories();
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
            fetchCategories();
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
            fetchCategories();
         } else {
            alert(result.error);
         }
      } catch (error) {
         console.error(error);
         alert("Failed to update category");
      }
   };

   return (
      <div className="min-h-screen pb-20 pt-6">
         <div className="flex items-center mb-6">
            <Link href="/" className="mr-4 p-2 -ml-2 rounded-full hover:bg-muted">
               <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold">Categories</h1>
         </div>

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
      </div>
   );
}
