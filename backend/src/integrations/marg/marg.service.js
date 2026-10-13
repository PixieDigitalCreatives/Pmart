"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.margService = exports.MargService = void 0;var _logger = require("../../utils/logger");
var _marg = require("./marg.client");


class MargService {
  /**
   * Syncs products from MARG ERP to PMart MongoDB
   */
  async syncProductsFromMarg() {
    _logger.logger.info('[MargService] Syncing products from MARG ERP...');
    try {
      const products = await _marg.margClient.fetchProducts();
      // TODO: Map and upsert to MongoDB

      return {
        success: true,
        syncedCount: products.length,
        failedCount: 0,
        errors: []
      };
    } catch (error) {
      _logger.logger.error('[MargService] Error syncing products from MARG', error);
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Pushes a completed order to MARG ERP
   */
  async pushOrderToMarg(orderData) {
    _logger.logger.info(`[MargService] Pushing order ${orderData._id} to MARG ERP...`);
    // TODO: Map Pmart Order to MargOrder
    const success = await _marg.margClient.pushOrder({
      orderId: orderData._id.toString(),
      totalAmount: orderData.totalAmount,
      items: [], // Map items here
      customerPhone: '', // Get from customer
      paymentMode: orderData.paymentMethod
    });

    return success;
  }
}exports.MargService = MargService;

const margService = exports.margService = new MargService();