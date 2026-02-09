"use server";

import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";

export async function getFinancialSummary(year: number, month: number) {
   try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1); // First day of next month

      const transactions = await prisma.transaction.findMany({
         where: {
            date: {
               gte: startDate,
               lt: endDate,
            },
         },
      });

      let income = 0;
      let expense = 0;

      transactions.forEach((t) => {
         const amount = Number(t.amount);
         if (t.type === "INCOME") {
            income += amount;
         } else {
            expense += amount;
         }
      });

      return {
         success: true,
         data: {
            income,
            expense,
            balance: income - expense,
         },
      };
   } catch (error) {
      console.error("Failed to get financial summary:", error);
      return { success: false, error: "Failed to get financial summary" };
   }
}

export async function getAvgDailyExpense(year: number, month: number) {
   try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      // Total expense for the month
      const { _sum } = await prisma.transaction.aggregate({
         _sum: { amount: true },
         where: {
            date: { gte: startDate, lt: endDate },
            type: "EXPENSE",
         },
      });

      const totalExpense = _sum.amount?.toNumber() || 0;

      // Days passed in month (or total days if past month)
      const now = new Date();
      let daysParam = 1;

      if (year === now.getFullYear() && month === now.getMonth() + 1) {
         daysParam = now.getDate(); // Current month: days passed so far
      } else {
         daysParam = new Date(year, month, 0).getDate(); // Past month: total days in month
      }

      // Avoid division by zero
      daysParam = Math.max(1, daysParam);

      return { success: true, data: totalExpense / daysParam };
   } catch (error) {
      console.error("Failed to get avg daily expense:", error);
      return { success: false, error: "Failed to get avg daily expense" };
   }
}

export async function getCategoryBreakdown(year: number, month: number, type: TransactionType = "EXPENSE") {
   try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const transactions = await prisma.transaction.findMany({
         where: {
            date: {
               gte: startDate,
               lt: endDate,
            },
            type,
         },
         include: {
            category: true,
         },
      });

      const breakdown = transactions.reduce(
         (acc, t) => {
            const categoryName = t.category.name;
            if (!acc[categoryName]) {
               acc[categoryName] = 0;
            }
            acc[categoryName] += Number(t.amount);
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

// Deprecated or can be kept as alias
export async function getMonthlyTotal(year: number, month: number) {
   return getFinancialSummary(year, month);
}

export async function getYearlySummary(year: number) {
   try {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);

      const transactions = await prisma.transaction.findMany({
         where: {
            date: {
               gte: startDate,
               lt: endDate,
            },
         },
      });

      let income = 0;
      let expense = 0;

      transactions.forEach((t) => {
         const amount = Number(t.amount);
         if (t.type === "INCOME") {
            income += amount;
         } else {
            expense += amount;
         }
      });

      return {
         success: true,
         data: {
            income,
            expense,
            balance: income - expense,
         },
      };
   } catch (error) {
      console.error("Failed to get yearly summary:", error);
      return { success: false, error: "Failed to get yearly summary" };
   }
}

// Kept for compatibility if needed, but better to use getYearlySummary
export async function getYearlyTotal(year: number) {
   const res = await getYearlySummary(year);
   if (res.success && res.data) return { success: true, data: res.data.expense };
   return { success: false, error: "Failed" };
}
