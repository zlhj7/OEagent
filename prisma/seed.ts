import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("开始种子数据...");

  // 创建供应商
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: { name: "丰田零部件有限公司", contact: "张经理", phone: "021-12345678", email: "zhang@toyota-parts.cn", address: "上海市浦东新区" },
    }),
    prisma.supplier.create({
      data: { name: "福特汽配供应", contact: "李总", phone: "0755-87654321", email: "li@ford-supply.cn", address: "深圳市南山区" },
    }),
    prisma.supplier.create({
      data: { name: "博世贸易(中国)", contact: "王经理", phone: "010-55556666", email: "wang@bosch.cn", address: "北京市朝阳区" },
    }),
    prisma.supplier.create({
      data: { name: "德尔福汽配", contact: "赵经理", phone: "020-33334444", email: "zhao@delphi.cn", address: "广州市天河区" },
    }),
  ]);
  console.log(`创建了 ${suppliers.length} 个供应商`);

  // 创建零件
  const parts = await Promise.all([
    prisma.part.create({
      data: { partNumber: "TC-KIT-001", oeNumber: "13503-75020", name: "正时链条套件", description: "丰田2GR-FE发动机正时链条套件含导轨和张紧器", vehicleBrand: "Toyota", vehicleModel: "Camry", vehicleYearStart: 2012, vehicleYearEnd: 2017, purchasePrice: 450, sellPrice: 680, supplierId: suppliers[0].id, stockQuantity: 15, stockWarning: 5 },
    }),
    prisma.part.create({
      data: { partNumber: "WP-2023-A", oeNumber: "16100-29385", name: "水泵总成", description: "丰田凯美瑞水泵含密封垫", vehicleBrand: "Toyota", vehicleModel: "Camry", vehicleYearStart: 2010, vehicleYearEnd: 2017, purchasePrice: 280, sellPrice: 420, supplierId: suppliers[0].id, stockQuantity: 8, stockWarning: 3 },
    }),
    prisma.part.create({
      data: { partNumber: "TB-F150-01", oeNumber: "HL3Z-6268-A", name: "正时皮带套件", description: "福特F-150 3.5L EcoBoost正时皮带套件", vehicleBrand: "Ford", vehicleModel: "F-150", vehicleYearStart: 2015, vehicleYearEnd: 2020, purchasePrice: 520, sellPrice: 780, supplierId: suppliers[1].id, stockQuantity: 3, stockWarning: 5 },
    }),
    prisma.part.create({
      data: { partNumber: "OF-BOS-100", oeNumber: "0 986 452 087", name: "机油滤清器", description: "博世通用机油滤清器", vehicleBrand: "Universal", vehicleModel: "通用", purchasePrice: 25, sellPrice: 45, supplierId: suppliers[2].id, stockQuantity: 120, stockWarning: 20 },
    }),
    prisma.part.create({
      data: { partNumber: "SP-DEL-440", oeNumber: "214-1109", name: "火花塞(4支装)", description: "德尔福铱金火花塞", vehicleBrand: "Honda", vehicleModel: "Civic", vehicleYearStart: 2016, vehicleYearEnd: 2022, purchasePrice: 120, sellPrice: 188, supplierId: suppliers[3].id, stockQuantity: 45, stockWarning: 10 },
    }),
    prisma.part.create({
      data: { partNumber: "BP-F150-55", oeNumber: "BL3Z-1100-A", name: "刹车片套件(前)", description: "福特F-150前刹车片", vehicleBrand: "Ford", vehicleModel: "F-150", vehicleYearStart: 2015, vehicleYearEnd: 2023, purchasePrice: 180, sellPrice: 290, supplierId: suppliers[1].id, stockQuantity: 22, stockWarning: 8 },
    }),
    prisma.part.create({
      data: { partNumber: "ALT-HON-60", oeNumber: "31100-5A2-A01", name: "交流发电机", description: "本田雅阁交流发电机 60A", vehicleBrand: "Honda", vehicleModel: "Accord", vehicleYearStart: 2013, vehicleYearEnd: 2017, purchasePrice: 680, sellPrice: 980, supplierId: suppliers[0].id, stockQuantity: 4, stockWarning: 3 },
    }),
    prisma.part.create({
      data: { partNumber: "AF-BOS-320", oeNumber: "F 026 400 035", name: "空气滤清器", description: "博世空气滤清器 通用型", vehicleBrand: "Universal", vehicleModel: "通用", purchasePrice: 35, sellPrice: 60, supplierId: suppliers[2].id, stockQuantity: 80, stockWarning: 15 },
    }),
    prisma.part.create({
      data: { partNumber: "SS-CAM-V6", oeNumber: "17451-28240", name: "排气歧管", description: "丰田凯美瑞V6排气歧管", vehicleBrand: "Toyota", vehicleModel: "Camry", vehicleYearStart: 2012, vehicleYearEnd: 2017, purchasePrice: 380, sellPrice: 560, supplierId: suppliers[0].id, stockQuantity: 2, stockWarning: 2 },
    }),
    prisma.part.create({
      data: { partNumber: "WH-F150-AL", oeNumber: "FL3Z-1007-E", name: "轮毂轴承总成", description: "福特F-150铝合金轮毂轴承", vehicleBrand: "Ford", vehicleModel: "F-150", vehicleYearStart: 2015, vehicleYearEnd: 2023, purchasePrice: 320, sellPrice: 480, supplierId: suppliers[1].id, stockQuantity: 6, stockWarning: 4 },
    }),
  ]);
  console.log(`创建了 ${parts.length} 个零件`);

  // 创建订单
  const order1 = await prisma.order.create({
    data: {
      orderNo: "ORD-20260501-0001",
      customerName: "李明",
      customerContact: "13800138001",
      status: "COMPLETED",
      totalAmount: 1100,
      notes: "老客户，优先发货",
      items: {
        create: [
          { partId: parts[0].id, quantity: 1, unitPrice: 680 },
          { partId: parts[1].id, quantity: 1, unitPrice: 420 },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      orderNo: "ORD-20260502-0002",
      customerName: "王强",
      customerContact: "13900139002",
      status: "SHIPPED",
      totalAmount: 1070,
      items: {
        create: [
          { partId: parts[2].id, quantity: 1, unitPrice: 780 },
          { partId: parts[5].id, quantity: 1, unitPrice: 290 },
        ],
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      orderNo: "ORD-20260503-0003",
      customerName: "赵华",
      customerContact: "13700137003",
      status: "PENDING",
      totalAmount: 2148,
      items: {
        create: [
          { partId: parts[6].id, quantity: 2, unitPrice: 980 },
          { partId: parts[4].id, quantity: 1, unitPrice: 188 },
        ],
      },
    },
  });
  console.log("创建了 3 个订单");

  // 创建投诉
  await Promise.all([
    prisma.complaint.create({
      data: {
        complaintNo: "CMP-20260502-0001",
        customerName: "王强",
        orderId: order2.id,
        partId: parts[2].id,
        content: "收到的正时皮带套件包装有破损，内部零件是否受影响需要检查",
        status: "PROCESSING",
        priority: "HIGH",
      },
    }),
    prisma.complaint.create({
      data: {
        complaintNo: "CMP-20260504-0002",
        customerName: "陈静",
        content: "上次购买的机油滤清器安装后有轻微渗油，请核实产品质量",
        status: "OPEN",
        priority: "MEDIUM",
      },
    }),
    prisma.complaint.create({
      data: {
        complaintNo: "CMP-20260505-0003",
        customerName: "李明",
        orderId: order1.id,
        partId: parts[0].id,
        content: "正时链条安装后有异响，建议安排技术检查",
        status: "RESOLVED",
        priority: "URGENT",
        resolution: "已安排技术人员上门检查，确认为安装问题，已免费更换",
        satisfaction: 4,
        resolvedAt: new Date(),
      },
    }),
  ]);
  console.log("创建了 3 条投诉记录");

  console.log("种子数据创建完成！");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
