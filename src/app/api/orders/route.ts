import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/orders — 订单列表
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "1");
  const pageSize = parseInt(sp.get("pageSize") || "20");
  const status = sp.get("status") || "";

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  }

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: { include: { part: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

// POST /api/orders — 创建订单
export async function POST(request: NextRequest) {
  const body = await request.json();

  // 生成订单号: ORD-YYYYMMDD-XXXX
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.order.count();
  const orderNo = `ORD-${dateStr}-${String(count + 1).padStart(4, "0")}`;

  // 计算总额
  const totalAmount = body.items.reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0
  );

  const order = await prisma.$transaction(async (tx: typeof prisma) => {
    const newOrder = await tx.order.create({
      data: {
        orderNo,
        customerName: body.customerName,
        customerContact: body.customerContact || null,
        status: "PENDING",
        totalAmount,
        notes: body.notes || null,
        items: {
          create: body.items.map((item: { partId: number; quantity: number; unitPrice: number }) => ({
            partId: item.partId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: { items: { include: { part: true } } },
    });

    // 扣减库存
    for (const item of body.items) {
      await tx.part.update({
        where: { id: item.partId },
        data: { stockQuantity: { decrement: item.quantity } },
      });
    }

    return newOrder;
  });

  return NextResponse.json({ success: true, data: order }, { status: 201 });
}
