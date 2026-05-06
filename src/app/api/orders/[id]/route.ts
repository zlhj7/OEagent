import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id: parseInt(id) },
    include: { items: { include: { part: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }
  return NextResponse.json({ data: order });
}

// PUT — 更新订单状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const order = await prisma.order.update({
    where: { id: parseInt(id) },
    data: { status: body.status, notes: body.notes },
    include: { items: { include: { part: true } } },
  });

  return NextResponse.json({ success: true, data: order });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id: parseInt(id) } });
  if (order?.status !== "CANCELLED") {
    return NextResponse.json({ error: "只能删除已取消的订单" }, { status: 400 });
  }
  await prisma.order.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
