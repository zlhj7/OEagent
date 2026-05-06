# OE Agent 零件管理系统 — 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个完整的汽车零件管理 Web 系统，含零件查询、订单管理、投诉处理、库存管理、数据统计，以及 AI 对话式辅助功能。

**Architecture:** Next.js 15 全栈应用 (App Router)，Prisma ORM 连接 PostgreSQL，Claude API 实现 AI Agent，复用已有 RockAuto MCP Server 获取外部零件数据。

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, @anthropic-ai/sdk, Recharts

---

## Phase 1: 项目初始化与基础搭建

### Task 1: 创建 Next.js 项目脚手架

**Step 1: 初始化 Next.js 项目**

在 `E:\shengtu\OE agent` 目录下初始化项目（已有 `docs/` 目录，不要删除它）。

```bash
cd "E:/shengtu/OE agent"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

选择：TypeScript Yes, ESLint Yes, Tailwind CSS Yes, src/ directory Yes, App Router Yes, import alias @/*

Expected: 项目创建成功，生成 package.json, next.config.ts, tsconfig.json, src/app/ 等文件。

**Step 2: 验证项目可运行**

```bash
npm run dev
```

Expected: 开发服务器在 http://localhost:3000 启动，看到 Next.js 默认页面。

**Step 3: Commit**

```bash
git init
git add -A
git commit -m "chore: init Next.js project with TypeScript and Tailwind"
```

---

### Task 2: 安装 shadcn/ui 组件库

**Step 1: 初始化 shadcn/ui**

```bash
npx shadcn@latest init
```

选择：Style Default, Base color Slate, CSS variables Yes

Expected: 生成 `components.json`, `src/lib/utils.ts`, 更新 `tailwind.config.ts` 和 `globals.css`。

**Step 2: 安装核心组件**

```bash
npx shadcn@latest add button card dialog input label select table tabs textarea badge dropdown-menu toast separator sheet avatar
```

Expected: `src/components/ui/` 下生成对应的组件文件。

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui component library"
```

---

### Task 3: 安装并配置 Prisma + PostgreSQL

**Step 1: 安装 Prisma**

```bash
npm install prisma --save-dev
npm install @prisma/client
```

**Step 2: 初始化 Prisma**

```bash
npx prisma init
```

Expected: 生成 `prisma/schema.prisma` 和 `.env` 文件。

**Step 3: 配置数据库连接**

编辑 `.env`，设置 PostgreSQL 连接字符串：

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/oe_agent?schema=public"
```

> 注意：需要先确保本地 PostgreSQL 已安装并创建了 `oe_agent` 数据库：
> ```sql
> CREATE DATABASE oe_agent;
> ```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: init Prisma with PostgreSQL connection"
```

---

### Task 4: 定义 Prisma Schema（全部数据表）

**Step 1: 编写完整的 Prisma Schema**

编辑 `prisma/schema.prisma`：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Supplier {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(255)
  contact   String?  @db.VarChar(100)
  phone     String?  @db.VarChar(50)
  email     String?  @db.VarChar(100)
  address   String?  @db.Text
  notes     String?  @db.Text
  parts     Part[]
  createdAt DateTime @default(now()) @map("created_at")

  @@map("suppliers")
}

model Part {
  id               Int      @id @default(autoincrement())
  partNumber       String   @unique @map("part_number") @db.VarChar(100)
  oeNumber         String?  @map("oe_number") @db.VarChar(100)
  name             String   @db.VarChar(255)
  description      String?  @db.Text
  vehicleBrand     String?  @map("vehicle_brand") @db.VarChar(100)
  vehicleModel     String?  @map("vehicle_model") @db.VarChar(100)
  vehicleYearStart Int?     @map("vehicle_year_start")
  vehicleYearEnd   Int?     @map("vehicle_year_end")
  purchasePrice    Decimal? @map("purchase_price") @db.Decimal(10, 2)
  sellPrice        Decimal? @map("sell_price") @db.Decimal(10, 2)
  supplierId       Int?     @map("supplier_id")
  stockQuantity    Int      @default(0) @map("stock_quantity")
  stockWarning     Int      @default(5) @map("stock_warning")
  source           String?  @default("manual") @db.VarChar(50)
  rockautoUrl      String?  @map("rockauto_url") @db.Text
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  supplier      Supplier?       @relation(fields: [supplierId], references: [id])
  orderItems    OrderItem[]
  complaints    Complaint[]
  stockRecords  StockRecord[]

  @@index([vehicleBrand, vehicleModel])
  @@index([oeNumber])
  @@map("parts")
}

model Order {
  id             Int         @id @default(autoincrement())
  orderNo        String      @unique @map("order_no") @db.VarChar(50)
  customerName   String      @map("customer_name") @db.VarChar(255)
  customerContact String?    @map("customer_contact") @db.VarChar(100)
  status         OrderStatus @default(PENDING)
  totalAmount    Decimal?    @map("total_amount") @db.Decimal(10, 2)
  notes          String?     @db.Text
  createdAt      DateTime    @default(now()) @map("created_at")
  updatedAt      DateTime    @updatedAt @map("updated_at")

  items       OrderItem[]
  complaints  Complaint[]

  @@map("orders")
}

enum OrderStatus {
  PENDING
  SHIPPED
  COMPLETED
  CANCELLED
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int     @map("order_id")
  partId    Int     @map("part_id")
  quantity  Int
  unitPrice Decimal @map("unit_price") @db.Decimal(10, 2)

  order Order @relation(fields: [orderId], references: [id])
  part  Part  @relation(fields: [partId], references: [id])

  @@map("order_items")
}

model Complaint {
  id            Int            @id @default(autoincrement())
  complaintNo   String         @unique @map("complaint_no") @db.VarChar(50)
  customerName  String         @map("customer_name") @db.VarChar(255)
  orderId       Int?           @map("order_id")
  partId        Int?           @map("part_id")
  content       String         @db.Text
  status        ComplaintStatus @default(OPEN)
  priority      ComplaintPriority @default(MEDIUM)
  resolution    String?        @db.Text
  satisfaction  Int?           @db.Integer
  createdAt     DateTime       @default(now()) @map("created_at")
  resolvedAt    DateTime?      @map("resolved_at")

  order Order? @relation(fields: [orderId], references: [id])
  part  Part?  @relation(fields: [partId], references: [id])

  @@map("complaints")
}

enum ComplaintStatus {
  OPEN
  PROCESSING
  RESOLVED
  CLOSED
}

enum ComplaintPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model StockRecord {
  id        Int         @id @default(autoincrement())
  partId    Int         @map("part_id")
  type      StockType
  quantity  Int
  reason    String?     @db.VarChar(255)
  operator  String?     @db.VarChar(100)
  createdAt DateTime    @default(now()) @map("created_at")

  part Part @relation(fields: [partId], references: [id])

  @@map("stock_records")
}

enum StockType {
  IN
  OUT
}
```

**Step 2: 运行数据库迁移**

```bash
npx prisma migrate dev --name init
```

Expected: 迁移成功，所有表在 PostgreSQL 中创建完成。

**Step 3: 生成 Prisma Client**

```bash
npx prisma generate
```

Expected: Prisma Client 生成成功。

**Step 4: 验证数据库**

```bash
npx prisma studio
```

Expected: 浏览器打开 Prisma Studio，可以看到所有空表。

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: define Prisma schema with all data models"
```

---

### Task 5: 创建 Prisma Client 单例工具

**Step 1: 创建 `src/lib/db.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

> 为什么用 globalThis？Next.js 在开发模式下会热重载模块，每次重载都会创建新的 PrismaClient 实例，导致连接池溢出。通过 globalThis 缓存确保只有一个实例。

**Step 2: 创建类型定义 `src/types/index.ts`**

```typescript
import { Part, Supplier, Order, OrderItem, Complaint, StockRecord } from "@prisma/client";

export type PartWithSupplier = Part & {
  supplier: Supplier | null;
};

export type OrderWithItems = Order & {
  items: (OrderItem & { part: Part })[];
};

export type ComplaintWithRelations = Complaint & {
  order: Order | null;
  part: Part | null;
};

export type StockRecordWithPart = StockRecord & {
  part: Part;
};

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Prisma client singleton and shared types"
```

---

### Task 6: 构建整体布局（侧边栏 + 顶部栏 + 内容区）

**Step 1: 创建侧边栏组件 `src/components/layout/Sidebar.tsx`**

```tsx
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
    <aside className="w-64 border-r bg-muted/30 flex flex-col h-screen">
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
                  : "hover:bg-muted"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

> 需要安装图标库：`npm install lucide-react`

**Step 2: 修改根布局 `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OE Agent - 零件管理系统",
  description: "汽车零件管理、订单处理、投诉跟进系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="p-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
```

**Step 3: 创建首页 `src/app/page.tsx`**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/parts");
}
```

**Step 4: 安装 lucide-react**

```bash
npm install lucide-react
```

**Step 5: 验证布局**

```bash
npm run dev
```

Expected: 浏览器访问 http://localhost:3000，看到左侧导航栏 + 自动跳转到零件管理页。

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add sidebar layout and root page structure"
```

---

## Phase 2: 零件管理模块

### Task 7: 零件 CRUD API

**Step 1: 创建零件列表 API `src/app/api/parts/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/parts — 获取零件列表（支持搜索和分页）
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const search = searchParams.get("search") || "";
  const brand = searchParams.get("brand") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  const where: any = {};

  if (search) {
    where.OR = [
      { partNumber: { contains: search, mode: "insensitive" } },
      { oeNumber: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { vehicleModel: { contains: search, mode: "insensitive" } },
    ];
  }

  if (brand) {
    where.vehicleBrand = { contains: brand, mode: "insensitive" };
  }

  const [data, total] = await Promise.all([
    prisma.part.findMany({
      where,
      include: { supplier: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.part.count({ where }),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// POST /api/parts — 创建新零件
export async function POST(request: NextRequest) {
  const body = await request.json();

  const part = await prisma.part.create({
    data: {
      partNumber: body.partNumber,
      oeNumber: body.oeNumber || null,
      name: body.name,
      description: body.description || null,
      vehicleBrand: body.vehicleBrand || null,
      vehicleModel: body.vehicleModel || null,
      vehicleYearStart: body.vehicleYearStart || null,
      vehicleYearEnd: body.vehicleYearEnd || null,
      purchasePrice: body.purchasePrice || null,
      sellPrice: body.sellPrice || null,
      supplierId: body.supplierId || null,
      stockQuantity: body.stockQuantity || 0,
      stockWarning: body.stockWarning || 5,
      source: "manual",
    },
    include: { supplier: true },
  });

  return NextResponse.json({ success: true, data: part }, { status: 201 });
}
```

**Step 2: 创建单个零件 API `src/app/api/parts/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/parts/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const part = await prisma.part.findUnique({
    where: { id: parseInt(id) },
    include: { supplier: true, stockRecords: { orderBy: { createdAt: "desc" }, take: 10 } },
  });

  if (!part) {
    return NextResponse.json({ error: "零件不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: part });
}

// PUT /api/parts/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const part = await prisma.part.update({
    where: { id: parseInt(id) },
    data: {
      partNumber: body.partNumber,
      oeNumber: body.oeNumber,
      name: body.name,
      description: body.description,
      vehicleBrand: body.vehicleBrand,
      vehicleModel: body.vehicleModel,
      vehicleYearStart: body.vehicleYearStart,
      vehicleYearEnd: body.vehicleYearEnd,
      purchasePrice: body.purchasePrice,
      sellPrice: body.sellPrice,
      supplierId: body.supplierId,
      stockWarning: body.stockWarning,
    },
    include: { supplier: true },
  });

  return NextResponse.json({ success: true, data: part });
}

// DELETE /api/parts/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.part.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add parts CRUD API endpoints"
```

---

### Task 8: 零件管理页面 UI

**Step 1: 创建零件表格组件 `src/components/parts/PartsTable.tsx`**

这是一个客户端组件，包含：
- 数据表格（显示型号、OE号、名称、车型、价格、库存、供应商）
- 搜索框（按型号/OE号/车型搜索）
- 分页控制
- 新增/编辑/删除按钮

**Step 2: 创建零件表单弹窗 `src/components/parts/PartFormDialog.tsx`**

表单字段：
- 型号 (必填)
- OE号
- 零件名称 (必填)
- 描述
- 适用车牌、车型、年份范围
- 采购价、销售价
- 供应商 (下拉选择)
- 库存预警值

**Step 3: 创建零件管理页面 `src/app/parts/page.tsx`**

```tsx
import { PartsTable } from "@/components/parts/PartsTable";

export default function PartsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">零件管理</h2>
          <p className="text-muted-foreground">管理零件信息、价格和库存</p>
        </div>
      </div>
      <PartsTable />
    </div>
  );
}
```

**Step 4: 验证功能**

运行 `npm run dev`，访问 /parts 页面：
- 能看到空的零件列表
- 点击"新增零件"弹出表单
- 填写信息后提交，列表中出现新零件
- 搜索功能能按型号过滤

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add parts management page with table, search, and form"
```

---

### Task 9: 供应商 API（零件表单需要下拉选择供应商）

**Step 1: 创建供应商 API `src/app/api/suppliers/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: suppliers });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supplier = await prisma.supplier.create({
    data: {
      name: body.name,
      contact: body.contact || null,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json({ success: true, data: supplier }, { status: 201 });
}
```

**Step 2: 创建供应商详情/编辑/删除 API `src/app/api/suppliers/[id]/route.ts`**

GET/PUT/DELETE 三个方法，结构与零件 API 类似。

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add suppliers CRUD API"
```

---

## Phase 3: 订单管理模块

### Task 10: 订单 API

**Step 1: 创建订单列表 API `src/app/api/orders/route.ts`**

GET 支持按状态筛选、分页。
POST 创建订单（自动生成订单号 ORD-YYYYMMDD-XXXX，自动计算总额，关联 order_items 并扣减库存）。

**Step 2: 创建单个订单 API `src/app/api/orders/[id]/route.ts`**

GET 返回订单详情含所有明细和零件信息。
PUT 更新订单状态（状态流转验证：pending→shipped→completed，或 pending→cancelled）。
DELETE 仅允许删除 cancelled 状态的订单。

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add orders CRUD API with auto order-no generation"
```

---

### Task 11: 订单管理页面

**Step 1: 创建订单列表组件 `src/components/orders/OrdersTable.tsx`**

- 订单列表表格（订单号、客户、总额、状态、创建时间）
- 状态筛选 Tab（全部/待发货/已发货/已完成/已取消）
- 状态 Badge 颜色区分

**Step 2: 创建订单表单弹窗 `src/components/orders/OrderFormDialog.tsx`**

- 客户名称 + 联系方式
- 动态添加零件行（搜索选择零件 → 输入数量 → 自动填入单价）
- 自动计算总额
- 备注

**Step 3: 创建订单详情弹窗 `src/components/orders/OrderDetailDialog.tsx`**

- 显示订单基本信息
- 明细列表
- 状态修改按钮（发货/完成/取消）

**Step 4: 创建订单页面 `src/app/orders/page.tsx`**

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add orders management page with status workflow"
```

---

## Phase 4: 投诉处理模块

### Task 12: 投诉 API

**Step 1: 创建投诉 API `src/app/api/complaints/route.ts`**

GET 支持按状态/优先级筛选、分页。
POST 创建投诉（自动生成编号 CMP-YYYYMMDD-XXXX）。

**Step 2: 创建投诉详情 API `src/app/api/complaints/[id]/route.ts`**

GET 返回投诉详情含关联订单和零件信息。
PUT 更新投诉（状态、处理结果、满意度、resolvedAt 自动设置）。

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add complaints CRUD API"
```

---

### Task 13: 投诉处理页面

**Step 1: 创建投诉列表 `src/components/complaints/ComplaintsTable.tsx`**

- 投诉列表表格（编号、客户、关联订单、状态、优先级、创建时间）
- 状态和优先级筛选
- 优先级颜色 Badge（urgent=红, high=橙, medium=蓝, low=灰）

**Step 2: 创建投诉表单 `src/components/complaints/ComplaintFormDialog.tsx`**

- 客户名称
- 关联订单（可选，搜索选择）
- 关联零件（可选，搜索选择）
- 投诉内容
- 优先级

**Step 3: 创建投诉处理弹窗 `src/components/complaints/ComplaintProcessDialog.tsx`**

- 显示投诉详情
- 状态更新（open → processing → resolved → closed）
- 处理结果填写
- 满意度评价（1-5星）

**Step 4: 创建投诉页面 `src/app/complaints/page.tsx`**

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add complaints management page with process workflow"
```

---

## Phase 5: 库存管理模块

### Task 14: 库存 API

**Step 1: 创建出入库 API `src/app/api/stock/route.ts`**

GET 返回库存总览（所有零件的库存量），支持筛选低库存。
POST 执行出入库操作（创建 stock_record 同时更新 part.stock_quantity）。

**Step 2: 创建出入库记录 API `src/app/api/stock/records/route.ts`**

GET 返回出入库记录列表，支持按零件/类型/时间筛选。

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add stock management API with in/out operations"
```

---

### Task 15: 库存管理页面

**Step 1: 创建库存总览表格 `src/components/stock/StockOverview.tsx`**

- 零件列表含当前库存数量
- 低库存行高亮显示（红色背景）
- 入库/出库按钮

**Step 2: 创建出入库表单 `src/components/stock/StockOperationDialog.tsx`**

- 零件（自动填入或选择）
- 操作类型（入库/出库）
- 数量
- 原因

**Step 3: 创建出入库记录列表 `src/components/stock/StockRecords.tsx`**

- 按时间倒序显示所有出入库记录

**Step 4: 创建库存页面 `src/app/stock/page.tsx`**

用 Tabs 切换"库存总览"和"出入库记录"两个视图。

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add stock management page with overview and records"
```

---

## Phase 6: 供应商管理与数据统计

### Task 16: 供应商管理页面

**Step 1: 创建供应商列表 `src/components/suppliers/SuppliersTable.tsx`**

- 供应商列表（名称、联系人、电话、关联零件数）
- 新增/编辑表单

**Step 2: 创建供应商页面 `src/app/suppliers/page.tsx`**

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add suppliers management page"
```

---

### Task 17: 数据统计 API 与页面

**Step 1: 创建统计 API `src/app/api/stats/route.ts`**

```typescript
// 返回：
// - 总零件数、总订单数、总投诉数
// - 热销零件 TOP10（按 order_items 的 quantity 聚合）
// - 月度订单趋势（近6个月）
// - 投诉状态分布
// - 库存概览（总SKU、低库存数、库存总价值）
```

**Step 2: 创建统计页面 `src/app/stats/page.tsx`**

- 顶部 4 个数据卡片
- 热销零件 TOP10 柱状图
- 月度订单趋势折线图
- 投诉状态饼图

**Step 3: 安装 Recharts**

```bash
npm install recharts
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add statistics page with charts"
```

---

## Phase 7: AI Agent 集成

### Task 18: Claude API 端点与工具定义

**Step 1: 创建 Agent API `src/app/api/agent/route.ts`**

核心端点，接收用户消息，调用 Claude API 并执行工具。

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { tools } from "@/lib/agent/tools";
import { executeTool } from "@/lib/agent/executor";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages,
    tools,
  });

  // 处理工具调用
  const toolResults = [];
  for (const block of response.content) {
    if (block.type === "tool_use") {
      const result = await executeTool(block.name, block.input);
      toolResults.push({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }
  }

  // 如果有工具调用，需要二次调用 Claude 获取最终回复
  if (toolResults.length > 0) {
    const finalResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ],
      tools,
    });
    return NextResponse.json({ response: finalResponse });
  }

  return NextResponse.json({ response });
}
```

**Step 2: 创建工具定义 `src/lib/agent/tools.ts`**

导出所有 tool definitions 数组，供 Claude API 使用。

**Step 3: 创建工具执行器 `src/lib/agent/executor.ts`**

根据工具名分发到对应的处理函数，每个处理函数调用 Prisma 查询数据库。

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Claude API agent endpoint with tool definitions"
```

---

### Task 19: AI 对话 UI 组件

**Step 1: 创建 AI 对话窗口 `src/components/agent/ChatWidget.tsx`**

- 右下角悬浮按钮（点击展开/收起）
- 对话消息列表（用户消息 + AI 回复）
- 输入框 + 发送按钮
- 流式输出支持

**Step 2: 创建确认弹窗 `src/components/agent/ConfirmDialog.tsx`**

- 当 Agent 返回写操作时显示
- 展示操作预览信息
- 确认/取消按钮

**Step 3: 将 ChatWidget 集成到根布局**

在 `src/app/layout.tsx` 中添加 `<ChatWidget />`。

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add AI chat widget with confirmation dialog"
```

---

## Phase 8: RockAuto 集成

### Task 20: RockAuto MCP 集成

**Step 1: 创建 MCP 调用封装 `src/lib/rockauto.ts`**

封装对已有 RockAuto MCP Server（`E:/shengtu/rockauto-mcp/server.py`）的调用：
- 启动 Python 子进程
- 通过 stdio 发送 MCP 请求
- 解析响应

**Step 2: 创建 RockAuto 搜索 API `src/app/api/rockauto/search/route.ts`**

代理前端对 RockAuto 的搜索请求。

**Step 3: 创建 RockAuto 导入 API `src/app/api/rockauto/import/route.ts`**

将 RockAuto 搜索结果导入本地 parts 表。

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: integrate RockAuto MCP for external part search and import"
```

---

### Task 21: 零件管理页面添加 RockAuto 导入功能

**Step 1: 创建 RockAuto 搜索弹窗 `src/components/parts/RockautoImportDialog.tsx`**

- 品牌/车型/年份选择器
- 搜索按钮 + 结果列表
- 导入按钮（选中行导入到本地）

**Step 2: 在零件页面添加"从 RockAuto 导入"按钮**

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add RockAuto import UI in parts page"
```

---

## Phase 9: 种子数据与最终优化

### Task 22: 创建种子数据

**Step 1: 编写 `prisma/seed.ts`**

插入示例数据：
- 3-5 个供应商
- 10-15 个零件（含不同品牌/车型）
- 3-5 个订单及明细
- 2-3 个投诉

**Step 2: 配置 seed 命令**

在 `package.json` 中添加：
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

**Step 3: 运行种子数据**

```bash
npx prisma db seed
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add seed data for development"
```

---

### Task 23: 最终验证与清理

**Step 1: 完整功能测试**

运行整个系统，验证：
- [ ] 零件 CRUD + 搜索
- [ ] 订单创建 + 状态流转
- [ ] 投诉创建 + 处理
- [ ] 入库/出库 + 库存预警
- [ ] 数据统计图表
- [ ] AI 对话查询
- [ ] RockAuto 搜索和导入

**Step 2: 构建验证**

```bash
npm run build
```

Expected: 构建成功，无 TypeScript 错误。

**Step 3: 最终 Commit**

```bash
git add -A
git commit -m "chore: final cleanup and build verification"
```
```
