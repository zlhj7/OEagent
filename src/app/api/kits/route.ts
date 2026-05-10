import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 查询套装列表（分页）— 支持用配件号搜索套装
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const where: Record<string, unknown> = {};
    if (query) {
      where.OR = [
        // 按套装本身的字段搜索
        { kitNumber: { contains: query } },
        { oeNumber: { contains: query } },
        { name: { contains: query } },
        { vehicleBrand: { contains: query } },
        { vehicleModel: { contains: query } },
        // 按套装内配件的型号或 OE 号搜索
        {
          items: {
            some: {
              part: {
                OR: [
                  { partNumber: { contains: query } },
                  { oeNumber: { contains: query } },
                ],
              },
            },
          },
        },
      ];
    }

    const [kits, total] = await Promise.all([
      prisma.kit.findMany({
        where,
        include: {
          supplier: true,
          items: {
            include: { part: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.kit.count({ where }),
    ]);

    return NextResponse.json({
      data: kits,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
