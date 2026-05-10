// 手动定义类型，Prisma generate 后自动保持同步

export interface Supplier {
  id: number;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
}

// 适配车型条目
export interface VehicleFitment {
  brand: string;
  model: string;
  yearStart?: number;
  yearEnd?: number;
}

// 供应商报价条目
export interface SupplierPrice {
  supplierId: number;
  supplierName: string;
  purchasePrice: number;
  sellPrice: number;
}

export interface Part {
  id: number;
  partNumber: string;
  oeNumber: string | null;        // JSON 数组: ["OE-001", "OE-002"] 或旧格式单字符串
  name: string;
  description: string | null;
  vehicleBrand: string | null;    // JSON 数组: [{"brand":"Toyota","model":"Camry","yearStart":2012}] 或旧格式
  vehicleModel: string | null;
  vehicleYearStart: number | null;
  vehicleYearEnd: number | null;
  vehicleEngine: string | null;    // 发动机型号，如 2GR-FE
  purchasePrice: number | null;   // 旧字段保留
  sellPrice: number | null;       // 旧字段保留
  supplierId: number | null;      // 旧字段保留
  supplierPrices: string | null;  // JSON 数组: [{"supplierId":1,"supplierName":"xx","purchasePrice":100,"sellPrice":200}]
  stockQuantity: number;
  stockWarning: number;
  source: string | null;
  rockautoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier | null;     // 关联的主供应商（旧字段关联）
}

export type PartWithSupplier = Part & {
  supplier: Supplier | null;
};

export interface Order {
  id: number;
  orderNo: string;
  customerName: string;
  customerContact: string | null;
  status: string;
  totalAmount: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  partId: number;
  quantity: number;
  unitPrice: string;
}

export type OrderWithItems = Order & {
  items: (OrderItem & { part: Part })[];
};

export interface Complaint {
  id: number;
  complaintNo: string;
  customerName: string;
  orderId: number | null;
  partId: number | null;
  content: string;
  status: string;
  priority: string;
  resolution: string | null;
  satisfaction: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

export type ComplaintWithRelations = Complaint & {
  order: Order | null;
  part: Part | null;
};

export interface StockRecord {
  id: number;
  partId: number;
  type: string;
  quantity: number;
  reason: string | null;
  operator: string | null;
  createdAt: string;
}

export type StockRecordWithPart = StockRecord & {
  part: Part;
};

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
