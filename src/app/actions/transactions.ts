"use server";

import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type TransactionData = {
   amount: number;
   categoryId: number;
   date: Date;
   note?: string;
   type: TransactionType;
};

export async function addTransaction(data: TransactionData) {
   try {
      const transaction = await prisma.transaction.create({
         data: {
            amount: data.amount,
            categoryId: data.categoryId,
            date: data.date,
            note: data.note,
            type: data.type,
         },
      });
      revalidatePath("/");
      return { success: true, data: transaction };
   } catch (error) {
      console.error("Failed to add transaction:", error);
      return { success: false, error: "Failed to add transaction" };
   }
}

export async function getTransactions({ page = 1, limit = 20, type }: { page?: number; limit?: number; type?: TransactionType }) {
   try {
      const skip = (page - 1) * limit;
      const where = type ? { type } : {};

      const [transactions, total] = await prisma.$transaction([
         prisma.transaction.findMany({
            skip,
            take: limit,
            where,
            orderBy: { date: "desc" },
            include: { category: true },
         }),
         prisma.transaction.count({ where }),
      ]);
      return { success: true, data: transactions, total, page, totalPages: Math.ceil(total / limit) };
   } catch (error) {
      console.error("Failed to get transactions:", error);
      return { success: false, error: "Failed to get transactions" };
   }
}

export async function deleteTransaction(id: number) {
   try {
      await prisma.transaction.delete({ where: { id } });
      revalidatePath("/");
      return { success: true };
   } catch (error) {
      console.error("Failed to delete transaction:", error);
      return { success: false, error: "Failed to delete transaction" };
   }
}

export async function updateTransaction(id: number, data: TransactionData) {
   try {
      const transaction = await prisma.transaction.update({
         where: { id },
         data: {
            amount: data.amount,
            categoryId: data.categoryId,
            date: data.date,
            note: data.note,
            type: data.type,
         },
      });
      revalidatePath("/");
      return { success: true, data: transaction };
   } catch (error) {
      console.error("Failed to update transaction:", error);
      return { success: false, error: "Failed to update transaction" };
   }
}
