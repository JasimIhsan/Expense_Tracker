import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
   try {
      const type = request.nextUrl.searchParams.get("type") as TransactionType | undefined;
      const where = type ? { type } : {};
      const categories = await prisma.category.findMany({
         where,
         orderBy: { name: "asc" },
      });
      return NextResponse.json({ success: true, data: categories });
   } catch (error) {
      console.error("Failed to get categories:", error);
      return NextResponse.json({ success: false, error: "Failed to get categories" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   try {
      const body = await request.json();
      const { name, type } = body;

      const existing = await prisma.category.findFirst({
         where: {
            name: {
               equals: name,
               mode: "insensitive",
            },
            type,
         },
      });

      if (existing) {
         return NextResponse.json({ success: false, error: "Category already exists" }, { status: 400 });
      }

      const category = await prisma.category.create({
         data: { name, type },
      });
      return NextResponse.json({ success: true, data: category });
   } catch (error) {
      console.error("Failed to add category:", error);
      return NextResponse.json({ success: false, error: "Failed to add category" }, { status: 500 });
   }
}
