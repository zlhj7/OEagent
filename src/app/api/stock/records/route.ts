import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/stock/records — 出入库记录
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "1");
  const pageSize = parseInt(sp.get("pageSize") || "50");
  const partId = sp.get("partId") || "";
  const type = sp.get("type") || "";

  const where: Record<string, unknown> = {};
  if (partId) where.partId = parseInt(partId);
  if (type) where.type = type;

  const [data, total] = await Promise.all([
    prisma.stockRecord.findMany({
      where,
      include: { part: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.stockRecord.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}
