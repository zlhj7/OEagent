import { PartsTable } from "@/components/parts/PartsTable";

export default function PartsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">零件管理</h2>
        <p className="text-muted-foreground">管理零件信息、价格和库存</p>
      </div>
      <PartsTable />
    </div>
  );
}
