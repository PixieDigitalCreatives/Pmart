'use strict';

const { env } = require('../../config/env');
const { logger } = require('../../utils/logger');

/**
 * Proxies route requests to the public OSRM server with an in-memory TTL cache
 * and de-duplication of concurrent identical requests.
 */
class RoutingService {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 1000;
    this.pendingRequests = new Map();
  }

  /** Rounds to 5 decimals (~1.1 m) so nearly identical points share a cache entry. */
  normalizeCoordinate(coord) {
    return Number(coord.toFixed(5));
  }

  getCacheKey(origin, destination, profile) {
    const [oLng, oLat] = origin.map((c) => this.normalizeCoordinate(c));
    const [dLng, dLat] = destination.map((c) => this.normalizeCoordinate(c));
    return `${profile}_${oLng},${oLat}_${dLng},${dLat}`;
  }

  evictExpiredOrOldest() {
    const now = Date.now();
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      } else if (entry.expiresAt < oldestTime) {
        oldestTime = entry.expiresAt;
        oldestKey = key;
      }
    }
    if (this.cache.size >= this.maxCacheSize && oldestKey) this.cache.delete(oldestKey);
  }

  async getRoute(origin, destination, profile = 'driving') {
    const cacheKey = this.getCacheKey(origin, destination, profile);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      if (cached.expiresAt > Date.now()) return cached.data;
      this.cache.delete(cacheKey);
    }

    if (this.pendingRequests.has(cacheKey)) return this.pendingRequests.get(cacheKey);

    const fetchPromise = this.fetchFromOSRM(origin, destination, profile)
      .then((data) => {
        if (this.cache.size >= this.maxCacheSize) this.evictExpiredOrOldest();
        this.cache.set(cacheKey, { data, expiresAt: Date.now() + env.OSRM_CACHE_TTL * 1000 });
        return data;
      })
      .finally(() => {
        this.pendingRequests.delete(cacheKey);
      });

    this.pendingRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  async fetchFromOSRM(origin, destination, profile) {
    const url = `https://router.project-osrm.org/route/v1/${profile}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`OSRM API returned status ${response.status}`);
      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error('No route found from OSRM');
      const route = data.routes[0];
      return { geometry: route.geometry, distanceMeters: route.distance, durationSeconds: route.duration };
    } catch (error) {
      logger.error(`[RoutingService] Upstream fetch failed: ${error.message}`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

const routingService = new RoutingService();

module.exports = { RoutingService, routingService };
