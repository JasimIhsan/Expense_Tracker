import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   try {
      const { id } = await params;
      const transaction = await prisma.transaction.findUnique({
         where: { id: Number(id) },
         include: { category: true },
      });

      if (!transaction) {
         return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: transaction });
   } catch (error) {
      console.error("Failed to get transaction:", error);
      return NextResponse.json({ success: false, error: "Failed to get transaction" }, { status: 500 });
   }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   try {
      const { id } = await params;
      const body = await request.json();
      const transaction = await prisma.transaction.update({
         where: { id: Number(id) },
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
      console.error("Failed to update transaction:", error);
      return NextResponse.json({ success: false, error: "Failed to update transaction" }, { status: 500 });
   }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   try {
      const { id } = await params;
      await prisma.transaction.delete({ where: { id: Number(id) } });
      return NextResponse.json({ success: true });
   } catch (error) {
      console.error("Failed to delete transaction:", error);
      return NextResponse.json({ success: false, error: "Failed to delete transaction" }, { status: 500 });
   }
}
