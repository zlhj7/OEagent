import { SuppliersTable } from "@/components/suppliers/SuppliersTable";

export default function SuppliersPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">供应商管理</h2>
        <p className="text-muted-foreground">管理供应商信息</p>
      </div>
      <SuppliersTable />
    </div>
  );
}
