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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Eye, Star } from "lucide-react";
import type { ComplaintWithRelations, PaginatedResponse } from "@/types";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "success" | "destructive" | "warning" | "info" | "outline" }> = {
  OPEN: { label: "待处理", variant: "destructive" },
  PROCESSING: { label: "处理中", variant: "warning" },
  RESOLVED: { label: "已解决", variant: "success" },
  CLOSED: { label: "已关闭", variant: "secondary" },
};

const priorityMap: Record<string, { label: string; variant: "default" | "secondary" | "success" | "destructive" | "warning" | "info" | "outline" }> = {
  LOW: { label: "低", variant: "secondary" },
  MEDIUM: { label: "中", variant: "info" },
  HIGH: { label: "高", variant: "warning" },
  URGENT: { label: "紧急", variant: "destructive" },
};

export function ComplaintsTable() {
  const [complaints, setComplaints] = useState<ComplaintWithRelations[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [processOpen, setProcessOpen] = useState(false);
  const [selected, setSelected] = useState<ComplaintWithRelations | null>(null);

  // 创建表单
  const [form, setForm] = useState({ customerName: "", content: "", priority: "MEDIUM", orderId: "", partId: "" });
  // 处理表单
  const [processForm, setProcessForm] = useState({ status: "", resolution: "", satisfaction: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/complaints?page=${page}&status=${statusFilter}`);
    const data: PaginatedResponse<ComplaintWithRelations> = await res.json();
    setComplaints(data.data);
    setTotalPages(data.totalPages);
    setTotal(data.total);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        orderId: form.orderId ? parseInt(form.orderId) : undefined,
        partId: form.partId ? parseInt(form.partId) : undefined,
      }),
    });
    if (res.ok) {
      setCreateOpen(false);
      setForm({ customerName: "", content: "", priority: "MEDIUM", orderId: "", partId: "" });
      fetchData();
    }
  };

  const openProcess = (c: ComplaintWithRelations) => {
    setSelected(c);
    setProcessForm({ status: c.status, resolution: c.resolution || "", satisfaction: c.satisfaction?.toString() || "" });
    setProcessOpen(true);
  };

  const handleProcess = async () => {
    if (!selected) return;
    await fetch(`/api/complaints/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: processForm.status,
        resolution: processForm.resolution,
        satisfaction: processForm.satisfaction ? parseInt(processForm.satisfaction) : undefined,
      }),
    });
    setProcessOpen(false);
    fetchData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Tabs value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="OPEN">待处理</TabsTrigger>
            <TabsTrigger value="PROCESSING">处理中</TabsTrigger>
            <TabsTrigger value="RESOLVED">已解决</TabsTrigger>
            <TabsTrigger value="CLOSED">已关闭</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> 新建投诉
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">编号</th>
              <th className="text-left p-3 font-medium">客户</th>
              <th className="text-left p-3 font-medium">投诉内容</th>
              <th className="text-center p-3 font-medium">优先级</th>
              <th className="text-center p-3 font-medium">状态</th>
              <th className="text-left p-3 font-medium">创建时间</th>
              <th className="text-center p-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">加载中...</td></tr>
            ) : complaints.length === 0 ? (
              <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">暂无投诉</td></tr>
            ) : complaints.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{c.complaintNo}</td>
                <td className="p-3">{c.customerName}</td>
                <td className="p-3 max-w-xs truncate">{c.content}</td>
                <td className="p-3 text-center">
                  <Badge variant={priorityMap[c.priority]?.variant}>{priorityMap[c.priority]?.label}</Badge>
                </td>
                <td className="p-3 text-center">
                  <Badge variant={statusMap[c.status]?.variant}>{statusMap[c.status]?.label}</Badge>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("zh-CN")}</td>
                <td className="p-3 text-center">
                  <Button variant="ghost" size="icon" onClick={() => openProcess(c)}>
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

      {/* 创建投诉 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建投诉</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>客户名称 *</Label>
              <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div>
              <Label>投诉内容 *</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} />
            </div>
            <div>
              <Label>优先级</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">低</SelectItem>
                  <SelectItem value="MEDIUM">中</SelectItem>
                  <SelectItem value="HIGH">高</SelectItem>
                  <SelectItem value="URGENT">紧急</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!form.customerName || !form.content}>提交</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 处理投诉 */}
      <Dialog open={processOpen} onOpenChange={setProcessOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>处理投诉</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="font-medium">{selected.complaintNo}</div>
                <div className="text-muted-foreground mt-1">客户: {selected.customerName}</div>
                <div className="mt-2">{selected.content}</div>
              </div>
              <div>
                <Label>状态</Label>
                <Select value={processForm.status} onValueChange={(v) => setProcessForm({ ...processForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">待处理</SelectItem>
                    <SelectItem value="PROCESSING">处理中</SelectItem>
                    <SelectItem value="RESOLVED">已解决</SelectItem>
                    <SelectItem value="CLOSED">已关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>处理结果</Label>
                <Textarea value={processForm.resolution} onChange={(e) => setProcessForm({ ...processForm, resolution: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>客户满意度</Label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setProcessForm({ ...processForm, satisfaction: n.toString() })}>
                      <Star className={`h-6 w-6 ${parseInt(processForm.satisfaction || "0") >= n ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessOpen(false)}>取消</Button>
            <Button onClick={handleProcess}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
