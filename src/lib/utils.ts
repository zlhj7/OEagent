import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { NextResponse } from "next/server";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// SQLite 的 COUNT/SUM 返回 BigInt，JSON.stringify 不认识它
// 这个函数把 BigInt 转成 Number，全局解决序列化问题
export function jsonResponse(data: unknown, status = 200) {
  const serialized = JSON.parse(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? Number(v) : v))
  );
  return NextResponse.json(serialized, { status });
}
