"use server";

import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getCategories(type?: TransactionType) {
   try {
      const where = type ? { type } : {};
      const categories = await prisma.category.findMany({
         where,
         orderBy: { name: "asc" },
      });
      return { success: true, data: categories };
   } catch (error) {
      console.error("Failed to get categories:", error);
      return { success: false, error: "Failed to get categories" };
   }
}

export async function addCategory(name: string, type: TransactionType = "EXPENSE") {
   try {
      // Check if category exists with same name AND type
      const existing = await prisma.category.findFirst({
         where: {
            name: {
               equals: name,
               mode: "insensitive", // proper case insensitive check
            },
            type,
         },
      });

      if (existing) {
         return { success: false, error: "Category already exists" };
      }

      const category = await prisma.category.create({
         data: { name, type },
      });
      revalidatePath("/categories");
      return { success: true, data: category };
   } catch (error) {
      console.error("Failed to add category:", error);
      return { success: false, error: "Failed to add category" };
   }
}

export async function deleteCategory(id: number) {
   try {
      // Check if category is used
      const usageCount = await prisma.transaction.count({
         where: { categoryId: id },
      });

      if (usageCount > 0) {
         return { success: false, error: "Cannot delete category with associated transactions" };
      }

      await prisma.category.delete({ where: { id } });
      revalidatePath("/categories");
      return { success: true };
   } catch (error) {
      console.error("Failed to delete category:", error);
      return { success: false, error: "Failed to delete category" };
   }
}

export async function updateCategory(id: number, name: string) {
   try {
      const category = await prisma.category.update({
         where: { id },
         data: { name },
      });
      revalidatePath("/categories");
      return { success: true, data: category };
   } catch (error) {
      console.error("Failed to update category:", error);
      return { success: false, error: "Failed to update category" };
   }
}
