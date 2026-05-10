import sql from "mssql";

const config: sql.config = {
  server: process.env.FTTX_DB_HOST || "127.0.0.1",
  port: parseInt(process.env.FTTX_DB_PORT || "1433"),
  database: process.env.FTTX_DB_NAME || "FTTXRUN",
  user: process.env.FTTX_DB_USER || "",
  password: process.env.FTTX_DB_PASSWORD || "",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 15000,
  requestTimeout: 15000,
};

async function main() {
  console.log("正在连接富通天下数据库...");
  console.log(`服务器: ${config.server}:${config.port}`);
  console.log(`数据库: ${config.database}`);
  console.log(`账号: ${config.user}`);
  console.log("");

  try {
    const pool = await sql.connect(config);
    console.log("连接成功！\n");

    // 查询所有用户表
    const tables = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    console.log(`共找到 ${tables.recordset.length} 个数据表：\n`);
    console.log("表名".padEnd(40) + "类型");
    console.log("-".repeat(60));
    for (const row of tables.recordset) {
      console.log(row.TABLE_NAME.padEnd(40) + row.TABLE_TYPE);
    }

    // 查找可能的产品/零件表
    console.log("\n\n=== 与产品/零件相关的表 ===\n");
    const productTables = tables.recordset.filter((t: { TABLE_NAME: string }) =>
      /product|goods|part|item|material|storage|stock|order|supplier|customer/i.test(t.TABLE_NAME)
    );

    for (const t of productTables) {
      console.log(`\n--- ${t.TABLE_NAME} ---`);
      const columns = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${t.TABLE_NAME}'
        ORDER BY ORDINAL_POSITION
      `);
      for (const col of columns.recordset) {
        const len = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : "";
        console.log(`  ${col.COLUMN_NAME.padEnd(35)} ${col.DATA_TYPE}${len}`);
      }

      // 读取前3条数据样本
      try {
        const sample = await pool.request().query(`SELECT TOP 3 * FROM [${t.TABLE_NAME}]`);
        if (sample.recordset.length > 0) {
          console.log(`  [样本数据 ${sample.recordset.length} 条]`);
          const keys = Object.keys(sample.recordset[0]).slice(0, 8);
          for (const row of sample.recordset) {
            const preview = keys.map((k) => `${k}=${row[k]}`).join(", ");
            console.log(`    ${preview.substring(0, 120)}`);
          }
        }
      } catch { /* skip */ }
    }

    await pool.close();
    console.log("\n\n检查完成！");
  } catch (err) {
    console.error("连接失败:", (err as Error).message);
  }
}

main();
