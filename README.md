# OE Agent — 汽车原厂件管理系统

面向汽配行业的原厂件管理系统，集成 AI 对话式辅助和 RockAuto 外部数据源，支持零件查询、套装管理、订单管理、投诉处理、库存管理和数据统计。

## 功能概览

### 零件管理
- 零件 CRUD，支持型号、OE号、名称、车型、发动机型号多维度搜索
- 多 OE 号 — 每个零件支持多个 OE 号
- 多适配车型 — 支持同一零件适配多个车型
- 多供应商报价 — 同一零件可关联多个供应商及各自的采购价/售价
- 版本管理 — 记录新老版本号、变更说明、OE 号交叉引用、互换性

### 套装管理
- 套装（成套配件）管理，如正时链条套装、水泵套装
- 点击展开查看套装内所有子配件及角色
- 支持按套装号、OE号、车型搜索

### 订单管理
- 创建订单，自动计算金额，自动扣减库存
- 订单状态流转：待发货 -> 已发货 -> 已完成（或已取消）

### 投诉处理
- 创建投诉，可关联订单和零件
- 状态流转：待处理 -> 处理中 -> 已解决 -> 已关闭
- 满意度评价（1-5 星）

### 库存管理
- 库存总览，低库存红色预警
- 入库/出库操作 + 出入库记录

### 数据统计
- 总览卡片（总零件数、订单数、投诉数、待处理投诉）
- 热销零件 TOP10（柱状图）
- 投诉状态分布（饼图）
- 库存预警列表

### AI 助手
- 自然语言查询零件、订单、投诉、库存
- RockAuto 外部搜索 — 本地找不到时自动搜 RockAuto
- 故障诊断 — 通过症状描述找对应零件
- 智能提醒 — 低库存预警、超时订单、待处理投诉
- 批量操作 — 批量调价、批量入库、批量处理订单（需确认）
- 搜照片/视频 — Google/Bing 搜索实装照片，YouTube 搜索安装视频
- 版本查询 — 查询零件新老版本、变更详情、互换性判断
- 综合交叉查询 — 从 RockAuto/Cloyes/Gates/AutoZone/O'Reilly/NHTSA/OEM 原厂 7 个渠道查询对比
- 套装搜索 — 支持按套装号搜索装机图和安装视频

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + Tailwind CSS + shadcn/ui |
| 后端 | Next.js 16 (App Router) + API Routes |
| ORM | Prisma |
| 数据库 | SQLite（开发）/ PostgreSQL（生产） |
| AI | MiMo-v2-pro（Anthropic 兼容 API） |
| 外部数据 | RockAuto MCP Server |
| 图表 | Recharts |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
ANTHROPIC_API_KEY="your-api-key-here"
ANTHROPIC_BASE_URL="https://your-api-endpoint/anthropic"
DATABASE_URL="file:./dev.db"
```

### 3. 初始化数据库

```bash
npx prisma migrate dev
npx tsx prisma/seed.ts
```

### 4. 启动开发服务器

```bash
npm run dev
```

浏览器访问 http://localhost:3000

## 项目结构

```
├── prisma/
│   ├── schema.prisma          # 数据库 schema
│   ├── seed.ts                # 种子数据
│   └── migrations/            # 数据库迁移
├── scripts/
│   └── check-fttx-db.ts       # 数据库连接检查脚本
├── src/
│   ├── app/
│   │   ├── layout.tsx         # 根布局（侧边栏 + AI 对话窗）
│   │   ├── page.tsx           # 首页
│   │   ├── parts/             # 零件管理
│   │   ├── kits/              # 套装管理
│   │   ├── orders/            # 订单管理
│   │   ├── complaints/        # 投诉处理
│   │   ├── stock/             # 库存管理
│   │   ├── suppliers/         # 供应商管理
│   │   ├── stats/             # 数据统计
│   │   └── api/               # API 路由
│   ├── components/
│   │   ├── ui/                # 基础 UI 组件
│   │   ├── layout/            # 布局组件（侧边栏等）
│   │   ├── parts/             # 零件组件
│   │   ├── kits/              # 套装组件
│   │   ├── orders/            # 订单组件
│   │   ├── complaints/        # 投诉组件
│   │   ├── stock/             # 库存组件
│   │   ├── suppliers/         # 供应商组件
│   │   ├── stats/             # 统计图表组件
│   │   └── agent/             # AI 对话组件
│   ├── lib/
│   │   ├── db.ts              # Prisma 客户端
│   │   ├── utils.ts           # 工具函数
│   │   ├── part-utils.ts      # 零件数据解析
│   │   ├── rockauto.ts        # RockAuto MCP 客户端
│   │   └── agent/             # AI Agent 工具定义与执行器
│   └── types/
│       └── index.ts           # TypeScript 类型定义
└── docs/
    └── plans/                 # 设计文档
```

## 数据库设计

核心表：parts, kits, kit_items, suppliers, orders, order_items, complaints, stock_records, part_revisions

## 常用命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run db:migrate   # 运行数据库迁移
npm run db:seed      # 填充种子数据
npm run db:studio    # 打开 Prisma Studio（可视化管理数据库）
```

## License

MIT
