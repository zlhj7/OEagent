import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/stock — 库存总览
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const warningOnly = sp.get("warningOnly") === "true";

  const where: Record<string, unknown> = {};
  if (warningOnly) {
    // 库存 <= 预警值
    // Prisma doesn't support field-to-field comparison directly, filter in-memory
  }

  const parts = await prisma.part.findMany({
    where,
    include: { supplier: true },
    orderBy: { stockQuantity: "asc" },
  });

  const data = warningOnly
    ? parts.filter((p: typeof parts[0]) => p.stockQuantity <= p.stockWarning)
    : parts;

  return NextResponse.json({ data });
}

// POST /api/stock — 入库/出库
export async function POST(request: NextRequest) {
  const body = await request.json();

  const result = await prisma.$transaction(async (tx: typeof prisma) => {
    // 创建出入库记录
    const record = await tx.stockRecord.create({
      data: {
        partId: body.partId,
        type: body.type, // "IN" or "OUT"
        quantity: body.quantity,
        reason: body.reason || null,
        operator: body.operator || null,
      },
    });

    // 更新零件库存
    const part = await tx.part.update({
      where: { id: body.partId },
      data: {
        stockQuantity: {
          [body.type === "IN" ? "increment" : "decrement"]: body.quantity,
        },
      },
    });

    return { record, part };
  });

  return NextResponse.json({ success: true, data: result }, { status: 201 });
}
