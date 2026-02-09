"use server";

import { prisma } from "@/lib/prisma";

export async function getMonthlyTotal(year: number, month: number) {
   try {
      const startDate = new Date(year, month - 1, 1); // Month is 0-indexed in JS Date, but UI sends 1-indexed
      const endDate = new Date(year, month, 1);

      const result = await prisma.expense.aggregate({
         _sum: {
            amount: true,
         },
         where: {
            date: {
               gte: startDate,
               lt: endDate,
            },
         },
      });

      return { success: true, data: result._sum.amount?.toNumber() || 0 };
   } catch (error) {
      console.error("Failed to get monthly total:", error);
      return { success: false, error: "Failed to get monthly total" };
   }
}

export async function getCategoryBreakdown(year: number, month: number) {
   try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const expenses = await prisma.expense.findMany({
         where: {
            date: {
               gte: startDate,
               lt: endDate,
            },
         },
         include: {
            category: true,
         },
      });

      const breakdown = expenses.reduce(
         (acc, expense) => {
            const categoryName = expense.category.name;
            if (!acc[categoryName]) {
               acc[categoryName] = 0;
            }
            acc[categoryName] += Number(expense.amount);
            return acc;
         },
         {} as Record<string, number>
      );

      return { success: true, data: breakdown };
   } catch (error) {
      console.error("Failed to get category breakdown:", error);
      return { success: false, error: "Failed to get category breakdown" };
   }
}

export async function getYearlyTotal(year: number) {
   try {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);

      const result = await prisma.expense.aggregate({
         _sum: {
            amount: true,
         },
         where: {
            date: {
               gte: startDate,
               lt: endDate,
            },
         },
      });

      return { success: true, data: result._sum.amount?.toNumber() || 0 };
   } catch (error) {
      console.error("Failed to get yearly total:", error);
      return { success: false, error: "Failed to get yearly total" };
   }
}
