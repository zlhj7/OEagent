"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, MessageSquare, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface StatsData {
  summary: { totalParts: number; totalOrders: number; totalComplaints: number; openComplaints: number };
  topParts: { id: number; part_number: string; name: string; total_sold: number }[];
  complaintsByStatus: { status: string; count: number }[];
  lowStockParts: { id: number; partNumber: string; name: string; stockQuantity: number; stockWarning: number }[];
  monthlyOrders: { month: string; count: number }[];
}

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#6b7280"];

const statusLabels: Record<string, string> = {
  OPEN: "待处理",
  PROCESSING: "处理中",
  RESOLVED: "已解决",
  CLOSED: "已关闭",
};

export function StatsDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      });
  }, []);

  if (loading || !stats) return <div className="text-center p-8 text-muted-foreground">加载中...</div>;

  const pieData = stats.complaintsByStatus.map((item) => ({
    name: statusLabels[item.status] || item.status,
    value: Number(item.count),
  }));

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总零件数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalParts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总订单数</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总投诉数</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalComplaints}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">待处理投诉</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.summary.openComplaints}</div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 热销零件 */}
        <Card>
          <CardHeader><CardTitle className="text-base">热销零件 TOP10</CardTitle></CardHeader>
          <CardContent>
            {stats.topParts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无销售数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topParts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total_sold" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 投诉状态分布 */}
        <Card>
          <CardHeader><CardTitle className="text-base">投诉状态分布</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无投诉数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} label dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 低库存预警 */}
      <Card>
        <CardHeader><CardTitle className="text-base">库存预警</CardTitle></CardHeader>
        <CardContent>
          {stats.lowStockParts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">所有零件库存充足</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stats.lowStockParts.map((p) => (
                <Badge key={p.id} variant="destructive" className="text-xs">
                  {p.partNumber} ({p.stockQuantity}/{p.stockWarning})
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
