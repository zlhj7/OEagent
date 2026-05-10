import type { Tool } from "@anthropic-ai/sdk/resources/messages";

// Claude API 工具定义 —— 完整版（本地 + RockAuto + 智能 + 批量）
export const agentTools: Tool[] = [
  // ═══════════════════════════════════════════════════
  // 本地数据查询（只读）
  // ═══════════════════════════════════════════════════
  {
    name: "search_parts",
    description: "搜索本地零件库，支持按型号、OE号、名称、车型关键词搜索",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_part_detail",
    description: "获取零件详细信息，包括价格、库存、供应商等",
    input_schema: {
      type: "object",
      properties: {
        part_id: { type: "number", description: "零件ID" },
      },
      required: ["part_id"],
    },
  },
  {
    name: "get_orders",
    description: "查询订单列表，可按状态或客户名筛选",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "按状态筛选: PENDING, SHIPPED, COMPLETED, CANCELLED" },
        customer_name: { type: "string", description: "按客户名搜索" },
      },
    },
  },
  {
    name: "get_complaints",
    description: "查询投诉列表，可按状态筛选",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "按状态筛选: OPEN, PROCESSING, RESOLVED, CLOSED" },
      },
    },
  },
  {
    name: "get_stock_status",
    description: "查询库存状态，可只看低库存预警",
    input_schema: {
      type: "object",
      properties: {
        warning_only: { type: "boolean", description: "是否只看低库存预警" },
      },
    },
  },
  {
    name: "get_stats",
    description: "获取系统统计数据，包括总零件数、订单数、热销零件等",
    input_schema: {
      type: "object",
      properties: {},
    },
  },

  // ═══════════════════════════════════════════════════
  // RockAuto 外部数据查询
  // ═══════════════════════════════════════════════════
  {
    name: "rockauto_search_by_number",
    description: "通过OE号或零件号在 RockAuto 外部数据库中搜索，找到对应的售后替代件和价格。当本地零件库查不到时使用。",
    input_schema: {
      type: "object",
      properties: {
        part_number: { type: "string", description: "OE号或零件号，如 13503-75020" },
      },
      required: ["part_number"],
    },
  },
  {
    name: "rockauto_search_by_vehicle",
    description: "按车型在 RockAuto 搜索正时系统等零件。需要品牌、年份、车型。",
    input_schema: {
      type: "object",
      properties: {
        make: { type: "string", description: "品牌，如 Ford, Toyota, Honda" },
        year: { type: "number", description: "年份，如 2015" },
        model: { type: "string", description: "车型，如 F-150, Camry" },
        category: { type: "string", description: "零件分类路径，如 Engine>Timing Belt & Chain" },
      },
      required: ["make", "year", "model"],
    },
  },
  {
    name: "rockauto_search_by_symptom",
    description: "通过故障症状在 RockAuto 搜索相关零件。例如 'cold start rattle', 'timing chain noise'",
    input_schema: {
      type: "object",
      properties: {
        symptom: { type: "string", description: "故障描述或症状" },
      },
      required: ["symptom"],
    },
  },
  {
    name: "rockauto_import_part",
    description: "将 RockAuto 搜索到的零件导入本地数据库（需要确认）",
    input_schema: {
      type: "object",
      properties: {
        part_number: { type: "string" },
        oe_number: { type: "string" },
        name: { type: "string" },
        vehicle_brand: { type: "string" },
        vehicle_model: { type: "string" },
        price: { type: "number" },
        rockauto_url: { type: "string" },
      },
      required: ["part_number", "name"],
    },
  },

  // ═══════════════════════════════════════════════════
  // 智能助手能力
  // ═══════════════════════════════════════════════════
  {
    name: "get_smart_alerts",
    description: "获取智能提醒：低库存预警、长期未处理投诉、待发货超时订单、热销缺货风险等",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_recommendations",
    description: "获取智能推荐：基于销售数据推荐补货建议、基于投诉模式推荐质量检查等",
    input_schema: {
      type: "object",
      properties: {},
    },
  },

  // ═══════════════════════════════════════════════════
  // 套装查询
  // ═══════════════════════════════════════════════════
  {
    name: "search_kits",
    description: "搜索套装（成套配件）。按套装号、OE号、名称或车型搜索。返回套装信息及内含配件列表。",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词，如套装号 9-0753S、OE号、车型等" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_kit_detail",
    description: "获取套装详细信息，包括内含所有配件、角色、数量、库存状态等",
    input_schema: {
      type: "object",
      properties: {
        kit_id: { type: "number", description: "套装ID" },
      },
      required: ["kit_id"],
    },
  },

  // ═══════════════════════════════════════════════════
  // 互联网搜索
  // ═══════════════════════════════════════════════════
  {
    name: "search_part_photos",
    description: "在互联网上搜索零件的实装照片。支持按型号、OE号、套装型号、车型组合搜索，提供车型和OE号能大幅提高搜索精准度。也可传入 kit_number 搜索套装的整体安装照片。",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词，如型号或零件名称" },
        oe_number: { type: "string", description: "OE号，如 13503-75020，用于精准搜索" },
        kit_number: { type: "string", description: "套装型号，如 9-0753S，搜索套装整体安装照片" },
        make: { type: "string", description: "品牌，如 Toyota" },
        model: { type: "string", description: "车型，如 Camry" },
        part_name: { type: "string", description: "零件名称，如 timing chain" },
      },
      required: [],
    },
  },
  {
    name: "search_installation_videos",
    description: "在YouTube上搜索零件的安装教程视频。支持按型号、OE号、套装型号、车型组合搜索。也可传入 kit_number 搜索套装的更换安装视频。",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词，如型号或零件名称" },
        oe_number: { type: "string", description: "OE号，如 13503-75020，用于精准搜索" },
        kit_number: { type: "string", description: "套装型号，如 9-0753S，搜索套装更换安装视频" },
        make: { type: "string", description: "品牌，如 Toyota" },
        model: { type: "string", description: "车型，如 Camry" },
        part_name: { type: "string", description: "零件名称，如 timing chain" },
      },
      required: [],
    },
  },

  // ═══════════════════════════════════════════════════
  // 版本管理
  // ═══════════════════════════════════════════════════
  {
    name: "get_part_revisions",
    description: '查询零件的完整版本历史信息，包括新老版本号、变更说明、OE号交叉引用、适配年份、互换性、供应商报价。用户问"这个型号有没有新老版本"或"这个型号有什么变化"时使用。',
    input_schema: {
      type: "object",
      properties: {
        part_number: { type: "string", description: "零件型号，如 TC-KIT-V6" },
      },
      required: ["part_number"],
    },
  },
  {
    name: "cross_reference_part",
    description: '综合交叉查询工具：输入任意型号或OE号，自动从 RockAuto、Cloyes、Gates、AutoZone、O\'Reilly、NHTSA、OEM原厂等7个渠道查询，汇总对比后给出结论。适用于：查询任意零件信息、验证版本准确性、找替代件、查价格对比。对所有型号都有效，不限于本地数据库。',
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "零件型号或OE号，任意输入都可" },
        make: { type: "string", description: "品牌（可选），如 Toyota, Ford" },
        model: { type: "string", description: "车型（可选），如 Camry, F-150" },
        year: { type: "number", description: "年份（可选），如 2015" },
      },
      required: ["query"],
    },
  },

  // ═══════════════════════════════════════════════════
  // 写操作（需确认）
  // ═══════════════════════════════════════════════════
  {
    name: "create_order",
    description: "创建新订单（需要用户确认）",
    input_schema: {
      type: "object",
      properties: {
        customer_name: { type: "string" },
        customer_contact: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              part_id: { type: "number" },
              quantity: { type: "number" },
              unit_price: { type: "number" },
            },
          },
        },
        notes: { type: "string" },
      },
      required: ["customer_name", "items"],
    },
  },
  {
    name: "update_order_status",
    description: "更新订单状态（需要确认）：pending→shipped→completed 或 cancel",
    input_schema: {
      type: "object",
      properties: {
        order_id: { type: "number" },
        new_status: { type: "string", description: "PENDING/SHIPPED/COMPLETED/CANCELLED" },
      },
      required: ["order_id", "new_status"],
    },
  },
  {
    name: "update_complaint",
    description: "更新投诉状态或处理结果（需要确认）",
    input_schema: {
      type: "object",
      properties: {
        complaint_id: { type: "number" },
        status: { type: "string" },
        resolution: { type: "string" },
        satisfaction: { type: "number", description: "满意度 1-5" },
      },
      required: ["complaint_id"],
    },
  },
  {
    name: "stock_operation",
    description: "执行入库或出库操作（需要确认）",
    input_schema: {
      type: "object",
      properties: {
        part_id: { type: "number" },
        operation_type: { type: "string", description: "IN 或 OUT" },
        quantity: { type: "number" },
        reason: { type: "string" },
        operator: { type: "string" },
      },
      required: ["part_id", "operation_type", "quantity"],
    },
  },

  // ═══════════════════════════════════════════════════
  // 批量操作（需确认）
  // ═══════════════════════════════════════════════════
  {
    name: "batch_update_prices",
    description: "批量更新零件价格（需要确认）。可按品牌或供应商批量调价。",
    input_schema: {
      type: "object",
      properties: {
        filter_brand: { type: "string", description: "按品牌筛选" },
        filter_supplier_id: { type: "number", description: "按供应商筛选" },
        price_adjustment: { type: "number", description: "价格调整幅度，如 0.1 表示涨价10%，-0.05 表示降价5%" },
        adjustment_type: { type: "string", description: "percent(百分比) 或 fixed(固定金额)" },
      },
      required: ["price_adjustment", "adjustment_type"],
    },
  },
  {
    name: "batch_stock_in",
    description: "批量入库操作（需要确认）。一次为多个零件入库。",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              part_id: { type: "number" },
              quantity: { type: "number" },
            },
          },
        },
        reason: { type: "string" },
        operator: { type: "string" },
      },
      required: ["items"],
    },
  },
  {
    name: "batch_process_orders",
    description: "批量更新订单状态（需要确认）。如将所有已发货超7天的订单标记为完成。",
    input_schema: {
      type: "object",
      properties: {
        filter_status: { type: "string", description: "筛选当前状态" },
        new_status: { type: "string", description: "要更新到的状态" },
        order_ids: { type: "array", items: { type: "number" }, description: "指定订单ID列表（可选）" },
      },
      required: ["filter_status", "new_status"],
    },
  },
];
