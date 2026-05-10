/**
 * 从 Excel 导入零件数据，替换所有旧数据
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

  // 跳过第一行表头
  const dataRows = rows.slice(1);
  console.log(`共 ${dataRows.length} 行数据（已跳过表头）`);

  // 解析 OE 号：有些是 "TKTY104B;NULL"，取第一个非 NULL 的
  function parseOe(oe: unknown): string | null {
    if (!oe || oe === "NULL" || oe === "undefined") return null;
    const str = String(oe);
    const parts = str.split(";").map(s => s.trim()).filter(s => s && s !== "NULL");
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0];
    return JSON.stringify(parts); // 多个OE号存为JSON数组
  }

  // 解析车型信息：第一行是主车型
  function parseVehicleInfo(vehicleInfo: unknown, brand: unknown) {
    if (!vehicleInfo || vehicleInfo === "undefined") {
      return { brand: brand ? String(brand).toUpperCase() : null, model: null, yearStart: null, yearEnd: null };
    }
    const lines = String(vehicleInfo).split("\n").map(l => l.trim()).filter(Boolean);
    const firstLine = lines[0] || "";

    // 尝试提取年份：如 "1989-1995" 或 "2008-"
    const yearMatch = firstLine.match(/(\d{4})\s*-\s*(\d{4})?/);
    const yearStart = yearMatch ? parseInt(yearMatch[1]) : null;
    const yearEnd = yearMatch && yearMatch[2] ? parseInt(yearMatch[2]) : null;

    // 提取车型名：取品牌后面的部分
    let model = firstLine;
    const brandStr = brand ? String(brand).toUpperCase() : "";
    if (brandStr && firstLine.toUpperCase().startsWith(brandStr)) {
      model = firstLine.substring(brandStr.length).trim();
    }

    // 如果有多个车型行，存为JSON数组
    if (lines.length > 1) {
      const fitments = lines.map(line => {
        const ym = line.match(/(\d{4})\s*-\s*(\d{4})?/);
        let m = line;
        if (brandStr && line.toUpperCase().startsWith(brandStr)) {
          m = line.substring(brandStr.length).trim();
        }
        return {
          brand: brandStr || null,
          model: m,
          yearStart: ym ? parseInt(ym[1]) : null,
          yearEnd: ym && ym[2] ? parseInt(ym[2]) : null,
        };
      });
      return {
        brand: JSON.stringify(fitments),
        model: fitments[0]?.model || null,
        yearStart: fitments[0]?.yearStart || null,
        yearEnd: fitments[0]?.yearEnd || null,
      };
    }

    return {
      brand: brandStr || null,
      model: model || null,
      yearStart,
      yearEnd,
    };
  }

  // 清空旧数据
  console.log("清空旧数据...");
  await prisma.stockRecord.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.partRevision.deleteMany();
  await prisma.kitItem.deleteMany();
  await prisma.kit.deleteMany();
  await prisma.order.deleteMany();
  await prisma.part.deleteMany();
  console.log("旧数据已清空");

  // 批量导入
  const BATCH_SIZE = 500;
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
    const batch = dataRows.slice(i, i + BATCH_SIZE);
    const createData = [];

    for (const row of batch) {
      const raw = row as Record<string, unknown>;
      const partNumber = raw["__EMPTY_2"];
      if (!partNumber || String(partNumber).trim() === "") {
        skipped++;
        continue;
      }

      const oe = parseOe(raw["__EMPTY_4"]);
      const vehicle = parseVehicleInfo(raw["__EMPTY_7"], raw["__EMPTY_5"]);
      const engine = raw["__EMPTY_6"] ? String(raw["__EMPTY_6"]).trim() : null;
      const price = raw["__EMPTY_9"] ? Number(raw["__EMPTY_9"]) : null;
      const status = raw["__EMPTY_3"] ? String(raw["__EMPTY_3"]) : "批量产品";

      createData.push({
        partNumber: String(partNumber).trim(),
        oeNumber: oe,
        name: String(partNumber).trim(),
        vehicleBrand: vehicle.brand,
        vehicleModel: vehicle.model,
        vehicleYearStart: vehicle.yearStart,
        vehicleYearEnd: vehicle.yearEnd,
        vehicleEngine: engine,
        sellPrice: price && price > 0 ? price : null,
        source: status === "批量产品" ? "batch" : "developing",
      });
    }

    if (createData.length > 0) {
      try {
        // 去重：同一批次内可能有重复的 partNumber
        const seen = new Set<string>();
        const uniqueData = createData.filter(d => {
          if (seen.has(d.partNumber)) return false;
          seen.add(d.partNumber);
          return true;
        });
        await prisma.part.createMany({ data: uniqueData });
        imported += createData.length;
      } catch (e) {
        console.error(`Batch ${i}-${i + BATCH_SIZE} error:`, (e as Error).message);
      }
    }

    console.log(`进度: ${Math.min(i + BATCH_SIZE, dataRows.length)}/${dataRows.length}`);
  }

  console.log(`\n导入完成: ${imported} 条成功, ${skipped} 条跳过`);
  const total = await prisma.part.count();
  console.log(`数据库总零件数: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
