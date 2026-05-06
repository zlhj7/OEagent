import { ComplaintsTable } from "@/components/complaints/ComplaintsTable";

export default function ComplaintsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">投诉处理</h2>
        <p className="text-muted-foreground">管理客户投诉，跟踪处理进度</p>
      </div>
      <ComplaintsTable />
    </div>
  );
}
