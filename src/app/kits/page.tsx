import { KitsTable } from "@/components/kits/KitsTable";

export default function KitsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">套装管理</h2>
        <p className="text-muted-foreground">管理正时链条套装等成套配件，点击型号可展开查看内含配件</p>
      </div>
      <KitsTable />
    </div>
  );
}
