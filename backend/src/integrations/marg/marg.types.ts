export interface MargProduct {
  margId: string;
  name: string;
  price: number;
  stock: number;
  barcode?: string;
  taxRate?: number;
}

export interface MargOrder {
  orderId: string;
  totalAmount: number;
  items: Array<{
    margProductId: string;
    quantity: number;
    price: number;
  }>;
  customerPhone: string;
  paymentMode: 'CASH' | 'ONLINE';
}

export interface MargSyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}
