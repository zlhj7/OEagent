import type { VehicleFitment, SupplierPrice } from "@/types";

/**
 * 解析 OE 号列表
 * 兼容旧格式（单字符串）和新格式（JSON 数组）
 */
export function parseOeNumbers(oeNumber: string | null): string[] {
  if (!oeNumber) return [];
  try {
    const parsed = JSON.parse(oeNumber);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    return [oeNumber];
  }
  return [];
}

/**
 * 解析适配车型列表
 * 兼容旧格式（vehicleBrand + vehicleModel）和新格式（JSON 数组）
 */
export function parseVehicleFitments(
  vehicleBrand: string | null,
  vehicleModel: string | null,
  yearStart: number | null,
  yearEnd: number | null
): VehicleFitment[] {
  if (!vehicleBrand) return [];
  try {
    const parsed = JSON.parse(vehicleBrand);
    if (Array.isArray(parsed)) return parsed.filter((v) => v.brand && v.model);
  } catch {
    if (vehicleModel) {
      return [{
        brand: vehicleBrand,
        model: vehicleModel,
        yearStart: yearStart || undefined,
        yearEnd: yearEnd || undefined,
      }];
    }
  }
  return [];
}

/**
 * 解析供应商报价列表
 * 兼容旧格式（单 supplierId + purchasePrice + sellPrice）和新格式（JSON 数组）
 */
export function parseSupplierPrices(
  supplierPrices: string | null,
  supplierId: number | null,
  supplierName: string | null,
  purchasePrice: number | null,
  sellPrice: number | null
): SupplierPrice[] {
  // 新格式：从 supplierPrices JSON 字段解析
  if (supplierPrices) {
    try {
      const parsed = JSON.parse(supplierPrices);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* ignore */ }
  }

  // 旧格式：单供应商
  if (supplierId && supplierName) {
    return [{
      supplierId,
      supplierName,
      purchasePrice: purchasePrice || 0,
      sellPrice: sellPrice || 0,
    }];
  }

  return [];
}
