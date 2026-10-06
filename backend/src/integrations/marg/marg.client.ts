import { logger } from '../../utils/logger';
import { MargOrder, MargProduct } from './marg.types';

/**
 * MARG ERP API Client abstraction.
 * Currently BLOCKED pending official MARG API documentation/credentials.
 */
export class MargClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.MARG_API_URL || 'http://localhost:8080/marg';
    this.apiKey = process.env.MARG_API_KEY || '';
  }

  async fetchProducts(lastSyncTime?: Date): Promise<MargProduct[]> {
    logger.warn('[MargClient] fetchProducts called, but MARG integration is BLOCKED.');
    // MOCK implementation
    return [];
  }

  async pushOrder(order: MargOrder): Promise<boolean> {
    logger.warn(`[MargClient] pushOrder called for ${order.orderId}, but MARG integration is BLOCKED.`);
    // MOCK implementation
    return true;
  }
}

export const margClient = new MargClient();
