import { env } from '../../config/env';
import { logger } from '../../utils/logger';

interface RouteResponse {
  geometry: any;
  distanceMeters: number;
  durationSeconds: number;
}

interface CacheEntry {
  data: RouteResponse;
  expiresAt: number;
}

export class RoutingService {
  private cache: Map<string, CacheEntry> = new Map();
  private maxCacheSize = 1000;
  private pendingRequests: Map<string, Promise<RouteResponse>> = new Map();

  /**
   * Normalizes a coordinate to 5 decimal places (~1.1m precision)
   * This increases cache hits for coordinates that are functionally identical.
   */
  private normalizeCoordinate(coord: number): number {
    return Number(coord.toFixed(5));
  }

  /**
   * Generates a deterministic cache key.
   */
  private getCacheKey(origin: number[], destination: number[], profile: string): string {
    const oLng = this.normalizeCoordinate(origin[0]);
    const oLat = this.normalizeCoordinate(origin[1]);
    const dLng = this.normalizeCoordinate(destination[0]);
    const dLat = this.normalizeCoordinate(destination[1]);
    return `${profile}_${oLng},${oLat}_${dLng},${dLat}`;
  }

  private evictExpiredOrOldest() {
    const now = Date.now();
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      } else if (entry.expiresAt < oldestTime) {
        oldestTime = entry.expiresAt;
        oldestKey = key;
      }
    }

    // If still at capacity, delete the oldest
    if (this.cache.size >= this.maxCacheSize && oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Fetches a route from OSRM, utilizing an in-memory cache and deduplicating concurrent requests.
   */
  public async getRoute(origin: number[], destination: number[], profile: string = 'driving'): Promise<RouteResponse> {
    const cacheKey = this.getCacheKey(origin, destination, profile);
    const now = Date.now();

    // 1. Check Cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      if (cached.expiresAt > now) {
        return cached.data;
      } else {
        this.cache.delete(cacheKey); // Expired
      }
    }

    // 2. Check Pending Requests (Deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // 3. Fetch from upstream
    const fetchPromise = this.fetchFromOSRM(origin, destination, profile)
      .then((data) => {
        // Enforce cache bounds
        if (this.cache.size >= this.maxCacheSize) {
          this.evictExpiredOrOldest();
        }

        // Cache the successful result
        this.cache.set(cacheKey, {
          data,
          expiresAt: Date.now() + (env.OSRM_CACHE_TTL * 1000)
        });

        return data;
      })
      .finally(() => {
        this.pendingRequests.delete(cacheKey);
      });

    this.pendingRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  private async fetchFromOSRM(origin: number[], destination: number[], profile: string): Promise<RouteResponse> {
    const url = `https://router.project-osrm.org/route/v1/${profile}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`OSRM API returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found from OSRM');
      }

      const route = data.routes[0];
      return {
        geometry: route.geometry,
        distanceMeters: route.distance,
        durationSeconds: route.duration
      };
    } catch (error: any) {
      logger.error(`[RoutingService] Upstream fetch failed: ${error.message}`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const routingService = new RoutingService();
