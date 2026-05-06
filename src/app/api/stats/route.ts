import { prisma } from "@/lib/db";
import { jsonResponse } from "@/lib/utils";

export async function GET() {
  const [
    totalParts,
    totalOrders,
    totalComplaints,
    openComplaints,
    topParts,
    complaintsByStatus,
    lowStockParts,
  ] = await Promise.all([
    prisma.part.count(),
    prisma.order.count(),
    prisma.complaint.count(),
    prisma.complaint.count({ where: { status: "OPEN" } }),
    prisma.$queryRaw`
      SELECT p.id, p.part_number as partNumber, p.name, CAST(SUM(oi.quantity) AS INTEGER) as totalSold
      FROM order_items oi
      JOIN parts p ON p.id = oi.part_id
      GROUP BY p.id, p.part_number, p.name
      ORDER BY totalSold DESC
      LIMIT 10
    `,
    prisma.$queryRaw`
      SELECT status, CAST(COUNT(*) AS INTEGER) as count
      FROM complaints
      GROUP BY status
    `,
    prisma.part.findMany({
      where: { stockQuantity: { lte: 5 } },
      select: { id: true, partNumber: true, name: true, stockQuantity: true, stockWarning: true },
      take: 10,
    }),
  ]);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyOrders = await prisma.$queryRaw`
    SELECT strftime('%Y-%m', created_at) as month, CAST(COUNT(*) AS INTEGER) as count
    FROM orders
    WHERE created_at >= ${sixMonthsAgo.toISOString()}
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month ASC
  `;

  return jsonResponse({
    summary: { totalParts, totalOrders, totalComplaints, openComplaints },
    topParts,
    complaintsByStatus,
    lowStockParts,
    monthlyOrders,
  });
}
