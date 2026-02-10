"use client";

import { deleteTransaction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, MoreVertical, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExpenseActions({ id }: { id: number }) {
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
