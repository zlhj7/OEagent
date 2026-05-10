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
} from "@/components/ui/dialog";
import { Search, ChevronDown, ChevronRight, ExternalLink, Eye } from "lucide-react";

interface KitItem {
  id: number;
  quantity: number;
  role: string | null;
  part: {
    id: number;
    partNumber: string;
    oeNumber: string | null;
    name: string;
    stockQuantity: number;
    stockWarning: number;
  };
}

interface Kit {
  id: number;
  kitNumber: string;
  oeNumber: string | null;
  name: string;
  description: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehicleYearStart: number | null;
  vehicleYearEnd: number | null;
  vehicleEngine: string | null;
  sellPrice: number | null;
  purchasePrice: number | null;
  stockQuantity: number;
  stockWarning: number;
  rockautoUrl: string | null;
  supplier: { id: number; name: string } | null;
  items: KitItem[];
}

export function KitsTable() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailKit, setDetailKit] = useState<Kit | null>(null);

  const fetchKits = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/kits?q=${encodeURIComponent(search)}`);
    const data = await res.json();
    setKits(data.kits || []);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchKits(); }, [fetchKits]);

  const getStockBadge = (qty: number, warn: number) => {
    if (qty <= 0) return <Badge variant="destructive">缺货</Badge>;
    if (qty <= warn) return <Badge variant="destructive">低库存 {qty}</Badge>;
    return <Badge variant="secondary">库存 {qty}</Badge>;
  };

  return (
    <div>
      {/* 搜索栏 */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索套装型号、OE号、名称、车型..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 表格 */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium w-10"></th>
              <th className="text-left p-3 font-medium">套装型号</th>
              <th className="text-left p-3 font-medium">OE号</th>
              <th className="text-left p-3 font-medium">套装名称</th>
              <th className="text-left p-3 font-medium">适用车型</th>
              <th className="text-left p-3 font-medium">发动机</th>
              <th className="text-left p-3 font-medium">售价</th>
              <th className="text-center p-3 font-medium">配件数</th>
              <th className="text-center p-3 font-medium">库存</th>
              <th className="text-center p-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center p-8 text-muted-foreground">加载中...</td></tr>
            ) : kits.length === 0 ? (
              <tr><td colSpan={10} className="text-center p-8 text-muted-foreground">暂无套装数据</td></tr>
            ) : kits.map((kit) => {
              const isExpanded = expandedId === kit.id;
              const yearRange = kit.vehicleYearStart
                ? `${kit.vehicleYearStart}-${kit.vehicleYearEnd || ""}`
                : "";
              return (
                <>
                  <tr key={kit.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : kit.id)}
                        className="p-0.5 rounded hover:bg-muted transition-colors"
                      >
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />
                        }
                      </button>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setDetailKit(kit)}
                        className="font-mono text-xs font-bold hover:text-primary hover:underline flex items-center gap-1"
                      >
                        {kit.kitNumber}
                        <Eye className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </td>
                    <td className="p-3 font-mono text-xs">{kit.oeNumber || "-"}</td>
                    <td className="p-3 text-xs">{kit.name}</td>
                    <td className="p-3 text-xs">
                      {kit.vehicleModel
                        ? <span>{kit.vehicleBrand} {kit.vehicleModel} {yearRange}</span>
                        : <span className="text-muted-foreground">-</span>
                      }
                    </td>
                    <td className="p-3 text-xs font-mono">{kit.vehicleEngine || "-"}</td>
                    <td className="p-3 text-xs font-medium">
                      {kit.sellPrice ? `¥${kit.sellPrice.toFixed(0)}` : "-"}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline">{kit.items.length} 件</Badge>
                    </td>
                    <td className="p-3 text-center">
                      {getStockBadge(kit.stockQuantity, kit.stockWarning)}
                    </td>
                    <td className="p-3 text-center">
                      {kit.rockautoUrl && (
                        <a href={kit.rockautoUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          RockAuto <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                  </tr>

                  {/* 展开的配件列表 */}
                  {isExpanded && (
                    <tr key={`${kit.id}-detail`}>
                      <td></td>
                      <td colSpan={9} className="px-3 pb-3">
                        <div className="border rounded-md bg-muted/20">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/40">
                              <tr>
                                <th className="text-left p-2 font-medium">型号</th>
                                <th className="text-left p-2 font-medium">OE号</th>
                                <th className="text-left p-2 font-medium">名称</th>
                                <th className="text-left p-2 font-medium">角色</th>
                                <th className="text-center p-2 font-medium">数量</th>
                                <th className="text-center p-2 font-medium">库存</th>
                              </tr>
                            </thead>
                            <tbody>
                              {kit.items.map((item) => (
                                <tr key={item.id} className="border-t">
                                  <td className="p-2 font-mono">{kit.kitNumber}</td>
                                  <td className="p-2 font-mono">{item.part.oeNumber || "-"}</td>
                                  <td className="p-2">{item.part.name}</td>
                                  <td className="p-2">
                                    {item.role
                                      ? <Badge variant="outline" className="text-[10px]">{item.role}</Badge>
                                      : "-"
                                    }
                                  </td>
                                  <td className="p-2 text-center">{item.quantity}</td>
                                  <td className="p-2 text-center">
                                    <Badge
                                      variant={item.part.stockQuantity <= item.part.stockWarning ? "destructive" : "secondary"}
                                      className="text-[10px]"
                                    >
                                      {item.part.stockQuantity}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 套装详情弹窗 */}
      <Dialog open={!!detailKit} onOpenChange={() => setDetailKit(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>套装详情 — {detailKit?.kitNumber}</DialogTitle>
          </DialogHeader>
          {detailKit && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">套装型号：</span><span className="font-mono font-bold">{detailKit.kitNumber}</span></div>
                <div><span className="text-muted-foreground">OE号：</span><span className="font-mono">{detailKit.oeNumber || "-"}</span></div>
                <div><span className="text-muted-foreground">名称：</span>{detailKit.name}</div>
                <div><span className="text-muted-foreground">发动机：</span><span className="font-mono">{detailKit.vehicleEngine || "-"}</span></div>
                <div><span className="text-muted-foreground">适用车型：</span>{detailKit.vehicleBrand} {detailKit.vehicleModel}</div>
                <div><span className="text-muted-foreground">适配年份：</span>{detailKit.vehicleYearStart || "-"} ~ {detailKit.vehicleYearEnd || "-"}</div>
                <div><span className="text-muted-foreground">售价：</span>{detailKit.sellPrice ? `¥${detailKit.sellPrice.toFixed(0)}` : "-"}</div>
                <div><span className="text-muted-foreground">库存：</span>{detailKit.stockQuantity}</div>
              </div>

              {detailKit.description && (
                <div className="text-sm">
                  <span className="text-muted-foreground">说明：</span>
                  <p className="mt-1">{detailKit.description}</p>
                </div>
              )}

              <div>
                <div className="text-sm font-medium mb-2">套装内配件（{detailKit.items.length} 件）</div>
                <div className="border rounded-md divide-y">
                  {detailKit.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{detailKit.kitNumber}</span>
                          {item.role && <Badge variant="outline" className="text-[10px]">{item.role}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.part.name}</div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">OE: {item.part.oeNumber || "-"}</span>
                        <span>x{item.quantity}</span>
                        <Badge
                          variant={item.part.stockQuantity <= item.part.stockWarning ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          库存 {item.part.stockQuantity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {detailKit.rockautoUrl && (
                <a href={detailKit.rockautoUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  在 RockAuto 上查看 <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
