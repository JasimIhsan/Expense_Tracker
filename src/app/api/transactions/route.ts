import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
   try {
      const searchParams = request.nextUrl.searchParams;
      const page = Number(searchParams.get("page")) || 1;
      const limit = Number(searchParams.get("limit")) || 20;
      const type = searchParams.get("type") as TransactionType | undefined;
      const date = searchParams.get("date");

      const skip = (page - 1) * limit;
      const where: any = type ? { type } : {};

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

      return NextResponse.json({
         success: true,
         data: transactions,
         total,
         page,
         totalPages: Math.ceil(total / limit),
      });
   } catch (error) {
      console.error("Failed to get transactions:", error);
      return NextResponse.json({ success: false, error: "Failed to get transactions" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   try {
      const body = await request.json();
      const transaction = await prisma.transaction.create({
         data: {
            amount: body.amount,
            categoryId: body.categoryId,
            date: body.date,
            note: body.note,
            type: body.type,
         },
      });
      return NextResponse.json({ success: true, data: transaction });
   } catch (error) {
      console.error("Failed to add transaction:", error);
      return NextResponse.json({ success: false, error: "Failed to add transaction" }, { status: 500 });
   }
}
