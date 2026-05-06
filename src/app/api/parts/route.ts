import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/parts — 获取零件列表（搜索+分页）
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "1");
  const pageSize = parseInt(sp.get("pageSize") || "20");
  const search = sp.get("search") || "";
  const brand = sp.get("brand") || "";
  const sortBy = sp.get("sortBy") || "createdAt";
  const sortOrder = (sp.get("sortOrder") || "desc") as "asc" | "desc";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { partNumber: { contains: search } },
      { oeNumber: { contains: search } },
      { name: { contains: search } },
      { vehicleModel: { contains: search } },
      { vehicleBrand: { contains: search } },
    ];
  }

  if (brand) {
    where.vehicleBrand = { contains: brand };
  }

  const [data, total] = await Promise.all([
    prisma.part.findMany({
      where,
      include: { supplier: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.part.count({ where }),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// POST /api/parts — 创建新零件
export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const part = await prisma.part.create({
      data: {
        partNumber: body.partNumber,
        oeNumber: body.oeNumber || null,
        name: body.name,
        description: body.description || null,
        vehicleBrand: body.vehicleBrand || null,
        vehicleModel: body.vehicleModel || null,
        vehicleYearStart: body.vehicleYearStart || null,
        vehicleYearEnd: body.vehicleYearEnd || null,
        purchasePrice: body.purchasePrice || null,
        sellPrice: body.sellPrice || null,
        supplierId: body.supplierId || null,
        stockQuantity: body.stockQuantity || 0,
        stockWarning: body.stockWarning || 5,
        source: "manual",
      },
      include: { supplier: true },
    });

    return NextResponse.json({ success: true, data: part }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { code?: string };
    if (e.code === "P2002") {
      return NextResponse.json({ success: false, error: "型号已存在" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "创建失败" }, { status: 500 });
  }
}
