"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { ArrowUpCircle, ArrowDownCircle, Search } from "lucide-react";

interface PartStock {
  id: number;
  partNumber: string;
  name: string;
  stockQuantity: number;
  stockWarning: number;
  supplier: { name: string } | null;
}

interface StockRecord {
  id: number;
  type: "IN" | "OUT";
  quantity: number;
  reason: string | null;
  operator: string | null;
  createdAt: string;
  part: { partNumber: string; name: string };
}

export function StockOverview() {
  const [parts, setParts] = useState<PartStock[]>([]);
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [warningOnly, setWarningOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<PartStock | null>(null);
  const [opType, setOpType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [operator, setOperator] = useState("");

  const fetchParts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/stock?warningOnly=${warningOnly}`);
    const data = await res.json();
    setParts(data.data);
    setLoading(false);
  }, [warningOnly]);

  const fetchRecords = async () => {
    const res = await fetch("/api/stock/records?pageSize=50");
    const data = await res.json();
    setRecords(data.data);
  };

  useEffect(() => { fetchParts(); }, [fetchParts]);
  useEffect(() => { fetchRecords(); }, []);

  const openOp = (part: PartStock, type: "IN" | "OUT") => {
    setSelectedPart(part);
    setOpType(type);
    setQuantity("");
    setReason("");
    setOperator("");
    setDialogOpen(true);
  };

  const handleOp = async () => {
    if (!selectedPart || !quantity) return;
    await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partId: selectedPart.id,
        type: opType,
        quantity: parseInt(quantity),
        reason,
        operator,
      }),
    });
    setDialogOpen(false);
    fetchParts();
    fetchRecords();
  };

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">库存总览</TabsTrigger>
        <TabsTrigger value="records">出入库记录</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="flex items-center gap-3 mb-4 mt-4">
          <Button
            variant={warningOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setWarningOnly(!warningOnly)}
          >
            {warningOnly ? "显示全部" : "仅看低库存"}
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">型号</th>
                <th className="text-left p-3 font-medium">名称</th>
                <th className="text-left p-3 font-medium">供应商</th>
                <th className="text-center p-3 font-medium">库存</th>
                <th className="text-center p-3 font-medium">预警值</th>
                <th className="text-center p-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">加载中...</td></tr>
              ) : parts.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">暂无数据</td></tr>
              ) : parts.map((p) => (
                <tr key={p.id} className={`border-t hover:bg-muted/30 ${p.stockQuantity <= p.stockWarning ? "bg-red-50" : ""}`}>
                  <td className="p-3 font-mono text-xs">{p.partNumber}</td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-xs text-muted-foreground">{p.supplier?.name || "-"}</td>
                  <td className="p-3 text-center">
                    <Badge variant={p.stockQuantity <= p.stockWarning ? "destructive" : "secondary"}>
                      {p.stockQuantity}
                    </Badge>
                  </td>
                  <td className="p-3 text-center text-muted-foreground">{p.stockWarning}</td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openOp(p, "IN")}>
                        <ArrowUpCircle className="h-3.5 w-3.5 text-green-600 mr-1" /> 入库
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openOp(p, "OUT")}>
                        <ArrowDownCircle className="h-3.5 w-3.5 text-red-600 mr-1" /> 出库
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>

      <TabsContent value="records">
        <div className="border rounded-lg overflow-hidden mt-4">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">时间</th>
                <th className="text-left p-3 font-medium">零件</th>
                <th className="text-center p-3 font-medium">类型</th>
                <th className="text-center p-3 font-medium">数量</th>
                <th className="text-left p-3 font-medium">原因</th>
                <th className="text-left p-3 font-medium">操作人</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">暂无记录</td></tr>
              ) : records.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString("zh-CN")}</td>
                  <td className="p-3">{r.part.partNumber} - {r.part.name}</td>
                  <td className="p-3 text-center">
                    <Badge variant={r.type === "IN" ? "success" : "destructive"}>
                      {r.type === "IN" ? "入库" : "出库"}
                    </Badge>
                  </td>
                  <td className="p-3 text-center font-medium">{r.quantity}</td>
                  <td className="p-3 text-xs">{r.reason || "-"}</td>
                  <td className="p-3 text-xs">{r.operator || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>

      {/* 出入库弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{opType === "IN" ? "入库" : "出库"}</DialogTitle>
          </DialogHeader>
          {selectedPart && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="font-medium">{selectedPart.partNumber}</div>
                <div className="text-muted-foreground">{selectedPart.name}</div>
                <div className="mt-1">当前库存: <Badge variant={selectedPart.stockQuantity <= selectedPart.stockWarning ? "destructive" : "secondary"}>{selectedPart.stockQuantity}</Badge></div>
              </div>
              <div>
                <Label>数量 *</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min={1} />
              </div>
              <div>
                <Label>原因</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="入库/出库原因" />
              </div>
              <div>
                <Label>操作人</Label>
                <Input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="操作人姓名" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleOp} disabled={!quantity}>确认{opType === "IN" ? "入库" : "出库"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
