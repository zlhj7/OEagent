# OE Agent 零件管理系统 — 设计文档

> 日期: 2026-05-05
> 状态: 已批准

## 1. 项目概述

OE Agent 是一个面向公司内部员工的汽车零件管理系统，集成了 AI 对话式辅助功能。系统管理零件信息（型号、OE号、汽车适配信息、价格、供应商），支持从 RockAuto 外部数据源查询和导入零件数据，并包含订单管理、客户投诉处理、库存管理和数据统计等业务模块。

### 核心需求

- 零件信息的增删改查，支持按型号、OE号、车型多维度搜索
- 接入 RockAuto MCP 服务器获取外部零件数据
- 订单全流程管理（创建→发货→完成）
- 客户投诉登记、跟进、处理闭环
- 库存出入库管理及预警
- 销售数据统计与可视化
- AI 对话式 Agent 辅助查询和操作（写操作需人工确认）

## 2. 技术架构

### 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | React 19 + Tailwind CSS + shadcn/ui | UI 渲染与交互 |
| 后端 | Next.js 15 App Router + API Routes | 全栈框架 |
| ORM | Prisma | 数据库操作与迁移 |
| 数据库 | PostgreSQL | 数据持久化 |
| AI | @anthropic-ai/sdk (Claude API) | 自然语言理解与工具调用 |
| 外部数据 | RockAuto MCP Server (Python 子进程) | 零件查询与导入 |
| 图表 | Recharts | 数据可视化 |

### 架构图

```
用户浏览器
    ↓
Next.js 前端 (React)
    ↓
Next.js API Routes
    ├── REST API (CRUD) ──→ Prisma ──→ PostgreSQL
    └── /api/agent
            ↓
        Claude API (带 tools 定义)
            ├── 本地工具 → Prisma → PostgreSQL
            └── RockAuto 工具 → MCP 子进程 → RockAuto
```

### 环境变量

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/oe_agent"
ANTHROPIC_API_KEY="sk-ant-..."
```

## 3. 数据库设计

### 3.1 parts — 零件表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PK | 主键 |
| part_number | VARCHAR(100) | UNIQUE NOT NULL | 型号 |
| oe_number | VARCHAR(100) | | OE号 |
| name | VARCHAR(255) | NOT NULL | 零件名称 |
| description | TEXT | | 描述 |
| vehicle_brand | VARCHAR(100) | | 适用品牌 |
| vehicle_model | VARCHAR(100) | | 适用车型 |
| vehicle_year_start | INT | | 适用年份起 |
| vehicle_year_end | INT | | 适用年份止 |
| purchase_price | DECIMAL(10,2) | | 采购价 |
| sell_price | DECIMAL(10,2) | | 销售价 |
| supplier_id | INT | FK → suppliers | 供应商ID |
| stock_quantity | INT | DEFAULT 0 | 库存数量 |
| stock_warning | INT | DEFAULT 5 | 库存预警值 |
| source | VARCHAR(50) | | 数据来源 (rockauto/manual) |
| rockauto_url | TEXT | | RockAuto 原始链接 |
| created_at | TIMESTAMP | DEFAULT NOW | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW | 更新时间 |

### 3.2 suppliers — 供应商表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PK | 主键 |
| name | VARCHAR(255) | NOT NULL | 供应商名称 |
| contact | VARCHAR(100) | | 联系人 |
| phone | VARCHAR(50) | | 电话 |
| email | VARCHAR(100) | | 邮箱 |
| address | TEXT | | 地址 |
| notes | TEXT | | 备注 |

### 3.3 orders — 订单表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PK | 主键 |
| order_no | VARCHAR(50) | UNIQUE NOT NULL | 订单号 (自动生成) |
| customer_name | VARCHAR(255) | NOT NULL | 客户名称 |
| customer_contact | VARCHAR(100) | | 客户联系方式 |
| status | ENUM | DEFAULT 'pending' | pending/shipped/completed/cancelled |
| total_amount | DECIMAL(10,2) | | 订单总额 |
| notes | TEXT | | 备注 |
| created_at | TIMESTAMP | DEFAULT NOW | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW | 更新时间 |

### 3.4 order_items — 订单明细表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PK | 主键 |
| order_id | INT | FK → orders | 关联订单 |
| part_id | INT | FK → parts | 关联零件 |
| quantity | INT | NOT NULL | 数量 |
| unit_price | DECIMAL(10,2) | NOT NULL | 单价 |

### 3.5 complaints — 投诉表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PK | 主键 |
| complaint_no | VARCHAR(50) | UNIQUE NOT NULL | 投诉编号 |
| customer_name | VARCHAR(255) | NOT NULL | 客户名称 |
| order_id | INT | FK → orders (nullable) | 关联订单 |
| part_id | INT | FK → parts (nullable) | 关联零件 |
| content | TEXT | NOT NULL | 投诉内容 |
| status | ENUM | DEFAULT 'open' | open/processing/resolved/closed |
| priority | ENUM | DEFAULT 'medium' | low/medium/high/urgent |
| resolution | TEXT | | 处理结果 |
| satisfaction | INT | CHECK(1-5), nullable | 满意度 |
| created_at | TIMESTAMP | DEFAULT NOW | 创建时间 |
| resolved_at | TIMESTAMP | nullable | 解决时间 |

### 3.6 stock_records — 出入库记录表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PK | 主键 |
| part_id | INT | FK → parts | 关联零件 |
| type | ENUM | NOT NULL | in/out |
| quantity | INT | NOT NULL | 数量 |
| reason | VARCHAR(255) | | 原因 |
| operator | VARCHAR(100) | | 操作人 |
| created_at | TIMESTAMP | DEFAULT NOW | 操作时间 |

## 4. 前端页面设计

### 4.1 整体布局

侧边栏导航 + 顶部标题栏 + 主内容区 + AI 对话悬浮窗

```
┌──────────────────────────────────────────────────────┐
│  OE Agent 零件管理系统                          [搜索]│
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│  零件管理  │                                         │
│  订单管理  │         主内容区域                        │
│  投诉处理  │                                         │
│  库存管理  │                                         │
│  数据统计  │                                         │
│  供应商   │                                         │
│  ───────  │  ┌─────────────────────────────────────┐ │
│  AI 助手  │  │  💬 AI 对话窗口 (可展开/收起)         │ │
│          │  └─────────────────────────────────────┘ │
└──────────┴───────────────────────────────────────────┘
```

### 4.2 页面模块

#### 零件管理 (/parts)
- 零件列表：表格展示，支持分页、排序
- 多维搜索：按型号、OE号、品牌、车型、年份筛选
- 新增/编辑零件：表单弹窗
- 从 RockAuto 导入：搜索 RockAuto → 选择 → 导入本地

#### 订单管理 (/orders)
- 订单列表：按状态筛选（待发货/已发货/已完成/已取消）
- 创建订单：选择客户 → 添加零件（从零件库选择）→ 自动计算金额
- 订单详情：查看明细、修改状态
- 状态流转：pending → shipped → completed（或 cancelled）

#### 投诉处理 (/complaints)
- 投诉列表：按状态和优先级筛选
- 新建投诉：填写客户信息 → 可关联订单和零件
- 处理投诉：更新状态、填写处理结果、记录满意度
- 时间线视图：投诉从创建到解决的完整记录

#### 库存管理 (/stock)
- 库存总览：所有零件的当前库存
- 入库/出库操作：选零件 → 填数量和原因 → 提交
- 库存预警：低于预警值的零件高亮显示
- 出入库记录：按时间/零件筛选操作记录

#### 数据统计 (/stats)
- 热销零件 TOP10（柱状图）
- 月度订单趋势（折线图）
- 投诉状态分布（饼图）
- 库存概览卡片（总SKU数、低库存数、总价值）

#### 供应商管理 (/suppliers)
- 供应商列表
- 新增/编辑供应商
- 查看该供应商下的所有零件

## 5. AI Agent 设计

### 5.1 架构

用户通过对话框输入自然语言 → Next.js `/api/agent` 端点 → 调用 Claude API（带 tool definitions）→ Claude 选择工具执行 → 返回结果。

### 5.2 工具列表

#### 只读工具（直接返回结果）

| 工具名 | 参数 | 说明 |
|--------|------|------|
| search_parts | query, filters? | 按关键词搜索零件 |
| search_by_oe | oe_number | 按 OE 号精确/模糊查询 |
| get_part_detail | part_id | 获取零件详情含库存 |
| get_order | order_no or filters | 查询订单 |
| get_complaints | filters | 查询投诉列表 |
| get_stock_status | part_id or filters | 库存查询 |
| rockauto_search | make, year, model, category? | 调用 RockAuto 查询 |
| get_stats | type | 获取统计数据 |

#### 写操作工具（需用户确认）

| 工具名 | 参数 | 说明 |
|--------|------|------|
| create_order | customer, items[] | 创建订单 |
| update_order_status | order_id, status | 更新订单状态 |
| create_complaint | customer, content, order_id?, part_id? | 创建投诉 |
| update_complaint | complaint_id, status, resolution? | 更新投诉处理 |
| import_from_rockauto | rockauto_part_data | 从 RockAuto 导入零件 |
| stock_in_out | part_id, type, quantity, reason | 入库/出库 |

### 5.3 确认机制

写操作不直接执行，Agent 返回结构化的"操作预览"：

```json
{
  "type": "confirmation_required",
  "action": "create_order",
  "preview": {
    "customer": "张三",
    "items": [
      {"part": "Timing Chain Kit", "part_number": "TC-1234", "quantity": 2, "unit_price": 280.00}
    ],
    "total": 560.00
  }
}
```

前端弹出确认弹窗，用户确认后才执行实际操作。

## 6. 开发分阶段计划

### Phase 1: 项目初始化 + 零件管理
- 项目脚手架 (Next.js + TypeScript + Tailwind + shadcn/ui)
- Prisma schema + PostgreSQL 连接
- 零件 CRUD API + 页面
- 搜索功能 (型号/OE号/车型)

### Phase 2: 订单 + 投诉 + 库存
- 订单管理全流程
- 投诉处理模块
- 库存管理 + 出入库

### Phase 3: 供应商 + 统计
- 供应商管理
- 数据统计页面 (Recharts 图表)

### Phase 4: AI Agent 集成
- Claude API 端点 + Tool definitions
- 对话 UI 组件
- 确认弹窗机制
- 所有工具实现

### Phase 5: RockAuto 集成
- MCP 子进程管理
- 零件导入功能
- 外部数据搜索

## 7. 非功能需求

- 前后端类型共享 (TypeScript 类型从 Prisma schema 自动生成)
- 所有 API 端点有错误处理和输入验证
- 表格组件支持排序、分页、筛选
- 响应式布局，支持常见桌面分辨率
- 开发环境用 `next dev`，生产用 `next build && next start`
