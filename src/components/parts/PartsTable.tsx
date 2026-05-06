"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Pencil, Trash2, X, ChevronDown, Eye } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { PartDetailDialog } from "@/components/parts/PartDetailDialog";
import type { PartWithSupplier, PaginatedResponse, VehicleFitment, SupplierPrice } from "@/types";
import { parseOeNumbers, parseVehicleFitments, parseSupplierPrices } from "@/lib/part-utils";

interface Supplier {
  id: number;
  name: string;
}

// 常见汽车品牌下拉选项
const COMMON_BRANDS = [
  "Toyota", "Honda", "Ford", "Chevrolet", "Nissan", "BMW", "Mercedes-Benz",
  "Volkswagen", "Hyundai", "Kia", "Mazda", "Subaru", "Lexus", "Audi",
  "GM", "Dodge", "Jeep", "Chrysler", "Buick", "Cadillac", "Acura", "Infiniti",
];

export function PartsTable() {
  const [parts, setParts] = useState<PartWithSupplier[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<PartWithSupplier | null>(null);
  const [detailPart, setDetailPart] = useState<PartWithSupplier | null>(null);

  // 表单状态
  const [partNumber, setPartNumber] = useState("");
  const [oeNumbers, setOeNumbers] = useState<string[]>([]);
  const [newOe, setNewOe] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vehicleFitments, setVehicleFitments] = useState<VehicleFitment[]>([]);
  const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>([]);
  const [stockWarning, setStockWarning] = useState("5");

  // 新增适配车型临时状态
  const [newFitBrand, setNewFitBrand] = useState("");
  const [newFitModel, setNewFitModel] = useState("");
  const [newFitYearStart, setNewFitYearStart] = useState("");
  const [newFitYearEnd, setNewFitYearEnd] = useState("");

  // 新增供应商临时状态
  const [newSupId, setNewSupId] = useState("");
  const [newSupPurchase, setNewSupPurchase] = useState("");
  const [newSupSell, setNewSupSell] = useState("");

  const fetchParts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/parts?page=${page}&pageSize=15&search=${encodeURIComponent(search)}`
    );
    const data: PaginatedResponse<PartWithSupplier> = await res.json();
    setParts(data.data);
    setTotalPages(data.totalPages);
    setTotal(data.total);
    setLoading(false);
  }, [page, search]);

  const fetchSuppliers = async () => {
    const res = await fetch("/api/suppliers");
    const data = await res.json();
    setSuppliers(data.data);
  };

  useEffect(() => { fetchParts(); }, [fetchParts]);
  useEffect(() => { fetchSuppliers(); }, []);

  // ── OE 号管理 ──
  const addOeNumber = () => {
    const val = newOe.trim();
    if (val && !oeNumbers.includes(val)) {
      setOeNumbers([...oeNumbers, val]);
      setNewOe("");
    }
  };
  const removeOeNumber = (idx: number) => {
    setOeNumbers(oeNumbers.filter((_, i) => i !== idx));
  };

  // ── 适配车型管理 ──
  const addFitment = () => {
    if (!newFitBrand || !newFitModel) return;
    setVehicleFitments([...vehicleFitments, {
      brand: newFitBrand,
      model: newFitModel,
      yearStart: newFitYearStart ? parseInt(newFitYearStart) : undefined,
      yearEnd: newFitYearEnd ? parseInt(newFitYearEnd) : undefined,
    }]);
    setNewFitBrand("");
    setNewFitModel("");
    setNewFitYearStart("");
    setNewFitYearEnd("");
  };
  const removeFitment = (idx: number) => {
    setVehicleFitments(vehicleFitments.filter((_, i) => i !== idx));
  };

  // ── 供应商管理 ──
  const addSupplierPrice = () => {
    if (!newSupId || !newSupSell) return;
    const sup = suppliers.find((s) => s.id === parseInt(newSupId));
    if (!sup) return;
    if (supplierPrices.find((sp) => sp.supplierId === sup.id)) return;
    setSupplierPrices([...supplierPrices, {
      supplierId: sup.id,
      supplierName: sup.name,
      purchasePrice: parseFloat(newSupPurchase) || 0,
      sellPrice: parseFloat(newSupSell) || 0,
    }]);
    setNewSupId("");
    setNewSupPurchase("");
    setNewSupSell("");
  };
  const removeSupplierPrice = (idx: number) => {
    setSupplierPrices(supplierPrices.filter((_, i) => i !== idx));
  };

  // ── 打开弹窗 ──
  const openCreate = () => {
    setEditingPart(null);
    setPartNumber("");
    setOeNumbers([]);
    setNewOe("");
    setName("");
    setDescription("");
    setVehicleFitments([]);
    setSupplierPrices([]);
    setStockWarning("5");
    setDialogOpen(true);
  };

  const openEdit = (part: PartWithSupplier) => {
    setEditingPart(part);
    setPartNumber(part.partNumber);
    setOeNumbers(parseOeNumbers(part.oeNumber));
    setNewOe("");
    setName(part.name);
    setDescription(part.description || "");
    setVehicleFitments(parseVehicleFitments(
      part.vehicleBrand, part.vehicleModel, part.vehicleYearStart, part.vehicleYearEnd
    ));
    setSupplierPrices(parseSupplierPrices(
      part.supplierPrices, part.supplierId, part.supplier?.name || null, part.purchasePrice, part.sellPrice
    ));
    setStockWarning(part.stockWarning?.toString() || "5");
    setDialogOpen(true);
  };

  // ── 保存 ──
  const handleSave = async () => {
    const payload = {
      partNumber,
      oeNumber: oeNumbers.length > 0 ? JSON.stringify(oeNumbers) : null,
      name,
      description: description || null,
      vehicleBrand: vehicleFitments.length > 0 ? JSON.stringify(vehicleFitments) : null,
      vehicleModel: vehicleFitments[0]?.model || null,
      vehicleYearStart: vehicleFitments[0]?.yearStart || null,
      vehicleYearEnd: vehicleFitments[0]?.yearEnd || null,
      supplierPrices: supplierPrices.length > 0 ? JSON.stringify(supplierPrices) : null,
      // 兼容旧字段：取第一个供应商
      purchasePrice: supplierPrices[0]?.purchasePrice || null,
      sellPrice: supplierPrices[0]?.sellPrice || null,
      supplierId: supplierPrices[0]?.supplierId || null,
      stockWarning: stockWarning ? parseInt(stockWarning) : 5,
    };

    const url = editingPart ? `/api/parts/${editingPart.id}` : "/api/parts";
    const method = editingPart ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setDialogOpen(false);
      fetchParts();
    } else {
      const err = await res.json();
      alert(err.error || "操作失败");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除该零件？")) return;
    await fetch(`/api/parts/${id}`, { method: "DELETE" });
    fetchParts();
  };

  return (
    <div>
      {/* 搜索栏 */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索型号、OE号、名称、车型..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          新增零件
        </Button>
      </div>

      {/* 表格 */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">型号</th>
              <th className="text-left p-3 font-medium">OE号</th>
              <th className="text-left p-3 font-medium">名称</th>
              <th className="text-left p-3 font-medium">适用车型</th>
              <th className="text-left p-3 font-medium" colSpan={2}>售价/供应商</th>
              <th className="text-center p-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">加载中...</td></tr>
            ) : parts.length === 0 ? (
              <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">暂无数据</td></tr>
            ) : parts.map((part) => {
              const oeList = parseOeNumbers(part.oeNumber);
              const fitments = parseVehicleFitments(
                part.vehicleBrand, part.vehicleModel, part.vehicleYearStart, part.vehicleYearEnd
              );
              return (
                <tr key={part.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <button
                      onClick={() => setDetailPart(part)}
                      className="font-mono text-xs font-medium hover:text-primary hover:underline flex items-center gap-1"
                    >
                      {part.partNumber}
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </td>

                  {/* OE号 - 下拉菜单 */}
                  <td className="p-3">
                    {oeList.length === 0 ? (
                      <span className="text-xs text-muted-foreground">-</span>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="inline-flex items-center gap-1 text-xs font-mono hover:bg-muted rounded px-1.5 py-0.5 transition-colors">
                            {oeList[0]}
                            {oeList.length > 1 && (
                              <span className="text-[10px] text-muted-foreground">+{oeList.length - 1}</span>
                            )}
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" align="start">
                          <div className="text-[11px] text-muted-foreground mb-1">OE号 ({oeList.length})</div>
                          <div className="space-y-1">
                            {oeList.map((oe, i) => (
                              <div key={i} className="font-mono text-xs px-2 py-1 rounded hover:bg-muted">
                                {oe}
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </td>

                  <td className="p-3">{part.name}</td>

                  {/* 适用车型 - 下拉菜单 */}
                  <td className="p-3">
                    {fitments.length === 0 ? (
                      <span className="text-xs text-muted-foreground">-</span>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="inline-flex items-center gap-1 text-xs hover:bg-muted rounded px-1.5 py-0.5 transition-colors">
                            {(() => {
                              const f = fitments[0];
                              const year = f.yearStart ? ` ${f.yearStart}-${f.yearEnd || ""}` : "";
                              return `${f.brand} ${f.model}${year}`;
                            })()}
                            {fitments.length > 1 && (
                              <span className="text-[10px] text-muted-foreground">+{fitments.length - 1}</span>
                            )}
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" align="start">
                          <div className="text-[11px] text-muted-foreground mb-1">适用车型 ({fitments.length})</div>
                          <div className="space-y-1">
                            {fitments.map((f, i) => {
                              const year = f.yearStart ? ` ${f.yearStart}-${f.yearEnd || ""}` : "";
                              return (
                                <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-muted">
                                  <span className="font-medium">{f.brand}</span>
                                  <span>{f.model}</span>
                                  {year && <span className="text-muted-foreground">{year}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </td>

                  {/* 售价 + 供应商 - 合并下拉 */}
                  <td className="p-3" colSpan={2}>
                    {(() => {
                      const spList = parseSupplierPrices(
                        part.supplierPrices, part.supplierId, part.supplier?.name || null, part.purchasePrice, part.sellPrice
                      );
                      if (spList.length === 0) return <span className="text-xs text-muted-foreground">-</span>;
                      const first = spList[0];
                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="inline-flex items-center gap-1 text-xs hover:bg-muted rounded px-1.5 py-0.5 transition-colors w-full">
                              <span className="font-medium">¥{first.sellPrice.toFixed(2)}</span>
                              <span className="text-muted-foreground truncate max-w-[80px]">{first.supplierName}</span>
                              {spList.length > 1 && (
                                <span className="text-[10px] text-muted-foreground">+{spList.length - 1}</span>
                              )}
                              <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="start">
                            <div className="text-[11px] text-muted-foreground mb-1">供应商报价 ({spList.length})</div>
                            <div className="space-y-1">
                              {spList.map((sp, i) => (
                                <div key={i} className="flex items-center justify-between gap-4 text-xs px-2 py-1.5 rounded hover:bg-muted">
                                  <span className="font-medium">{sp.supplierName}</span>
                                  <div className="flex gap-3 text-muted-foreground">
                                    <span>采购 ¥{sp.purchasePrice.toFixed(2)}</span>
                                    <span className="text-foreground font-medium">售价 ¥{sp.sellPrice.toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })()}
                  </td>
                  <td className="p-3 text-right">
                    <Badge variant={part.stockQuantity <= part.stockWarning ? "destructive" : "secondary"}>
                      {part.stockQuantity}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(part)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(part.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <span>共 {total} 条记录</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            上一页
          </Button>
          <span className="flex items-center px-3">第 {page}/{totalPages} 页</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            下一页
          </Button>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPart ? "编辑零件" : "新增零件"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>型号 *</Label>
                <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="如 TC-KIT-001" />
              </div>
              <div>
                <Label>零件名称 *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如 正时链条套件" />
              </div>
            </div>
            <div>
              <Label>描述</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="零件详细描述..." rows={2} />
            </div>

            {/* OE 号 —— 动态列表 */}
            <div>
              <Label>OE号（可添加多个）</Label>
              <div className="flex flex-wrap gap-2 mt-1 mb-2">
                {oeNumbers.map((oe, i) => (
                  <Badge key={i} variant="outline" className="font-mono text-xs gap-1">
                    {oe}
                    <button onClick={() => removeOeNumber(i)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newOe}
                  onChange={(e) => setNewOe(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOeNumber())}
                  placeholder="输入 OE 号，回车添加"
                  className="font-mono"
                />
                <Button type="button" variant="outline" size="sm" onClick={addOeNumber}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* 适配车型 —— 动态列表 + 下拉选择 */}
            <div>
              <Label>适用车型（可添加多个）</Label>
              <div className="flex flex-wrap gap-2 mt-1 mb-2">
                {vehicleFitments.map((f, i) => {
                  const year = f.yearStart ? ` ${f.yearStart}-${f.yearEnd || ""}` : "";
                  return (
                    <Badge key={i} variant="secondary" className="text-xs gap-1">
                      {f.brand} {f.model}{year}
                      <button onClick={() => removeFitment(i)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Select value={newFitBrand} onValueChange={setNewFitBrand}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="品牌" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_BRANDS.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input
                    value={newFitModel}
                    onChange={(e) => setNewFitModel(e.target.value)}
                    placeholder="车型 如 Camry"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    value={newFitYearStart}
                    onChange={(e) => setNewFitYearStart(e.target.value)}
                    placeholder="年起 如 2015"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    value={newFitYearEnd}
                    onChange={(e) => setNewFitYearEnd(e.target.value)}
                    placeholder="年止"
                    className="h-8 text-xs"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addFitment} className="h-8 px-2">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 供应商报价 —— 动态列表 */}
            <div>
              <Label>供应商报价（可添加多个）</Label>
              {supplierPrices.length > 0 && (
                <div className="border rounded mt-1 mb-2 divide-y">
                  {supplierPrices.map((sp, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="font-medium">{sp.supplierName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">采购 ¥{sp.purchasePrice.toFixed(2)}</span>
                        <span className="font-medium">售价 ¥{sp.sellPrice.toFixed(2)}</span>
                        <button onClick={() => removeSupplierPrice(i)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <Select value={newSupId} onValueChange={setNewSupId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择供应商" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.filter((s) => !supplierPrices.find((sp) => sp.supplierId === s.id)).map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" step="0.01" value={newSupPurchase} onChange={(e) => setNewSupPurchase(e.target.value)} placeholder="采购价" className="h-8 text-xs" />
                <Input type="number" step="0.01" value={newSupSell} onChange={(e) => setNewSupSell(e.target.value)} placeholder="售价" className="h-8 text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={addSupplierPrice} className="h-8 px-2">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* 预警 */}
            <div>
              <Label>库存预警值</Label>
              <Input type="number" value={stockWarning} onChange={(e) => setStockWarning(e.target.value)} className="w-32" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={!partNumber || !name}>{editingPart ? "保存" : "创建"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 零件详情弹窗 */}
      <PartDetailDialog
        part={detailPart}
        open={!!detailPart}
        onClose={() => setDetailPart(null)}
      />
    </div>
  );
}
