"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  ShoppingCart,
  MessageSquare,
  Warehouse,
  BarChart3,
  Truck,
  Bot,
} from "lucide-react";

const navItems = [
  { href: "/parts", label: "零件管理", icon: Package },
  { href: "/orders", label: "订单管理", icon: ShoppingCart },
  { href: "/complaints", label: "投诉处理", icon: MessageSquare },
  { href: "/stock", label: "库存管理", icon: Warehouse },
  { href: "/stats", label: "数据统计", icon: BarChart3 },
  { href: "/suppliers", label: "供应商", icon: Truck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-muted/30 flex flex-col h-screen shrink-0">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bot className="h-6 w-6" />
          OE Agent
        </h1>
        <p className="text-xs text-muted-foreground mt-1">零件管理系统</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground">v1.0.0</p>
      </div>
    </aside>
  );
}
