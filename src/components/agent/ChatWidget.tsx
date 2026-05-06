"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, X, Minimize2, Maximize2, AlertTriangle, ShoppingCart, Package, TrendingUp, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChatLink {
  name: string;
  url: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  links?: ChatLink[];
}

interface ConfirmationData {
  toolUseId: string;
  action: string;
  preview: Record<string, unknown>;
}

// 快捷操作按钮 —— 根据页面不同显示不同建议
const QUICK_ACTIONS: Record<string, { label: string; icon: React.ReactNode; prompt: string }[]> = {
  "/parts": [
    { label: "低库存预警", icon: <AlertTriangle className="h-3 w-3" />, prompt: "检查一下有哪些零件库存不足" },
    { label: "热销推荐", icon: <TrendingUp className="h-3 w-3" />, prompt: "哪些零件卖得最好？给我补货建议" },
    { label: "RockAuto搜索", icon: <Package className="h-3 w-3" />, prompt: "帮我在 RockAuto 搜 Toyota 的正时链条" },
  ],
  "/orders": [
    { label: "待发货订单", icon: <ShoppingCart className="h-3 w-3" />, prompt: "有哪些待发货的订单？有没有超时的？" },
    { label: "今日统计", icon: <TrendingUp className="h-3 w-3" />, prompt: "给我今天的订单统计概况" },
  ],
  "/complaints": [
    { label: "待处理投诉", icon: <AlertTriangle className="h-3 w-3" />, prompt: "有哪些投诉还没处理？优先级最高的哪个？" },
    { label: "投诉分析", icon: <TrendingUp className="h-3 w-3" />, prompt: "投诉最多的零件是哪些？有什么趋势？" },
  ],
  "/stock": [
    { label: "库存预警", icon: <AlertTriangle className="h-3 w-3" />, prompt: "哪些零件库存低于预警值了？" },
    { label: "补货建议", icon: <Package className="h-3 w-3" />, prompt: "根据最近的销售情况，建议补哪些货？" },
  ],
  "/stats": [
    { label: "智能分析", icon: <TrendingUp className="h-3 w-3" />, prompt: "帮我分析一下当前业务数据，有什么值得注意的？" },
    { label: "异常检测", icon: <AlertTriangle className="h-3 w-3" />, prompt: "系统里有什么异常或需要关注的？" },
  ],
  default: [
    { label: "系统概览", icon: <TrendingUp className="h-3 w-3" />, prompt: "给我一个今天的系统概览，包括待处理事项" },
  ],
};

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "你好！我是 OE Agent AI 助手。\n\n我能帮你查零件、搜 RockAuto、管订单、处理投诉、看库存。试试下方的快捷按钮，或者直接问我。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 获取当前页面的快捷操作
  const quickActions = QUICK_ACTIONS[pathname] || QUICK_ACTIONS["default"];

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || loading) return;

    const userMsg: Message = { role: "user", content: msgText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          currentPage: pathname, // ← 传递当前页面路径
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${data.error}` }]);
      } else if (data.type === "confirmation_required") {
        setConfirmation(data);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: formatPreview(data.action, data.preview) },
        ]);
      } else if (data.type === "message_with_links") {
        // 带可点击链接的消息 — 清理内容中的链接URL，只保留文字
        let cleanContent = data.content as string;
        const links = data.links as ChatLink[];
        // 移除内容末尾的搜索链接部分
        cleanContent = cleanContent.replace(/\n---\n搜索链接：[\s\S]*$/, "").trim();
        // 移除内容中嵌入的URL
        for (const link of links) {
          cleanContent = cleanContent.replace(link.url, "").trim();
        }
        // 清理多余空行
        cleanContent = cleanContent.replace(/\n{3,}/g, "\n\n").trim();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: cleanContent, links },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "请求失败，请检查网络或稍后重试。" }]);
    }

    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!confirmation) return;
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: confirmation.action, preview: confirmation.preview }),
      });
      const data = await res.json();

      if (data.success) {
        const count = data.count ? ` (影响 ${data.count} 条)` : "";
        setMessages((prev) => [...prev, { role: "assistant", content: `✅ 操作执行成功！${count}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: `❌ 操作失败: ${data.error}` }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ 执行失败，请重试。" }]);
    }

    setConfirmation(null);
    setLoading(false);
  };

  const formatPreview = (action: string, preview: Record<string, unknown>): string => {
    switch (action) {
      case "create_order": {
        const items = preview.items as { partName: string; quantity: number; unitPrice: number; subtotal: number }[];
        let text = `📋 **确认创建订单？**\n\n👤 客户: ${preview.customer}\n\n`;
        items.forEach((item) => {
          text += `  📦 ${item.partName}\n     ${item.quantity} × ¥${item.unitPrice} = ¥${item.subtotal}\n`;
        });
        text += `\n💰 合计: ¥${preview.total}`;
        if (preview.notes) text += `\n📝 备注: ${preview.notes}`;
        return text;
      }

      case "update_order_status":
        return `📋 **确认更新订单状态？**\n\n📄 订单号: ${(preview as Record<string, unknown>).orderNo}\n👤 客户: ${(preview as Record<string, unknown>).customer}\n📊 ${(preview as Record<string, unknown>).currentStatus} → ${(preview as Record<string, unknown>).newStatus}`;

      case "update_complaint":
        return `📋 **确认更新投诉？**\n\n📄 投诉号: ${(preview as Record<string, unknown>).complaintNo}\n📊 状态: ${(preview as Record<string, unknown>).currentStatus} → ${(preview as Record<string, unknown>).newStatus}\n💬 处理结果: ${(preview as Record<string, unknown>).resolution || "无"}`;

      case "stock_operation":
        return `📋 **确认${(preview as Record<string, unknown>).operation}？**\n\n📦 ${(preview as Record<string, unknown>).partNumber} - ${(preview as Record<string, unknown>).partName}\n📊 库存: ${(preview as Record<string, unknown>).currentStock} → ${(preview as Record<string, unknown>).newStock} (${(preview as Record<string, unknown>).operation === "入库" ? "+" : "-"}${(preview as Record<string, unknown>).quantity})`;

      case "import_part":
        return `📋 **确认从 RockAuto 导入？**\n\n📦 型号: ${(preview as Record<string, unknown>).partNumber}\n🏷️ 名称: ${(preview as Record<string, unknown>).name}\n🚗 适用车型: ${(preview as Record<string, unknown>).vehicleBrand || ""} ${(preview as Record<string, unknown>).vehicleModel || ""}\n💰 售价: ¥${(preview as Record<string, unknown>).sellPrice || "待定"}`;

      case "batch_update_prices": {
        const samples = (preview as Record<string, unknown>).samples as { partNumber: string; name: string; oldPrice: number; newPrice: number }[];
        let text = `📋 **确认批量调价？**\n\n📊 影响 ${(preview as Record<string, unknown>).totalAffected} 个零件，调整: ${(preview as Record<string, unknown>).adjustment}\n\n`;
        (samples || []).forEach((s) => {
          text += `  📦 ${s.partNumber} ${s.name}\n     ¥${s.oldPrice} → ¥${s.newPrice}\n`;
        });
        return text;
      }

      case "batch_stock_in": {
        const batchItems = (preview as Record<string, unknown>).items as { partNumber: string; partName: string; quantity: number }[];
        let text = `📋 **确认批量入库？**\n\n`;
        batchItems.forEach((item) => {
          text += `  📦 ${item.partNumber} ${item.partName}: +${item.quantity}\n`;
        });
        return text;
      }

      case "batch_process_orders":
        return `📋 **确认批量处理订单？**\n\n📊 将 ${(preview as Record<string, unknown>).count} 个订单从 ${preview.currentStatus} 更新为 ${preview.newStatus}`;

      default:
        return `📋 **确认操作？**\n\n${JSON.stringify(preview, null, 2)}`;
    }
  };

  // 收起状态：悬浮按钮
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50 hover:scale-105"
      >
        <Bot className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 bg-background border rounded-lg shadow-xl flex flex-col z-50 ${
        expanded ? "w-[600px] h-[700px]" : "w-[400px] h-[520px]"
      }`}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-medium text-sm">AI 助手</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {pathname === "/" ? "首页" : pathname.slice(1)}
          </Badge>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setExpanded(!expanded)} className="hover:bg-primary-foreground/20 rounded p-1">
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button onClick={() => setOpen(false)} className="hover:bg-primary-foreground/20 rounded p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
              {msg.links && msg.links.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.links.map((link, j) => (
                    <a
                      key={j}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-background border hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {link.name.includes("Google") && "🖼 "}
                      {link.name.includes("Bing") && "🖼 "}
                      {link.name.includes("YouTube") && "▶ "}
                      {link.name}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 text-sm">
              <span className="animate-pulse">思考中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 确认按钮区 */}
      {confirmation && (
        <div className="px-4 py-2 border-t flex gap-2 bg-yellow-50">
          <Button size="sm" onClick={handleConfirm} disabled={loading}>
            ✅ 确认执行
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmation(null)}>
            取消
          </Button>
        </div>
      )}

      {/* 快捷操作按钮 */}
      {!confirmation && messages.length <= 2 && (
        <div className="px-3 py-2 border-t flex flex-wrap gap-1.5">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => sendMessage(action.prompt)}
              disabled={loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border hover:bg-muted transition-colors disabled:opacity-50"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* 输入区 */}
      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="输入问题..."
          disabled={loading}
          className="text-sm"
        />
        <Button size="icon" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
