"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCategories() {
   try {
      const categories = await prisma.category.findMany({
         orderBy: { name: "asc" },
      });
      return { success: true, data: categories };
   } catch (error) {
      console.error("Failed to get categories:", error);
      return { success: false, error: "Failed to get categories" };
   }
}

export async function addCategory(name: string) {
   try {
      // Check if category exists (case-insensitive)
      const existing = await prisma.category.findFirst({
         where: {
            name: {
               equals: name,
            },
         },
      });

      if (existing) {
         return { success: false, error: "Category already exists" };
      }

      const category = await prisma.category.create({
         data: { name },
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
      const usageCount = await prisma.expense.count({
         where: { categoryId: id },
      });

      if (usageCount > 0) {
         return { success: false, error: "Cannot delete category with associated expenses" };
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
