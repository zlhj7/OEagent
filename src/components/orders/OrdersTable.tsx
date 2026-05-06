"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Eye, Truck, CheckCircle, XCircle, Trash2, Search } from "lucide-react";
import type { OrderWithItems, PaginatedResponse } from "@/types";

interface Part {
  id: number;
  partNumber: string;
  name: string;
  sellPrice: string | null;
  stockQuantity: number;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "success" | "destructive" | "warning" | "info" | "outline" }> = {
  PENDING: { label: "待发货", variant: "warning" },
  SHIPPED: { label: "已发货", variant: "info" },
  COMPLETED: { label: "已完成", variant: "success" },
  CANCELLED: { label: "已取消", variant: "destructive" },
};

export function OrdersTable() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  // 创建订单表单
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<{ partId: number; quantity: number; unitPrice: number; partName: string }[]>([]);
  const [partSearch, setPartSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/orders?page=${page}&status=${statusFilter}`);
    const data: PaginatedResponse<OrderWithItems> = await res.json();
    setOrders(data.data);
    setTotalPages(data.totalPages);
    setTotal(data.total);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const searchParts = async () => {
    if (!partSearch) return;
    const res = await fetch(`/api/parts?search=${encodeURIComponent(partSearch)}&pageSize=20`);
    const data = await res.json();
    setParts(data.data);
  };

  const addItem = (part: Part) => {
    if (orderItems.find((i) => i.partId === part.id)) return;
    setOrderItems([...orderItems, {
      partId: part.id,
      quantity: 1,
      unitPrice: Number(part.sellPrice || 0),
      partName: `${part.partNumber} - ${part.name}`,
    }]);
  };

  const removeItem = (partId: number) => {
    setOrderItems(orderItems.filter((i) => i.partId !== partId));
  };

  const totalAmount = orderItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const handleCreate = async () => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName, customerContact, notes, items: orderItems }),
    });
    if (res.ok) {
      setCreateOpen(false);
      setCustomerName("");
      setCustomerContact("");
      setNotes("");
      setOrderItems([]);
      fetchOrders();
    }
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
    setDetailOpen(false);
  };

  const showDetail = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Tabs value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="PENDING">待发货</TabsTrigger>
            <TabsTrigger value="SHIPPED">已发货</TabsTrigger>
            <TabsTrigger value="COMPLETED">已完成</TabsTrigger>
            <TabsTrigger value="CANCELLED">已取消</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> 创建订单
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">订单号</th>
              <th className="text-left p-3 font-medium">客户</th>
              <th className="text-left p-3 font-medium">联系方式</th>
              <th className="text-right p-3 font-medium">总额</th>
              <th className="text-center p-3 font-medium">状态</th>
              <th className="text-left p-3 font-medium">创建时间</th>
              <th className="text-center p-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">加载中...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">暂无订单</td></tr>
            ) : orders.map((order) => (
              <tr key={order.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{order.orderNo}</td>
                <td className="p-3">{order.customerName}</td>
                <td className="p-3 text-xs text-muted-foreground">{order.customerContact || "-"}</td>
                <td className="p-3 text-right font-medium">¥{Number(order.totalAmount || 0).toFixed(2)}</td>
                <td className="p-3 text-center">
                  <Badge variant={statusMap[order.status]?.variant || "secondary"}>
                    {statusMap[order.status]?.label || order.status}
                  </Badge>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString("zh-CN")}
                </td>
                <td className="p-3 text-center">
                  <Button variant="ghost" size="icon" onClick={() => showDetail(order)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <span>共 {total} 条</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className="flex items-center px-3">{page}/{totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      </div>

      {/* 创建订单弹窗 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>创建订单</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>客户名称 *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="客户名称" />
              </div>
              <div>
                <Label>联系方式</Label>
                <Input value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} placeholder="电话/微信" />
              </div>
            </div>
            <div>
              <Label>添加零件</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="搜索零件..." value={partSearch} onChange={(e) => setPartSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchParts()} />
                <Button variant="outline" onClick={searchParts}><Search className="h-4 w-4" /></Button>
              </div>
              {parts.length > 0 && (
                <div className="border rounded mt-2 max-h-32 overflow-y-auto">
                  {parts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-sm border-b last:border-0">
                      <span>{p.partNumber} - {p.name} (库存:{p.stockQuantity})</span>
                      <Button size="sm" variant="ghost" onClick={() => addItem(p)}>添加</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {orderItems.length > 0 && (
              <div>
                <Label>已选零件</Label>
                <div className="border rounded mt-1">
                  {orderItems.map((item) => (
                    <div key={item.partId} className="flex items-center gap-3 px-3 py-2 border-b last:border-0 text-sm">
                      <span className="flex-1">{item.partName}</span>
                      <Input type="number" className="w-16 h-7" value={item.quantity} min={1}
                        onChange={(e) => setOrderItems(orderItems.map((i) => i.partId === item.partId ? { ...i, quantity: parseInt(e.target.value) || 1 } : i))} />
                      <span className="w-20 text-right">¥{item.unitPrice.toFixed(2)}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.partId)}>
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <div className="px-3 py-2 text-right font-medium">合计: ¥{totalAmount.toFixed(2)}</div>
                </div>
              </div>
            )}
            <div>
              <Label>备注</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="订单备注" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!customerName || orderItems.length === 0}>创建订单</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 订单详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>订单详情</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">订单号:</span> {selectedOrder.orderNo}</div>
                <div><span className="text-muted-foreground">客户:</span> {selectedOrder.customerName}</div>
                <div><span className="text-muted-foreground">联系方式:</span> {selectedOrder.customerContact || "-"}</div>
                <div>
                  <span className="text-muted-foreground">状态:</span>{" "}
                  <Badge variant={statusMap[selectedOrder.status]?.variant}>{statusMap[selectedOrder.status]?.label}</Badge>
                </div>
              </div>
              <div>
                <Label>订单明细</Label>
                <div className="border rounded mt-1 text-sm">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between px-3 py-2 border-b last:border-0">
                      <span>{item.part.partNumber} × {item.quantity}</span>
                      <span>¥{(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="px-3 py-2 font-medium text-right">合计: ¥{Number(selectedOrder.totalAmount || 0).toFixed(2)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedOrder.status === "PENDING" && (
                  <>
                    <Button size="sm" onClick={() => updateStatus(selectedOrder.id, "SHIPPED")}>
                      <Truck className="h-3.5 w-3.5 mr-1" /> 发货
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(selectedOrder.id, "CANCELLED")}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> 取消
                    </Button>
                  </>
                )}
                {selectedOrder.status === "SHIPPED" && (
                  <Button size="sm" onClick={() => updateStatus(selectedOrder.id, "COMPLETED")}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> 完成
                  </Button>
                )}
                {selectedOrder.status === "CANCELLED" && (
                  <Button size="sm" variant="destructive" onClick={async () => {
                    await fetch(`/api/orders/${selectedOrder.id}`, { method: "DELETE" });
                    setDetailOpen(false);
                    fetchOrders();
                  }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> 删除
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
