import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 查询套装列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    const where: Record<string, unknown> = {};
    if (query) {
      where.OR = [
        { kitNumber: { contains: query } },
        { oeNumber: { contains: query } },
        { name: { contains: query } },
        { vehicleBrand: { contains: query } },
        { vehicleModel: { contains: query } },
      ];
    }

    const kits = await prisma.kit.findMany({
      where,
      include: {
        supplier: true,
        items: {
          include: { part: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ count: kits.length, kits });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
