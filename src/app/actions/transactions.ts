"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, TransactionType } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";
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

export async function getTransactions({ page = 1, limit = 20, type, date }: { page?: number; limit?: number; type?: TransactionType; date?: "today" | "all" }) {
   try {
      const skip = (page - 1) * limit;
      const where: Prisma.TransactionWhereInput = type ? { type } : {};
      if (date === "today") {
         const now = new Date();
         where.date = {
            gte: startOfDay(now),
            lte: endOfDay(now),
         };
      }

      const [transactions, total] = await prisma.$transaction([
         prisma.transaction.findMany({
            skip,
            take: limit,
            where,
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
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

export async function getTransaction(id: number) {
   try {
      const transaction = await prisma.transaction.findUnique({
         where: { id },
         include: { category: true },
      });
      if (!transaction) return { success: false, error: "Transaction not found" };
      return { success: true, data: transaction };
   } catch (error) {
      console.error("Failed to get transaction:", error);
      return { success: false, error: "Failed to get transaction" };
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
