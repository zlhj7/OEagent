/**
 * RockAuto MCP 客户端
 * 通过 stdio 与已有的 Python MCP Server 通信
 */
import { spawn } from "child_process";

const MCP_SERVER_PATH = "E:/shengtu/rockauto-mcp/server.py";

interface MCPToolResult {
  content: { type: string; text: string }[];
}

/**
 * 调用 RockAuto MCP 工具
 * 启动 Python 进程 → 发送 MCP 请求 → 解析响应
 */
export async function callRockautoTool(
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python", [MCP_SERVER_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    };

    let output = "";
    let errorOutput = "";

    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      errorOutput += data.toString();
    });

    proc.on("close", () => {
      try {
        // MCP 返回 JSON-RPC 格式，可能有多行输出，找最后一个 JSON
        const lines = output.trim().split("\n");
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(lines[i]);
            if (parsed.result) {
              const result = parsed.result as MCPToolResult;
              if (result.content && result.content[0]?.text) {
                resolve(result.content[0].text);
                return;
              }
            }
          } catch {
            continue;
          }
        }
        // 如果没找到 JSON，返回原始输出
        resolve(output || errorOutput || "无返回结果");
      } catch {
        reject(new Error(errorOutput || "RockAuto 调用失败"));
      }
    });

    // 发送初始化 + 工具调用
    const initReq = { jsonrpc: "2.0", id: 0, method: "initialize", params: {} };
    proc.stdin.write(JSON.stringify(initReq) + "\n");
    proc.stdin.write(JSON.stringify(request) + "\n");
    proc.stdin.end();

    // 超时处理
    setTimeout(() => {
      proc.kill();
      reject(new Error("RockAuto 调用超时 (30s)"));
    }, 30000);
  });
}
