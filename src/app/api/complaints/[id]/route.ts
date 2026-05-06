import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const complaint = await prisma.complaint.findUnique({
    where: { id: parseInt(id) },
    include: { order: true, part: true },
  });
  if (!complaint) {
    return NextResponse.json({ error: "投诉不存在" }, { status: 404 });
  }
  return NextResponse.json({ data: complaint });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.status) updateData.status = body.status;
  if (body.resolution !== undefined) updateData.resolution = body.resolution;
  if (body.satisfaction !== undefined) updateData.satisfaction = body.satisfaction;
  if (body.status === "RESOLVED" || body.status === "CLOSED") {
    updateData.resolvedAt = new Date();
  }

  const complaint = await prisma.complaint.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: { order: true, part: true },
  });

  return NextResponse.json({ success: true, data: complaint });
}
