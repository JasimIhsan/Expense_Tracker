"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import api from "@/lib/axios";
import { Edit, MoreVertical, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExpenseActions({ id, onDelete }: { id: number; onDelete?: (id: number) => void }) {
   const [loading, setLoading] = useState(false);
   const router = useRouter();

   const handleDelete = async () => {
      if (!confirm("Are you sure you want to delete this transaction?")) return;

      setLoading(true);
      try {
         await api.delete(`/transactions/${id}`);
         if (onDelete) {
            onDelete(id);
         } else {
            router.refresh();
            // Or better: trigger a global refresh or rely on parent re-rendering if passed down
            // Since we moved to client fetching, router.refresh() might not reload the data if useEffect dependency array doesn't encompass it.
            // But usually window.location.reload() is too heavy.
            // For now, let's assume the parent handles state updates or we just reload.
            window.location.reload();
         }
      } catch (error) {
         console.error(error);
         alert("Failed to delete transaction");
      } finally {
         setLoading(false);
      }
   };

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
               <span className="sr-only">Open menu</span>
               <MoreVertical className="h-4 w-4" />
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
               <Link href={`/expenses/${id}/edit`} className="cursor-pointer flex w-full items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
               </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer flex w-full items-center" onClick={handleDelete} disabled={loading}>
               <Trash2 className="mr-2 h-4 w-4" />
               Delete
            </DropdownMenuItem>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
