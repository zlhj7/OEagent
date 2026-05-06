import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id: parseInt(id) },
    include: { parts: true },
  });
  if (!supplier) {
    return NextResponse.json({ error: "供应商不存在" }, { status: 404 });
  }
  return NextResponse.json({ data: supplier });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supplier = await prisma.supplier.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name,
      contact: body.contact,
      phone: body.phone,
      email: body.email,
      address: body.address,
      notes: body.notes,
    },
  });
  return NextResponse.json({ success: true, data: supplier });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.supplier.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
