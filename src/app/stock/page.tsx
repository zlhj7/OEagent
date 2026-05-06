import { StockOverview } from "@/components/stock/StockOverview";

export default function StockPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">库存管理</h2>
        <p className="text-muted-foreground">管理零件库存、入库出库</p>
      </div>
      <StockOverview />
    </div>
  );
}
