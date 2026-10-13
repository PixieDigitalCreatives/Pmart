"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.margClient = exports.MargClient = void 0;var _logger = require("../../utils/logger");


/**
 * MARG ERP API Client abstraction.
 * Currently BLOCKED pending official MARG API documentation/credentials.
 */
class MargClient {



  constructor() {
    this.baseUrl = process.env.MARG_API_URL || 'http://localhost:8080/marg';
    this.apiKey = process.env.MARG_API_KEY || '';
  }

  async fetchProducts(lastSyncTime) {
    _logger.logger.warn('[MargClient] fetchProducts called, but MARG integration is BLOCKED.');
    // MOCK implementation
    return [];
  }

  async pushOrder(order) {
    _logger.logger.warn(`[MargClient] pushOrder called for ${order.orderId}, but MARG integration is BLOCKED.`);
    // MOCK implementation
    return true;
  }
}exports.MargClient = MargClient;

const margClient = exports.margClient = new MargClient();