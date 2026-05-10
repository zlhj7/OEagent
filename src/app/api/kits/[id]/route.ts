import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const kit = await prisma.kit.findUnique({
      where: { id: parseInt(id) },
      include: {
        supplier: true,
        items: {
          include: { part: true },
        },
      },
    });

    if (!kit) {
      return NextResponse.json({ error: "套装不存在" }, { status: 404 });
    }

    return NextResponse.json(kit);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
