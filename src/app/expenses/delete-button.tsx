"use client";

import { deleteTransaction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteExpenseButton({ id }: { id: number }) {
   const [loading, setLoading] = useState(false);
   const router = useRouter();

   const handleDelete = async () => {
      if (!confirm("Are you sure you want to delete this transaction?")) return;

      setLoading(true);
      try {
         await deleteTransaction(id);
         router.refresh();
      } catch (error) {
         console.error(error);
         alert("Failed to delete transaction");
      } finally {
         setLoading(false);
      }
   };

   return (
      <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleDelete} disabled={loading}>
         {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </Button>
   );
}
