import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/complaints — 投诉列表
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "1");
  const pageSize = parseInt(sp.get("pageSize") || "20");
  const status = sp.get("status") || "";
  const priority = sp.get("priority") || "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const [data, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      include: { order: true, part: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.complaint.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

// POST /api/complaints — 创建投诉
export async function POST(request: NextRequest) {
  const body = await request.json();

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.complaint.count();
  const complaintNo = `CMP-${dateStr}-${String(count + 1).padStart(4, "0")}`;

  const complaint = await prisma.complaint.create({
    data: {
      complaintNo,
      customerName: body.customerName,
      orderId: body.orderId || null,
      partId: body.partId || null,
      content: body.content,
      priority: body.priority || "MEDIUM",
    },
    include: { order: true, part: true },
  });

  return NextResponse.json({ success: true, data: complaint }, { status: 201 });
}
