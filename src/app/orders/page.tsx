import { OrdersTable } from "@/components/orders/OrdersTable";

export default function OrdersPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">订单管理</h2>
        <p className="text-muted-foreground">创建和管理客户订单</p>
      </div>
      <OrdersTable />
    </div>
  );
}
