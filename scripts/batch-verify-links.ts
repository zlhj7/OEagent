/**
 * 批量生成验证链接：为所有有 OE 号的套装生成各渠道搜索链接
 * 存入 kit_revisions 表
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseList(val: any): string[] {
  if (!val) return [];
  if (typeof val === "number") return [String(val)];
  try { const p = JSON.parse(val); if (Array.isArray(p)) return p.map(String); } catch { /* */ }
  return [String(val)];
}

async function main() {
  const kits = await prisma.kit.findMany({
    where: { oeNumber: { not: null } },
    include: { items: { include: { part: true } } },
    orderBy: { id: "asc" },
  });

  console.log(`${kits.length} 个有OE号的套装待处理`);

  let processed = 0;

  for (const kit of kits) {
    const kitOes = parseList(kit.oeNumber);
    const partOes: string[] = [];
    for (const item of kit.items) {
      const oes = parseList(item.part.oeNumber);
      for (const oe of oes) if (!partOes.includes(oe)) partOes.push(oe);
    }

    const allOes = [...new Set([...kitOes, ...partOes])];

    // 检查是否已有记录
    const existing = await prisma.kitRevision.findFirst({
      where: { kitId: kit.id, version: "渠道验证" },
    });

    const data = {
      kitId: kit.id,
      version: "渠道验证",
      changeType: "REVISION" as const,
      oldOeNumber: allOes.join(", "),
      changeDescription: `OE号 ${allOes.length} 个: ${allOes.join(", ")}`,
      source: "auto_generated",
      sourceUrl: JSON.stringify({
        cloyes: allOes.map(oe => `https://www.cloyes.com/search?q=${oe}`),
        rockauto: allOes.map(oe => `https://www.rockauto.com/en/partsearch/?partnum=${oe}`),
        gates: allOes.map(oe => `https://www.gates.com/us/en/search.html#q=${oe}`),
        autozone: `https://www.autozone.com/searchresult?searchText=${kit.kitNumber}`,
        oreilly: `https://www.oreillyauto.com/search?q=${kit.kitNumber}`,
        google: `https://www.google.com/search?q=${encodeURIComponent(kit.kitNumber + " superseded replacement")}`,
      }),
    };

    if (existing) {
      await prisma.kitRevision.update({ where: { id: existing.id }, data });
    } else {
      await prisma.kitRevision.create({ data });
    }

    processed++;
    if (processed % 500 === 0) console.log(`  ${processed}/${kits.length}`);
  }

  console.log(`完成: ${processed} 个套装已生成验证链接`);
  console.log(`总版本记录: ${await prisma.kitRevision.count()}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
