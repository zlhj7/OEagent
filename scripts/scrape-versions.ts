/**
 * 通过 Google 搜索抓取版本信息
 * 对每个有 OE 号的套装，搜索 "OE号 superseded replacement"
 * 将搜索结果链接存入 kit_revisions
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseList(val: any): string[] {
  if (!val) return [];
  try { const p = JSON.parse(val); if (Array.isArray(p)) return p.map(String); } catch { /* */ }
  return [String(val)];
}

async function main() {
  // 只处理有子配件的套装（有实际版本变化可能的）
  const kits = await prisma.kit.findMany({
    where: { items: { some: {} } },
    include: { items: { include: { part: true } } },
  });

  console.log(`有子配件的套装: ${kits.length} 个`);

  let processed = 0;

  for (const kit of kits) {
    // 收集所有 OE 号
    const kitOes = parseList(kit.oeNumber);
    const partOes: string[] = [];
    for (const item of kit.items) {
      const oes = parseList(item.part.oeNumber);
      for (const oe of oes) if (!partOes.includes(oe)) partOes.push(oe);
    }
    const allOes = [...new Set([...kitOes, ...partOes])];

    if (allOes.length === 0) continue;

    // 为每个 OE 号生成版本查询搜索链接
    const versionLinks: Record<string, string> = {};
    for (const oe of allOes) {
      versionLinks[oe] = `https://www.google.com/search?q=${encodeURIComponent(oe + " superseded replacement cross reference new version")}`;
    }

    // 更新现有记录或创建新的
    const existing = await prisma.kitRevision.findFirst({
      where: { kitId: kit.id, version: "版本查询" },
    });

    const data = {
      kitId: kit.id,
      version: "版本查询",
      changeType: "REVISION" as const,
      oldOeNumber: allOes.join(", "),
      changeDescription: `共 ${allOes.length} 个 OE 号待查询版本信息。点击链接在 Google 搜索该 OE 号的新旧版本替代关系。`,
      source: "google_search",
      sourceUrl: JSON.stringify(versionLinks),
    };

    if (existing) {
      await prisma.kitRevision.update({ where: { id: existing.id }, data });
    } else {
      await prisma.kitRevision.create({ data });
    }

    processed++;
    if (processed % 100 === 0) console.log(`  ${processed}/${kits.length}`);
  }

  console.log(`完成: ${processed} 个套装已生成版本查询链接`);
  console.log(`总版本记录: ${await prisma.kitRevision.count()}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
