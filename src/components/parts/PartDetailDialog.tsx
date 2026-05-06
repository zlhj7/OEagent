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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, ArrowRightLeft, History } from "lucide-react";
import type { PartWithSupplier } from "@/types";
import { parseOeNumbers, parseSupplierPrices, parseVehicleFitments } from "@/lib/part-utils";

interface PartRevision {
  id: number;
  version: string;
  changeType: string;
  oldPartNumber: string | null;
  newPartNumber: string | null;
  changeDescription: string | null;
  yearStart: number | null;
  yearEnd: number | null;
  interchangeable: boolean;
  compatibilityNote: string | null;
  createdAt: string;
}

interface Props {
  part: PartWithSupplier | null;
  open: boolean;
  onClose: () => void;
}

const changeTypeLabels: Record<string, string> = {
  REVISION: "改版",
  SUPERSEDES: "替代老件",
  SUPERSEDED_BY: "被新件替代",
};

export function PartDetailDialog({ part, open, onClose }: Props) {
  const [revisions, setRevisions] = useState<PartRevision[]>([]);
  const [showAddRevision, setShowAddRevision] = useState(false);
  const [revForm, setRevForm] = useState({
    version: "", changeType: "REVISION", oldPartNumber: "", newPartNumber: "",
    changeDescription: "", yearStart: "", yearEnd: "",
    interchangeable: false, compatibilityNote: "",
  });

  const fetchRevisions = useCallback(async () => {
    if (!part) return;
    const res = await fetch(`/api/parts/${part.id}/revisions`);
    const data = await res.json();
    setRevisions(data);
  }, [part]);

  useEffect(() => {
    if (open && part) fetchRevisions();
  }, [open, part, fetchRevisions]);

  if (!part) return null;

  const oeNumbers = parseOeNumbers(part.oeNumber);
  const fitments = parseVehicleFitments(
    part.vehicleBrand, part.vehicleModel, part.vehicleYearStart, part.vehicleYearEnd
  );
  const suppliers = parseSupplierPrices(
    part.supplierPrices, part.supplierId, part.supplier?.name || null, part.purchasePrice, part.sellPrice
  );

  const handleAddRevision = async () => {
    const res = await fetch(`/api/parts/${part.id}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...revForm,
        yearStart: revForm.yearStart ? parseInt(revForm.yearStart) : null,
        yearEnd: revForm.yearEnd ? parseInt(revForm.yearEnd) : null,
      }),
    });
    if (res.ok) {
      setShowAddRevision(false);
      setRevForm({
        version: "", changeType: "REVISION", oldPartNumber: "", newPartNumber: "",
        changeDescription: "", yearStart: "", yearEnd: "",
        interchangeable: false, compatibilityNote: "",
      });
      fetchRevisions();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">{part.partNumber}</span>
            <span className="text-muted-foreground">-</span>
            <span>{part.name}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-2">
          <TabsList>
            <TabsTrigger value="info">基本信息</TabsTrigger>
            <TabsTrigger value="versions">
              <History className="h-3.5 w-3.5 mr-1" />
              版本历史 {revisions.length > 0 && `(${revisions.length})`}
            </TabsTrigger>
          </TabsList>

          {/* 基本信息 */}
          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">型号:</span>
                <span className="ml-2 font-mono font-medium">{part.partNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground">名称:</span>
                <span className="ml-2">{part.name}</span>
              </div>
              {part.description && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">描述:</span>
                  <span className="ml-2">{part.description}</span>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-muted-foreground">OE号:</span>
                <div className="ml-2 flex flex-wrap gap-1 mt-1">
                  {oeNumbers.length === 0 ? <span>-</span> : oeNumbers.map((oe, i) => (
                    <Badge key={i} variant="outline" className="font-mono text-xs">{oe}</Badge>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">适用车型:</span>
                <div className="ml-2 flex flex-wrap gap-1 mt-1">
                  {fitments.length === 0 ? <span>-</span> : fitments.map((f, i) => {
                    const year = f.yearStart ? ` ${f.yearStart}-${f.yearEnd || ""}` : "";
                    return <Badge key={i} variant="secondary" className="text-xs">{f.brand} {f.model}{year}</Badge>;
                  })}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">供应商报价:</span>
                <div className="ml-2 mt-1 border rounded divide-y">
                  {suppliers.length === 0 ? <div className="p-2 text-xs">-</div> : suppliers.map((sp, i) => (
                    <div key={i} className="flex justify-between px-3 py-1.5 text-xs">
                      <span>{sp.supplierName}</span>
                      <span className="text-muted-foreground">采购 ¥{sp.purchasePrice.toFixed(2)} / 售价 ¥{sp.sellPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">库存:</span>
                <Badge className="ml-2" variant={part.stockQuantity <= part.stockWarning ? "destructive" : "secondary"}>
                  {part.stockQuantity}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">来源:</span>
                <span className="ml-2">{part.source || "manual"}</span>
              </div>
            </div>
          </TabsContent>

          {/* 版本历史 */}
          <TabsContent value="versions" className="mt-4">
            <div className="flex justify-end mb-3">
              <Button size="sm" variant="outline" onClick={() => setShowAddRevision(!showAddRevision)}>
                <Plus className="h-3 w-3 mr-1" />
                添加版本记录
              </Button>
            </div>

            {/* 添加版本表单 */}
            {showAddRevision && (
              <div className="border rounded p-4 mb-4 space-y-3 bg-muted/30">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">版本号</Label>
                    <Input value={revForm.version} onChange={(e) => setRevForm({ ...revForm, version: e.target.value })} placeholder="如 V2" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">变更类型</Label>
                    <Select value={revForm.changeType} onValueChange={(v) => setRevForm({ ...revForm, changeType: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REVISION">改版</SelectItem>
                        <SelectItem value="SUPERSEDES">替代老件</SelectItem>
                        <SelectItem value="SUPERSEDED_BY">被新件替代</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={revForm.interchangeable} onChange={(e) => setRevForm({ ...revForm, interchangeable: e.target.checked })} />
                      可互换
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">旧零件号</Label>
                    <Input value={revForm.oldPartNumber} onChange={(e) => setRevForm({ ...revForm, oldPartNumber: e.target.value })} placeholder="老版本零件号" className="h-8 text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">新零件号</Label>
                    <Input value={revForm.newPartNumber} onChange={(e) => setRevForm({ ...revForm, newPartNumber: e.target.value })} placeholder="新版本零件号" className="h-8 text-xs font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">适配年份起</Label>
                    <Input type="number" value={revForm.yearStart} onChange={(e) => setRevForm({ ...revForm, yearStart: e.target.value })} placeholder="2015" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">适配年份止</Label>
                    <Input type="number" value={revForm.yearEnd} onChange={(e) => setRevForm({ ...revForm, yearEnd: e.target.value })} placeholder="2020" className="h-8 text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">变更说明</Label>
                  <Textarea value={revForm.changeDescription} onChange={(e) => setRevForm({ ...revForm, changeDescription: e.target.value })} placeholder="如：改进链条材质，修正导轨安装孔位" rows={2} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs">互换性说明</Label>
                  <Input value={revForm.compatibilityNote} onChange={(e) => setRevForm({ ...revForm, compatibilityNote: e.target.value })} placeholder="如：需同时更换张紧器" className="h-8 text-xs" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddRevision} disabled={!revForm.version}>保存</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddRevision(false)}>取消</Button>
                </div>
              </div>
            )}

            {/* 版本列表 */}
            {revisions.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                暂无版本记录，点击上方按钮添加
              </div>
            ) : (
              <div className="space-y-3">
                {revisions.map((rev) => (
                  <div key={rev.id} className="border rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{rev.version}</Badge>
                      <Badge variant={rev.changeType === "SUPERSEDES" ? "success" : rev.changeType === "SUPERSEDED_BY" ? "warning" : "secondary"}>
                        {changeTypeLabels[rev.changeType] || rev.changeType}
                      </Badge>
                      {rev.interchangeable && (
                        <Badge variant="info" className="gap-1">
                          <ArrowRightLeft className="h-3 w-3" /> 可互换
                        </Badge>
                      )}
                    </div>
                    {(rev.oldPartNumber || rev.newPartNumber) && (
                      <div className="text-xs mb-1">
                        {rev.oldPartNumber && <span className="font-mono">{rev.oldPartNumber}</span>}
                        {rev.oldPartNumber && rev.newPartNumber && <span className="mx-2 text-muted-foreground">→</span>}
                        {rev.newPartNumber && <span className="font-mono font-medium">{rev.newPartNumber}</span>}
                      </div>
                    )}
                    {(rev.yearStart || rev.yearEnd) && (
                      <div className="text-xs text-muted-foreground mb-1">
                        适配年份: {rev.yearStart || "?"}-{rev.yearEnd || "?"}
                      </div>
                    )}
                    {rev.changeDescription && (
                      <div className="text-xs mt-1">{rev.changeDescription}</div>
                    )}
                    {rev.compatibilityNote && (
                      <div className="text-xs text-orange-600 mt-1">注意: {rev.compatibilityNote}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
