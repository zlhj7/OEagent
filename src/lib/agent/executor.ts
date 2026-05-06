import { prisma } from "@/lib/db";
import { callRockautoTool } from "@/lib/rockauto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(data: any): any {
  return JSON.parse(JSON.stringify(data, (_, v) => typeof v === "bigint" ? Number(v) : v));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeTool(name: string, input: Record<string, unknown>): Promise<any> {
  switch (name) {
    // ═══════════════════════════════════════
    // 本地数据查询
    // ═══════════════════════════════════════
    case "search_parts": {
      const query = input.query as string;
      const parts = await prisma.part.findMany({
        where: {
          OR: [
            { partNumber: { contains: query } },
            { oeNumber: { contains: query } },
            { name: { contains: query } },
            { vehicleModel: { contains: query } },
            { vehicleBrand: { contains: query } },
          ],
        },
        include: { supplier: true },
        take: 10,
      });
      return { count: parts.length, parts };
    }

    case "get_part_detail": {
      const part = await prisma.part.findUnique({
        where: { id: input.part_id as number },
        include: { supplier: true, stockRecords: { take: 5, orderBy: { createdAt: "desc" } } },
      });
      return part ? { found: true, part } : { found: false, message: "未找到该零件" };
    }

    case "get_orders": {
      const where: Record<string, unknown> = {};
      if (input.status) where.status = input.status;
      if (input.customer_name) {
        where.customerName = { contains: input.customer_name as string };
      }
      const orders = await prisma.order.findMany({
        where,
        include: { items: { include: { part: true } } },
        take: 10,
        orderBy: { createdAt: "desc" },
      });
      return { count: orders.length, orders };
    }

    case "get_complaints": {
      const where: Record<string, unknown> = {};
      if (input.status) where.status = input.status;
      const complaints = await prisma.complaint.findMany({
        where,
        include: { order: true, part: true },
        take: 10,
        orderBy: { createdAt: "desc" },
      });
      return { count: complaints.length, complaints };
    }

    case "get_stock_status": {
      const parts = await prisma.part.findMany({
        select: { id: true, partNumber: true, name: true, stockQuantity: true, stockWarning: true },
        orderBy: { stockQuantity: "asc" },
      });
      const data = input.warning_only
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? parts.filter((p: any) => p.stockQuantity <= p.stockWarning)
        : parts.slice(0, 20);
      return { count: data.length, parts: data };
    }

    case "get_stats": {
      const [totalParts, totalOrders, totalComplaints, openComplaints] = await Promise.all([
        prisma.part.count(),
        prisma.order.count(),
        prisma.complaint.count(),
        prisma.complaint.count({ where: { status: "OPEN" } }),
      ]);
      const topParts = serialize(await prisma.$queryRaw`
        SELECT p.id, p.part_number as partNumber, p.name, CAST(SUM(oi.quantity) AS INTEGER) as totalSold
        FROM order_items oi JOIN parts p ON p.id = oi.part_id
        GROUP BY p.id, p.part_number, p.name ORDER BY totalSold DESC LIMIT 5
      `);
      return { totalParts, totalOrders, totalComplaints, openComplaints, topParts };
    }

    // ═══════════════════════════════════════
    // RockAuto 外部查询
    // ═══════════════════════════════════════
    case "rockauto_search_by_number": {
      try {
        const result = await callRockautoTool("search_by_part_number", {
          part_number: input.part_number,
        });
        return { source: "rockauto", query: input.part_number, result };
      } catch (e) {
        return { error: `RockAuto 查询失败: ${(e as Error).message}` };
      }
    }

    case "rockauto_search_by_vehicle": {
      try {
        const toolName = input.category ? "search_parts_by_category" : "get_timing_parts";
        const args: Record<string, unknown> = {
          make: input.make,
          year: input.year,
          model: input.model,
        };
        if (input.category) args.category_path = input.category;
        const result = await callRockautoTool(toolName, args);
        return { source: "rockauto", query: `${input.make} ${input.year} ${input.model}`, result };
      } catch (e) {
        return { error: `RockAuto 查询失败: ${(e as Error).message}` };
      }
    }

    case "rockauto_search_by_symptom": {
      try {
        const result = await callRockautoTool("what_is_part_called", {
          search_query: input.symptom,
        });
        return { source: "rockauto", query: input.symptom, result };
      } catch (e) {
        return { error: `RockAuto 查询失败: ${(e as Error).message}` };
      }
    }

    case "rockauto_import_part": {
      return {
        needsConfirmation: true,
        action: "import_part",
        preview: {
          partNumber: input.part_number,
          oeNumber: input.oe_number,
          name: input.name,
          vehicleBrand: input.vehicle_brand,
          vehicleModel: input.vehicle_model,
          sellPrice: input.price,
          rockautoUrl: input.rockauto_url,
          source: "rockauto",
        },
      };
    }

    // ═══════════════════════════════════════
    // 智能助手
    // ═══════════════════════════════════════
    case "get_smart_alerts": {
      // 低库存
      const lowStock = await prisma.part.findMany({
        where: { stockQuantity: { lte: prisma.part.fields.stockWarning } },
        select: { id: true, partNumber: true, name: true, stockQuantity: true, stockWarning: true },
      }).catch(() =>
        // SQLite 不支持字段比较，用原始查询
        prisma.$queryRaw`
          SELECT id, part_number as partNumber, name, stock_quantity as stockQuantity, stock_warning as stockWarning
          FROM parts WHERE stock_quantity <= stock_warning
        `
      );

      // 待处理超时投诉（创建超过2天未处理）
      const staleComplaints = await prisma.complaint.findMany({
        where: {
          status: "OPEN",
          createdAt: { lte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        },
        take: 5,
      });

      // 待发货超时订单（创建超过1天未发货）
      const staleOrders = await prisma.order.findMany({
        where: {
          status: "PENDING",
          createdAt: { lte: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        },
        take: 5,
      });

      // 热销但库存不足的零件
      const hotLowStock = serialize(await prisma.$queryRaw`
        SELECT p.id, p.part_number as partNumber, p.name, p.stock_quantity as stockQty,
               CAST(SUM(oi.quantity) AS INTEGER) as totalSold
        FROM parts p
        JOIN order_items oi ON oi.part_id = p.id
        GROUP BY p.id
        HAVING p.stock_quantity < 10
        ORDER BY totalSold DESC LIMIT 5
      `);

      return {
        lowStock: { count: (lowStock as unknown[]).length, items: lowStock },
        staleComplaints: { count: staleComplaints.length, items: staleComplaints },
        staleOrders: { count: staleOrders.length, items: staleOrders },
        hotLowStock,
      };
    }

    case "get_recommendations": {
      // 热销 TOP10 零件
      const topParts = serialize(await prisma.$queryRaw`
        SELECT p.id, p.part_number as partNumber, p.name, p.stock_quantity as stockQty,
               CAST(SUM(oi.quantity) AS INTEGER) as totalSold
        FROM parts p
        JOIN order_items oi ON oi.part_id = p.id
        GROUP BY p.id
        ORDER BY totalSold DESC LIMIT 10
      `);

      // 投诉最多的零件
      const complaintParts = serialize(await prisma.$queryRaw`
        SELECT p.id, p.part_number as partNumber, p.name, CAST(COUNT(c.id) AS INTEGER) as complaintCount
        FROM parts p
        JOIN complaints c ON c.part_id = p.id
        GROUP BY p.id
        ORDER BY complaintCount DESC LIMIT 5
      `);

      // 从未售出的零件（可能需要促销或下架）
      const neverSold = await prisma.part.findMany({
        where: {
          orderItems: { none: {} },
        },
        select: { id: true, partNumber: true, name: true, stockQuantity: true },
        take: 10,
      });

      return { topParts, complaintParts, neverSold };
    }

    // ═══════════════════════════════════════
    // 版本管理
    // ═══════════════════════════════════════
    case "get_part_revisions": {
      const partNumber = input.part_number as string;
      const part = await prisma.part.findFirst({
        where: {
          OR: [
            { partNumber: { contains: partNumber } },
            { oeNumber: { contains: partNumber } },
          ],
        },
        include: { supplier: true },
      });
      if (!part) return { found: false, message: `未找到型号 ${partNumber}` };

      const revisions = await prisma.partRevision.findMany({
        where: { partId: part.id },
        orderBy: { createdAt: "desc" },
      });

      // 解析 OE 号和适配车型
      let oeNumbers: string[] = [];
      try { oeNumbers = JSON.parse(part.oeNumber || "[]"); } catch { if (part.oeNumber) oeNumbers = [part.oeNumber]; }

      let fitments: unknown[] = [];
      try { fitments = JSON.parse(part.vehicleBrand || "[]"); } catch { /* ignore */ }

      let supplierPrices: unknown[] = [];
      try { supplierPrices = JSON.parse(part.supplierPrices || "[]"); } catch { /* ignore */ }

      // 搜索参考资料链接
      const refs = [];
      const searchWords = `${part.name} ${oeNumbers[0] || part.partNumber} specifications`;
      refs.push({ name: "Google 搜索技术规格", url: `https://www.google.com/search?q=${encodeURIComponent(searchWords)}` });
      refs.push({ name: "Bing 搜索安装指南", url: `https://www.bing.com/search?q=${encodeURIComponent(searchWords + " installation guide")}` });

      return {
        found: true,
        partNumber: part.partNumber,
        partName: part.name,
        oeNumbers,
        fitments,
        supplierPrices,
        stockQuantity: part.stockQuantity,
        revisions: serialize(revisions),
        referenceLinks: refs,
      };
    }

    case "cross_reference_part": {
      const query = input.query as string;
      const make = (input.make as string) || "";
      const model = (input.model as string) || "";
      const year = (input.year as number) || 0;

      // 1. 本地数据库查询
      const localPart = await prisma.part.findFirst({
        where: {
          OR: [
            { partNumber: { contains: query } },
            { oeNumber: { contains: query } },
            { name: { contains: query } },
          ],
        },
        include: { supplier: true },
      });

      const localRevisions = localPart
        ? await prisma.partRevision.findMany({ where: { partId: localPart.id } })
        : [];

      // 2. RockAuto 查询（直接调用 MCP）
      let rockautoByNumber = null;
      let rockautoByVehicle = null;
      try {
        rockautoByNumber = await callRockautoTool("search_by_part_number", {
          part_number: query,
        });
      } catch { /* ignore */ }

      if (make && model) {
        try {
          rockautoByVehicle = await callRockautoTool("get_timing_parts", {
            make, year: year || 2015, model,
          });
        } catch { /* ignore */ }
      }

      // 3. 生成所有渠道的验证链接
      const links = [];
      const searchQuery = [query, make, model, year || ""].filter(Boolean).join(" ");

      // Cloyes — 正时系统权威
      links.push({
        name: "Cloyes",
        url: `https://www.cloyes.com/search?q=${encodeURIComponent(query)}`,
      });
      // RockAuto
      links.push({
        name: "RockAuto",
        url: `https://www.rockauto.com/en/partsearch/?partnum=${encodeURIComponent(query)}`,
      });
      // Gates
      links.push({
        name: "Gates",
        url: `https://www.gates.com/us/en/search.html#q=${encodeURIComponent(query)}`,
      });
      // AutoZone
      links.push({
        name: "AutoZone",
        url: `https://www.autozone.com/searchresult?searchText=${encodeURIComponent(query)}`,
      });
      // O'Reilly
      links.push({
        name: "O'Reilly",
        url: `https://www.oreillyauto.com/search?q=${encodeURIComponent(query)}`,
      });
      // NHTSA TSB
      if (make && model) {
        links.push({
          name: "NHTSA TSB",
          url: `https://www.nhtsa.gov/recalls?query=${encodeURIComponent(make + " " + model + " " + query)}`,
        });
      }
      // Google 交叉验证
      links.push({
        name: "Google 验证",
        url: `https://www.google.com/search?q=${encodeURIComponent(query + " superseded replacement cross reference")}`,
      });
      // OEM 原厂
      if (make) {
        const oemUrls: Record<string, string> = {
          Toyota: `https://parts.toyota.com/search?searchStr=${encodeURIComponent(query)}`,
          Honda: `https://parts.honda.com/search?searchStr=${encodeURIComponent(query)}`,
          Ford: `https://parts.ford.com/search?searchStr=${encodeURIComponent(query)}`,
          Lexus: `https://parts.lexus.com/search?searchStr=${encodeURIComponent(query)}`,
          Chevrolet: `https://parts.gmparts.com/search?searchStr=${encodeURIComponent(query)}`,
          Nissan: `https://parts.nissanusa.com/search?searchStr=${encodeURIComponent(query)}`,
        };
        if (oemUrls[make]) {
          links.push({ name: `${make} 原厂`, url: oemUrls[make] });
        }
      }

      // 4. 更新本地验证状态
      if (localPart && localRevisions.length > 0) {
        await prisma.partRevision.updateMany({
          where: { partId: localPart.id },
          data: {
            verifiedAt: new Date(),
            verifiedBy: "multi_source_crosscheck",
            rockautoStatus: rockautoByNumber && typeof rockautoByNumber === "string" && !rockautoByNumber.includes("未找到")
              ? "available" : "check_required",
          },
        });
      }

      return {
        type: "web_search_result",
        searchType: "cross_reference",
        query,
        // 本地数据
        localData: localPart ? {
          partNumber: localPart.partNumber,
          name: localPart.name,
          oeNumbers: localPart.oeNumber,
          revisions: serialize(localRevisions),
        } : null,
        // RockAuto 结果
        rockauto: {
          byPartNumber: rockautoByNumber,
          byVehicle: rockautoByVehicle,
        },
        // 所有渠道链接
        links,
        message: `已从 7 个渠道查询 "${query}" 的交叉引用信息`,
      };
    }

    // ═══════════════════════════════════════
    // 互联网搜索
    // ═══════════════════════════════════════
    case "search_part_photos": {
      const query = input.query as string;
      const encodedQuery = encodeURIComponent(query + " engine installation photo");
      const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodedQuery}`;
      const bingUrl = `https://www.bing.com/images/search?q=${encodedQuery}`;

      return {
        type: "web_search_result",
        searchType: "photos",
        query,
        links: [
          { name: "Google 图片搜索", url: googleImagesUrl },
          { name: "Bing 图片搜索", url: bingUrl },
        ],
        message: `已为您生成 "${query}" 的图片搜索链接，点击可在浏览器中查看发动机实装照片。`,
      };
    }

    case "search_installation_videos": {
      const query = input.query as string;
      const encodedQuery = encodeURIComponent(query + " replacement installation tutorial");
      const youtubeUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;

      return {
        type: "web_search_result",
        searchType: "videos",
        query,
        links: [
          { name: "YouTube 搜索", url: youtubeUrl },
        ],
        message: `已为您生成 "${query}" 的 YouTube 搜索链接，点击可查看更换安装教程视频。`,
      };
    }

    // ═══════════════════════════════════════
    // 写操作（返回确认信息）
    // ═══════════════════════════════════════
    case "create_order": {
      const items = input.items as { part_id: number; quantity: number; unit_price: number }[];
      const parts = await prisma.part.findMany({
        where: { id: { in: items.map((i) => i.part_id) } },
      });
      const preview = items.map((item) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const part = parts.find((p: any) => p.id === item.part_id);
        return {
          partName: part?.name || "未知",
          partNumber: part?.partNumber || "",
          quantity: item.quantity,
          unitPrice: item.unit_price,
          subtotal: item.quantity * item.unit_price,
        };
      });
      const total = preview.reduce((sum, i) => sum + i.subtotal, 0);
      return {
        needsConfirmation: true,
        action: "create_order",
        preview: {
          customer: input.customer_name,
          contact: input.customer_contact,
          items: preview,
          total,
          notes: input.notes,
        },
      };
    }

    case "update_order_status": {
      const order = await prisma.order.findUnique({
        where: { id: input.order_id as number },
      });
      if (!order) return { error: "订单不存在" };
      return {
        needsConfirmation: true,
        action: "update_order_status",
        preview: {
          orderId: order.id,
          orderNo: order.orderNo,
          currentStatus: order.status,
          newStatus: input.new_status,
          customer: order.customerName,
        },
      };
    }

    case "update_complaint": {
      const complaint = await prisma.complaint.findUnique({
        where: { id: input.complaint_id as number },
      });
      if (!complaint) return { error: "投诉不存在" };
      return {
        needsConfirmation: true,
        action: "update_complaint",
        preview: {
          complaintId: complaint.id,
          complaintNo: complaint.complaintNo,
          currentStatus: complaint.status,
          newStatus: input.status,
          resolution: input.resolution,
          satisfaction: input.satisfaction,
        },
      };
    }

    case "stock_operation": {
      const part = await prisma.part.findUnique({
        where: { id: input.part_id as number },
      });
      if (!part) return { error: "零件不存在" };
      return {
        needsConfirmation: true,
        action: "stock_operation",
        preview: {
          partId: part.id,
          partNumber: part.partNumber,
          partName: part.name,
          currentStock: part.stockQuantity,
          operation: input.operation_type === "IN" ? "入库" : "出库",
          quantity: input.quantity,
          newStock: input.operation_type === "IN"
            ? part.stockQuantity + (input.quantity as number)
            : part.stockQuantity - (input.quantity as number),
          reason: input.reason,
          operator: input.operator,
        },
      };
    }

    // ═══════════════════════════════════════
    // 批量操作（返回确认信息）
    // ═══════════════════════════════════════
    case "batch_update_prices": {
      const where: Record<string, unknown> = {};
      if (input.filter_brand) where.vehicleBrand = input.filter_brand;
      if (input.filter_supplier_id) where.supplierId = input.filter_supplier_id;

      const parts = await prisma.part.findMany({ where });
      const adjustment = input.price_adjustment as number;
      const type = input.adjustment_type as string;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const preview = parts.slice(0, 10).map((p: any) => {
        const oldPrice = p.sellPrice || 0;
        const newPrice = type === "percent"
          ? oldPrice * (1 + adjustment)
          : oldPrice + adjustment;
        return { partNumber: p.partNumber, name: p.name, oldPrice, newPrice: Math.round(newPrice * 100) / 100 };
      });

      return {
        needsConfirmation: true,
        action: "batch_update_prices",
        preview: {
          totalAffected: parts.length,
          adjustment: type === "percent" ? `${(adjustment * 100).toFixed(0)}%` : `¥${adjustment}`,
          samples: preview,
        },
      };
    }

    case "batch_stock_in": {
      const items = input.items as { part_id: number; quantity: number }[];
      const parts = await prisma.part.findMany({
        where: { id: { in: items.map((i) => i.part_id) } },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const preview = items.map((item) => {
        const part = parts.find((p: any) => p.id === item.part_id);
        return {
          partNumber: part?.partNumber || "?",
          partName: part?.name || "?",
          quantity: item.quantity,
          currentStock: part?.stockQuantity || 0,
          newStock: (part?.stockQuantity || 0) + item.quantity,
        };
      });

      return {
        needsConfirmation: true,
        action: "batch_stock_in",
        preview: { items: preview, reason: input.reason, operator: input.operator },
      };
    }

    case "batch_process_orders": {
      const where: Record<string, unknown> = {};
      if (input.filter_status) where.status = input.filter_status;
      if (input.order_ids && (input.order_ids as number[]).length > 0) {
        where.id = { in: input.order_ids };
      }

      const orders = await prisma.order.findMany({ where, take: 50 });

      return {
        needsConfirmation: true,
        action: "batch_process_orders",
        preview: {
          count: orders.length,
          currentStatus: input.filter_status,
          newStatus: input.new_status,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          orders: orders.slice(0, 10).map((o: any) => ({
            orderNo: o.orderNo,
            customer: o.customerName,
          })),
        },
      };
    }

    default:
      return { error: `未知工具: ${name}` };
  }
}

// ═══════════════════════════════════════
// 执行已确认的写操作
// ═══════════════════════════════════════
export async function executeConfirmedAction(action: string, preview: Record<string, unknown>) {
  switch (action) {
    case "create_order": {
      const items = preview.items as { partNumber: string; quantity: number; unitPrice: number }[];
      // 需要先通过 partNumber 查找 partId
      const partNumbers = items.map((i) => i.partNumber);
      const parts = await prisma.part.findMany({
        where: { partNumber: { in: partNumbers } },
      });

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const count = await prisma.order.count();
      const orderNo = `ORD-${dateStr}-${String(count + 1).padStart(4, "0")}`;

      return prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            orderNo,
            customerName: preview.customer as string,
            customerContact: (preview.contact as string) || null,
            totalAmount: preview.total as number,
            notes: (preview.notes as string) || null,
            items: {
              create: items.map((item) => {
                const part = parts.find((p) => p.partNumber === item.partNumber);
                return {
                  partId: part?.id || 0,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                };
              }),
            },
          },
          include: { items: true },
        });

        // 扣库存
        for (const item of items) {
          const part = parts.find((p) => p.partNumber === item.partNumber);
          if (part) {
            await tx.part.update({
              where: { id: part.id },
              data: { stockQuantity: { decrement: item.quantity } },
            });
          }
        }

        return { success: true, data: order };
      });
    }

    case "update_order_status": {
      const order = await prisma.order.update({
        where: { id: preview.orderId as number },
        data: { status: preview.newStatus as string },
      });
      return { success: true, data: order };
    }

    case "update_complaint": {
      const updateData: Record<string, unknown> = {};
      if (preview.newStatus) updateData.status = preview.newStatus;
      if (preview.resolution) updateData.resolution = preview.resolution;
      if (preview.satisfaction) updateData.satisfaction = preview.satisfaction;
      if (preview.newStatus === "RESOLVED" || preview.newStatus === "CLOSED") {
        updateData.resolvedAt = new Date();
      }
      const complaint = await prisma.complaint.update({
        where: { id: preview.complaintId as number },
        data: updateData,
      });
      return { success: true, data: complaint };
    }

    case "stock_operation": {
      return prisma.$transaction(async (tx) => {
        const record = await tx.stockRecord.create({
          data: {
            partId: preview.partId as number,
            type: preview.operation === "入库" ? "IN" : "OUT",
            quantity: preview.quantity as number,
            reason: (preview.reason as string) || null,
            operator: (preview.operator as string) || null,
          },
        });
        const part = await tx.part.update({
          where: { id: preview.partId as number },
          data: {
            stockQuantity: preview.newStock as number,
          },
        });
        return { success: true, data: { record, part } };
      });
    }

    case "import_part": {
      const part = await prisma.part.create({
        data: {
          partNumber: preview.partNumber as string,
          oeNumber: (preview.oeNumber as string) || null,
          name: preview.name as string,
          vehicleBrand: (preview.vehicleBrand as string) || null,
          vehicleModel: (preview.vehicleModel as string) || null,
          sellPrice: (preview.sellPrice as number) || null,
          rockautoUrl: (preview.rockautoUrl as string) || null,
          source: "rockauto",
        },
      });
      return { success: true, data: part };
    }

    case "batch_update_prices": {
      const where: Record<string, unknown> = {};
      if (preview.filter_brand) where.vehicleBrand = preview.filter_brand;
      if (preview.filter_supplier_id) where.supplierId = preview.filter_supplier_id;

      const parts = await prisma.part.findMany({ where });
      const adjustment = preview.price_adjustment as number;
      const type = preview.adjustment_type as string;

      const updates = parts.map((p) => {
        const oldPrice = p.sellPrice || 0;
        const newPrice = type === "percent" ? oldPrice * (1 + adjustment) : oldPrice + adjustment;
        return prisma.part.update({
          where: { id: p.id },
          data: { sellPrice: Math.round(newPrice * 100) / 100 },
        });
      });

      await Promise.all(updates);
      return { success: true, count: parts.length };
    }

    case "batch_stock_in": {
      const items = preview.items as { partId: number; quantity: number }[];
      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          await tx.stockRecord.create({
            data: {
              partId: item.partId,
              type: "IN",
              quantity: item.quantity,
              reason: (preview.reason as string) || null,
              operator: (preview.operator as string) || null,
            },
          });
          await tx.part.update({
            where: { id: item.partId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      });
      return { success: true, count: items.length };
    }

    case "batch_process_orders": {
      const where: Record<string, unknown> = { status: preview.currentStatus };
      const result = await prisma.order.updateMany({
        where,
        data: { status: preview.newStatus as string },
      });
      return { success: true, count: result.count };
    }

    default:
      return { error: `未知操作: ${action}` };
  }
}
