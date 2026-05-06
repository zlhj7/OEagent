import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/parts/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const part = await prisma.part.findUnique({
    where: { id: parseInt(id) },
    include: {
      supplier: true,
      stockRecords: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!part) {
    return NextResponse.json({ error: "零件不存在" }, { status: 404 });
  }
  return NextResponse.json({ data: part });
}

// PUT /api/parts/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const part = await prisma.part.update({
      where: { id: parseInt(id) },
      data: {
        partNumber: body.partNumber,
        oeNumber: body.oeNumber,
        name: body.name,
        description: body.description,
        vehicleBrand: body.vehicleBrand,
        vehicleModel: body.vehicleModel,
        vehicleYearStart: body.vehicleYearStart,
        vehicleYearEnd: body.vehicleYearEnd,
        purchasePrice: body.purchasePrice,
        sellPrice: body.sellPrice,
        supplierId: body.supplierId,
        stockWarning: body.stockWarning,
      },
      include: { supplier: true },
    });
    return NextResponse.json({ success: true, data: part });
  } catch {
    return NextResponse.json({ success: false, error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/parts/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.part.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "删除失败" }, { status: 500 });
  }
}
