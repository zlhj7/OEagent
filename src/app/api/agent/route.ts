import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { agentTools } from "@/lib/agent/tools";
import { executeTool, executeConfirmedAction } from "@/lib/agent/executor";
import { jsonResponse } from "@/lib/utils";

// BigInt 安全的 JSON.stringify
function safeStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? Number(v) : v));
}

const MIMO_API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY;

const anthropic = new Anthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL || "https://token-plan-cn.xiaomimimo.com/anthropic",
  apiKey: MIMO_API_KEY,
});

// 页面上下文映射
const PAGE_CONTEXT_MAP: Record<string, string> = {
  "/parts": "用户当前在「零件管理」页面，正在浏览零件列表。可以帮用户搜索零件、查看详情、从 RockAuto 导入。",
  "/orders": "用户当前在「订单管理」页面，正在查看订单。可以帮用户查询订单、创建新订单、更新订单状态。",
  "/complaints": "用户当前在「投诉处理」页面，正在处理客户投诉。可以帮用户查询投诉、更新处理进度。",
  "/stock": "用户当前在「库存管理」页面，正在管理库存。可以帮用户查看库存、执行入库出库、查看预警。",
  "/stats": "用户当前在「数据统计」页面，正在查看业务数据。可以帮用户解读数据、给出建议。",
  "/suppliers": "用户当前在「供应商管理」页面，正在管理供应商信息。",
};

function buildSystemPrompt(currentPage?: string): string {
  let prompt = `你是 OE Agent，一个汽车零件管理系统的全能 AI 助手。

## 你的能力：
1. **零件查询** — 搜索本地零件库（型号、OE号、车型），查看详细信息
2. **RockAuto 外部搜索** — 当本地找不到时，搜索 RockAuto 外部数据库，找到售后替代件和价格
3. **故障诊断** — 通过症状描述（如 "冷启动异响"）找到对应零件
4. **订单管理** — 查询订单、创建订单、更新订单状态
5. **投诉处理** — 查询投诉、更新处理结果和满意度
6. **库存管理** — 查看库存状态、执行入库出库
7. **智能提醒** — 检查低库存预警、超时订单、待处理投诉
8. **批量操作** — 批量调价、批量入库、批量处理订单
9. **数据导入** — 从 RockAuto 搜索结果导入零件到本地数据库
10. **搜实装照片** — 在互联网上搜索零件在发动机上的实际安装照片。调用 search_part_photos 时，如果用户提供了 OE 号或车型，务必传入 oe_number、make、model 参数以提高搜索精准度。如果用户提到套装号（如 9-0753S），传入 kit_number 参数，系统会自动查出该套装适配的车型来优化搜索。
11. **搜安装视频** — 在YouTube上搜索零件更换安装教程视频。调用 search_installation_videos 时，如果用户提供了 OE 号或车型，务必传入 oe_number、make、model 参数以提高搜索精准度。如果用户提到套装号，传入 kit_number 参数。
12. **版本查询** — 查询零件新老版本号、变更说明、交叉引用、互换性详情
13. **综合交叉查询** — 输入任意型号/OE号，自动从7个权威渠道(RockAuto/Cloyes/Gates/AutoZone/O'Reilly/NHTSA/OEM原厂)查询对比，给出结论和所有参考链接
14. **套装查询** — 搜索和查看套装（成套配件）。套装包含多个子配件，如正时链条套装包含链条、导轨、张紧器等。搜索时可按套装号、OE号、车型找到对应套装

## 综合交叉查询使用规范：
当用户问到以下内容时，调用 cross_reference_part 工具：
- "帮我查一下XXX这个型号"
- "这个OE号是什么情况"
- "XXX有没有替代件"
- "帮我验证一下XXX"
- 任何涉及具体零件号或OE号的查询

查询后回复包含：
1. 本地数据（如有）：型号、名称、OE号、版本历史
2. RockAuto 查询结果：是否在售、替代件、价格
3. 各渠道对比结论：哪些渠道有这个件、价格区间、是否有更新版本
4. 最终建议：推荐使用哪个版本、从哪里采购
5. 所有参考链接（点击可跳转到各网站核实）

## 版本查询回复规范（当用户问到新老版本时）：
查询 get_part_revisions 后，按以下结构回复，不要省略任何部分：

1. 版本概览：列出所有版本，标注哪个是老版/新版
2. 变更详情：每个版本的具体变化（材质、工艺、设计改进）
3. OE号交叉引用：老版OE号 → 新版OE号的对应关系
4. 适配年份：每个版本分别适配哪些年份的车
5. 互换性判断：能否直接互换，不能互换的原因，需要同时更换哪些部件
6. 供应商对比：不同供应商的价格差异（如有）
7. 参考资料：搜索官方文档和技术资料的链接

## 工作原则：
- 查询操作直接调用工具返回结果
- 写操作（创建、更新、删除）先返回确认信息，用户确认后再执行
- 批量操作务必先展示影响范围再确认
- 用中文回复，简洁专业
- 当用户问到本地没有的零件时，主动建议搜索 RockAuto
- 版本信息查询后，主动说明数据来源和最后验证时间
- 数据来源可信度排序：OEM原厂TSB > Cloyes/Gates官方 > RockAuto交叉验证 > 技师报告 > 手动录入
- 用户质疑信息准确性时，调用 verify_part_revision 工具进行多渠道交叉验证
- 验证渠道包括：RockAuto、Cloyes、Gates、AutoZone、O'Reilly、NHTSA、OEM原厂零件目录

## 输出格式（严格遵守）：
- 禁止使用任何 emoji 表情符号
- 禁止使用 markdown 表格（|---|）
- 禁止使用 # ## ### 标题符号
- 禁止使用 ** 加粗标记
- 用纯文本 + 简单缩进排版
- 列表用数字或短横线 - 表示
- 每条数据一行，用冒号分隔字段
- 保持输出简短，多余的话不说`;

  if (currentPage) {
    const context = PAGE_CONTEXT_MAP[currentPage];
    if (context) {
      prompt += `\n\n## 当前上下文：\n${context}`;
    }
  }

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, currentPage } = await request.json();

    if (!MIMO_API_KEY) {
      return NextResponse.json(
        { error: "未配置 MiMo API Key，请在 .env 文件中设置 ANTHROPIC_API_KEY 或 ANTHROPIC_AUTH_TOKEN" },
        { status: 500 }
      );
    }

    const systemPrompt = buildSystemPrompt(currentPage);

    const response = await anthropic.messages.create({
      model: "mimo-v2-pro",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      tools: agentTools,
    });

    // 检查是否有工具调用
    const toolUses = response.content.filter((b) => b.type === "tool_use");

    if (toolUses.length > 0) {
      const results = [];
      const webSearchLinks: { name: string; url: string }[] = [];

      for (const toolUse of toolUses) {
        const result = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );

        // 需要确认的写操作 → 返回确认弹窗
        if (result.needsConfirmation) {
          return NextResponse.json({
            type: "confirmation_required",
            toolUseId: toolUse.id,
            action: result.action,
            preview: result.preview,
          });
        }

        // 收集互联网搜索链接
        if (result.type === "web_search_result" && result.links) {
          webSearchLinks.push(...result.links);
        }

        results.push({
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: safeStringify(result),
        });
      }

      // 二次调用 MiMo 获取最终回复
      const finalResponse = await anthropic.messages.create({
        model: "mimo-v2-pro",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          ...messages,
          { role: "assistant", content: response.content },
          { role: "user", content: results },
        ],
        tools: agentTools,
      });

      const textBlocks = finalResponse.content.filter((b) => b.type === "text");
      let content = textBlocks.map((b) => b.text).join("\n");

      // 有搜索链接时，清理内容中的URL，链接单独返回给前端渲染按钮
      if (webSearchLinks.length > 0) {
        for (const link of webSearchLinks) {
          content = content.replace(link.url, "").replace(link.url.replace(/&/g, "&amp;"), "");
        }
        content = content.replace(/---\n搜索链接[：:][\s\S]*$/, "").replace(/\n{3,}/g, "\n\n").trim();
        if (!content) content = "已为您找到以下搜索结果：";
        return NextResponse.json({
          type: "message_with_links",
          content,
          links: webSearchLinks,
        });
      }

      return NextResponse.json({
        type: "message",
        content,
      });
    }

    // 没有工具调用，直接返回文本
    const textBlocks = response.content.filter((b) => b.type === "text");
    return NextResponse.json({
      type: "message",
      content: textBlocks.map((b) => b.text).join("\n"),
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Agent error:", err);
    return NextResponse.json(
      { error: err.message || "AI 服务异常" },
      { status: 500 }
    );
  }
}

// 确认执行写操作
export async function PUT(request: NextRequest) {
  try {
    const { action, preview } = await request.json();
    const result = await executeConfirmedAction(action, preview);
    return jsonResponse(result);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
