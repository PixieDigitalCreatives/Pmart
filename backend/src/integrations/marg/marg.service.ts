import { logger } from '../../utils/logger';
import { margClient } from './marg.client';
import { MargSyncResult } from './marg.types';

export class MargService {
  /**
   * Syncs products from MARG ERP to PMart MongoDB
   */
  async syncProductsFromMarg(): Promise<MargSyncResult> {
    logger.info('[MargService] Syncing products from MARG ERP...');
    try {
      const products = await margClient.fetchProducts();
      // TODO: Map and upsert to MongoDB
      
      return {
        success: true,
        syncedCount: products.length,
        failedCount: 0,
        errors: []
      };
    } catch (error) {
      logger.error('[MargService] Error syncing products from MARG', error);
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Pushes a completed order to MARG ERP
   */
  async pushOrderToMarg(orderData: any): Promise<boolean> {
    logger.info(`[MargService] Pushing order ${orderData._id} to MARG ERP...`);
    // TODO: Map Pmart Order to MargOrder
    const success = await margClient.pushOrder({
      orderId: orderData._id.toString(),
      totalAmount: orderData.totalAmount,
      items: [], // Map items here
      customerPhone: '', // Get from customer
      paymentMode: orderData.paymentMethod
    });
    
    return success;
  }
}

export const margService = new MargService();
