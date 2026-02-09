"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ExpenseData = {
   amount: number;
   categoryId: number;
   date: Date;
   note?: string;
};

export async function addExpense(data: ExpenseData) {
   try {
      const expense = await prisma.expense.create({
         data: {
            amount: data.amount,
            categoryId: data.categoryId,
            date: data.date,
            note: data.note,
         },
      });
      revalidatePath("/");
      return { success: true, data: expense };
   } catch (error) {
      console.error("Failed to add expense:", error);
      return { success: false, error: "Failed to add expense" };
   }
}

export async function getExpenses({ page = 1, limit = 20 }: { page?: number; limit?: number }) {
   try {
      const skip = (page - 1) * limit;
      const [expenses, total] = await prisma.$transaction([
         prisma.expense.findMany({
            skip,
            take: limit,
            orderBy: { date: "desc" },
            include: { category: true },
         }),
         prisma.expense.count(),
      ]);
      return { success: true, data: expenses, total, page, totalPages: Math.ceil(total / limit) };
   } catch (error) {
      console.error("Failed to get expenses:", error);
      return { success: false, error: "Failed to get expenses" };
   }
}

export async function deleteExpense(id: number) {
   try {
      await prisma.expense.delete({ where: { id } });
      revalidatePath("/");
      return { success: true };
   } catch (error) {
      console.error("Failed to delete expense:", error);
      return { success: false, error: "Failed to delete expense" };
   }
}

export async function updateExpense(id: number, data: ExpenseData) {
   try {
      const expense = await prisma.expense.update({
         where: { id },
         data: {
            amount: data.amount,
            categoryId: data.categoryId,
            date: data.date,
            note: data.note,
         },
      });
      revalidatePath("/");
      return { success: true, data: expense };
   } catch (error) {
      console.error("Failed to update expense:", error);
      return { success: false, error: "Failed to update expense" };
   }
}
