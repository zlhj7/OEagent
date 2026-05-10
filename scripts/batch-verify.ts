/**
 * 批量验证脚本：对所有套装/零件的 OE 号调用 RockAuto 查询
 * 结果存入 kit_revisions / part_revisions 表
 */
import { PrismaClient } from "@prisma/client";
import { spawn } from "child_process";

const prisma = new PrismaClient();
const MCP_PATH = "E:/shengtu/rockauto-mcp/server.py";

// 调用 RockAuto 查询单个 OE 号
async function queryRockauto(oeNumber: string): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn("python", [MCP_PATH], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    proc.stdout.on("data", (d: Buffer) => { output += d.toString(); });
    proc.on("close", () => {
      try {
        const lines = output.trim().split("\n");
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(lines[i]);
            if (parsed.result?.content?.[0]?.text) {
              resolve(parsed.result.content[0].text);
              return;
            }
          } catch { /* */ }
        }
        resolve("查询无结果");
      } catch { resolve("查询失败"); }
    });
    const initReq = { jsonrpc: "2.0", id: 0, method: "initialize", params: {} };
    const callReq = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_by_part_number", arguments: { part_number: oeNumber } } };
    proc.stdin.write(JSON.stringify(initReq) + "\n");
    proc.stdin.write(JSON.stringify(callReq) + "\n");
    proc.stdin.end();
    setTimeout(() => { proc.kill(); resolve("超时"); }, 25000);
  });
}

function parseList(val: any): string[] {
  if (!val) return [];
  if (typeof val === "number") return [String(val)];
  try { const p = JSON.parse(val); if (Array.isArray(p)) return p.map(String); } catch { /* */ }
  return [String(val)];
}

async function main() {
  // 获取所有套装
  const kits = await prisma.kit.findMany({
    include: { items: { include: { part: true } } },
    orderBy: { id: "asc" },
  });

  console.log(`共 ${kits.length} 个套装待验证`);

  let verified = 0;
  let errors = 0;

  for (const kit of kits) {
    // 收集所有 OE 号
    const kitOes = parseList(kit.oeNumber);
    const partOes: string[] = [];
    for (const item of kit.items) {
      const oes = parseList(item.part.oeNumber);
      for (const oe of oes) {
        if (!partOes.includes(oe)) partOes.push(oe);
      }
    }
    const allOes = [...kitOes, ...partOes];

    if (allOes.length === 0) {
      console.log(`  跳过 ${kit.kitNumber}（无OE号）`);
      continue;
    }

    // 查询前 2 个 OE 号（避免太慢）
    const results: string[] = [];
    for (const oe of allOes.slice(0, 2)) {
      try {
        const result = await queryRockauto(oe);
        results.push(result);
      } catch {
        results.push("查询失败");
        errors++;
      }
    }

    // 判断状态
    const hasResults = results.some(r => r !== "查询无结果" && r !== "查询失败" && r !== "超时" && !r.includes("未找到"));
    const rockautoStatus = hasResults ? "available" : "not_found";

    // 生成各渠道搜索链接
    const searchLinks = {
      cloyes: allOes.map(oe => `https://www.cloyes.com/search?q=${encodeURIComponent(oe)}`),
      rockauto: allOes.map(oe => `https://www.rockauto.com/en/partsearch/?partnum=${encodeURIComponent(oe)}`),
      gates: allOes.map(oe => `https://www.gates.com/us/en/search.html#q=${encodeURIComponent(oe)}`),
    };

    // 更新或创建版本记录
    const existing = await prisma.kitRevision.findFirst({
      where: { kitId: kit.id, version: "auto_verify" },
    });

    if (existing) {
      await prisma.kitRevision.update({
        where: { id: existing.id },
        data: {
          verifiedAt: new Date(),
          verifiedBy: "rockauto_batch",
          rockautoStatus,
          sourceUrl: JSON.stringify(searchLinks),
          changeDescription: `RockAuto查询结果: ${results.map(r => r.substring(0, 100)).join(" | ")}`,
        },
      });
    } else {
      await prisma.kitRevision.create({
        data: {
          kitId: kit.id,
          version: "auto_verify",
          changeType: "REVISION",
          oldOeNumber: allOes.join(", "),
          changeDescription: `RockAuto查询结果: ${results.map(r => r.substring(0, 100)).join(" | ")}`,
          source: "rockauto",
          sourceUrl: JSON.stringify(searchLinks),
          verifiedAt: new Date(),
          verifiedBy: "rockauto_batch",
          rockautoStatus,
        },
      });
    }

    verified++;
    console.log(`  [${verified}/${kits.length}] ${kit.kitNumber} - OE: ${allOes.slice(0, 2).join(", ")} - RockAuto: ${rockautoStatus}`);
  }

  console.log(`\n完成: 验证 ${verified} 个, 错误 ${errors} 个`);
  console.log(`总版本记录: ${await prisma.kitRevision.count()}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
