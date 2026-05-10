import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonResponse } from "@/lib/utils";

// GET /api/kits/:id/revisions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const revisions = await prisma.kitRevision.findMany({
    where: { kitId: parseInt(id) },
    orderBy: { createdAt: "desc" },
  });
  return jsonResponse(revisions);
}

// POST /api/kits/:id/revisions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const revision = await prisma.kitRevision.create({
    data: {
      kitId: parseInt(id),
      version: body.version,
      changeType: body.changeType,
      oldKitNumber: body.oldKitNumber || null,
      newKitNumber: body.newKitNumber || null,
      oldOeNumber: body.oldOeNumber || null,
      newOeNumber: body.newOeNumber || null,
      changeDescription: body.changeDescription || null,
      yearStart: body.yearStart || null,
      yearEnd: body.yearEnd || null,
      interchangeable: body.interchangeable || false,
      compatibilityNote: body.compatibilityNote || null,
    },
  });
  return jsonResponse({ success: true, data: revision }, 201);
}
