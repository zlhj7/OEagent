import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonResponse } from "@/lib/utils";

// GET /api/parts/:id/revisions — 获取零件的所有版本记录
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const revisions = await prisma.partRevision.findMany({
    where: { partId: parseInt(id) },
    orderBy: { createdAt: "desc" },
  });
  return jsonResponse(revisions);
}

// POST /api/parts/:id/revisions — 添加版本记录
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const revision = await prisma.partRevision.create({
    data: {
      partId: parseInt(id),
      version: body.version,
      changeType: body.changeType,
      oldPartNumber: body.oldPartNumber || null,
      newPartNumber: body.newPartNumber || null,
      changeDescription: body.changeDescription || null,
      yearStart: body.yearStart || null,
      yearEnd: body.yearEnd || null,
      interchangeable: body.interchangeable || false,
      compatibilityNote: body.compatibilityNote || null,
    },
  });

  return jsonResponse({ success: true, data: revision }, 201);
}
