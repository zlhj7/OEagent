import { StatsDashboard } from "@/components/stats/StatsDashboard";

export default function StatsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">数据统计</h2>
        <p className="text-muted-foreground">销售数据和业务概览</p>
      </div>
      <StatsDashboard />
    </div>
  );
}
