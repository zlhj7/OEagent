import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/suppliers — 获取所有供应商
export async function GET() {
  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { parts: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: suppliers });
}

// POST /api/suppliers — 创建供应商
export async function POST(request: NextRequest) {
  const body = await request.json();
  const supplier = await prisma.supplier.create({
    data: {
      name: body.name,
      contact: body.contact || null,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json({ success: true, data: supplier }, { status: 201 });
}
