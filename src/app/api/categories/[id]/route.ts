import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   try {
      const { id } = await params;
      const body = await request.json();
      const category = await prisma.category.update({
         where: { id: Number(id) },
         data: { name: body.name },
      });
      return NextResponse.json({ success: true, data: category });
   } catch (error) {
      console.error("Failed to update category:", error);
      return NextResponse.json({ success: false, error: "Failed to update category" }, { status: 500 });
   }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   try {
      const { id } = await params;
      const usageCount = await prisma.transaction.count({
         where: { categoryId: Number(id) },
      });

      if (usageCount > 0) {
         return NextResponse.json({ success: false, error: "Cannot delete category with associated transactions" }, { status: 400 });
      }

      await prisma.category.delete({ where: { id: Number(id) } });
      return NextResponse.json({ success: true });
   } catch (error) {
      console.error("Failed to delete category:", error);
      return NextResponse.json({ success: false, error: "Failed to delete category" }, { status: 500 });
   }
}
