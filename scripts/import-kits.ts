/**
 * 从 Excel 导入套装数据到 kits 表
 */
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

async function main() {
  const excelPath = "C:/Users/ADMIN/xwechat_files/wxid_01jcyf8iuj5d22_d618/msg/file/2026-05/零件目录_常用.xls";

  console.log("读取 Excel...");
  const wb = XLSX.readFile(excelPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);

  // 跳过表头
  const dataRows = rows.slice(1);
  console.log(`共 ${dataRows.length} 行套装数据`);

  // 解析 OE 号
  function parseOe(oe: unknown): string | null {
    if (!oe || oe === "NULL" || oe === "undefined") return null;
    const str = String(oe);
    const parts = str.split(";").map(s => s.trim()).filter(s => s && s !== "NULL");
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0];
    return JSON.stringify(parts);
  }

  // 清空旧数据
  console.log("清空旧数据...");
  await prisma.kitItem.deleteMany();
  await prisma.kit.deleteMany();
  await prisma.stockRecord.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.partRevision.deleteMany();
  await prisma.part.deleteMany();
  await prisma.order.deleteMany();
  console.log("旧数据已清空");

  // 批量导入到 kits 表
  const BATCH_SIZE = 500;
  let imported = 0;
  let skipped = 0;
  const seen = new Set<string>();

  for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
    const batch = dataRows.slice(i, i + BATCH_SIZE);
    const createData = [];

    for (const row of batch) {
      const raw = row as Record<string, unknown>;
      const kitNumber = raw["__EMPTY_2"];
      if (!kitNumber || String(kitNumber).trim() === "") {
        skipped++;
        continue;
      }

      const kn = String(kitNumber).trim();
      if (seen.has(kn)) { skipped++; continue; }
      seen.add(kn);

      const oe = parseOe(raw["__EMPTY_4"]);
      const brand = raw["__EMPTY_5"] ? String(raw["__EMPTY_5"]).toUpperCase().trim() : null;
      const engine = raw["__EMPTY_6"] ? String(raw["__EMPTY_6"]).trim() : null;
      const vehicleInfo = raw["__EMPTY_7"] ? String(raw["__EMPTY_7"]).trim() : null;
      const status = raw["__EMPTY_3"] ? String(raw["__EMPTY_3"]).trim() : "批量产品";
      const price = raw["__EMPTY_9"] ? Number(raw["__EMPTY_9"]) : null;

      // 从车型信息中提取第一行作为车型名
      let model = null;
      let yearStart: number | null = null;
      let yearEnd: number | null = null;
      if (vehicleInfo) {
        const firstLine = vehicleInfo.split("\n")[0].trim();
        model = firstLine;
        // 去掉品牌前缀
        if (brand && firstLine.toUpperCase().startsWith(brand)) {
          model = firstLine.substring(brand.length).trim();
        }
        // 提取年份
        const ym = firstLine.match(/(\d{4})\s*-\s*(\d{4})?/);
        if (ym) {
          yearStart = parseInt(ym[1]);
          yearEnd = ym[2] ? parseInt(ym[2]) : null;
        }
      }

      createData.push({
        kitNumber: kn,
        oeNumber: oe,
        name: `${brand || ""} ${engine || ""} ${model || ""}`.trim() || kn,
        description: vehicleInfo || `${status}` || null,
        vehicleBrand: brand,
        vehicleModel: model,
        vehicleYearStart: yearStart,
        vehicleYearEnd: yearEnd,
        vehicleEngine: engine,
        sellPrice: price && price > 0 ? price : null,
      });
    }

    if (createData.length > 0) {
      try {
        // 去重
        const unique = createData.filter(d => !seen.has(d.kitNumber));
        await prisma.kit.createMany({ data: createData });
        imported += createData.length;
      } catch (e) {
        console.error(`Batch ${i}-${i + BATCH_SIZE} error:`, (e as Error).message);
      }
    }

    console.log(`进度: ${Math.min(i + BATCH_SIZE, dataRows.length)}/${dataRows.length}`);
  }

  console.log(`\n导入完成: ${imported} 条成功, ${skipped} 条跳过`);
  const total = await prisma.kit.count();
  console.log(`数据库总套装数: ${total}`);

  // 按品牌统计
  const brands = await prisma.$queryRaw`
    SELECT vehicle_brand as brand, COUNT(*) as count
    FROM kits
    WHERE vehicle_brand IS NOT NULL
    GROUP BY vehicle_brand
    ORDER BY count DESC
    LIMIT 15
  `;
  console.log("\n品牌分布:");
  console.table(brands);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
