import { RoutingService } from '../routing.service';
import { env } from '../../../config/env';

// Mock fetch globally
const globalFetch = global.fetch;

describe('RoutingService', () => {
  let routingService: RoutingService;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    routingService = new RoutingService();
    mockFetch = jest.fn();
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    global.fetch = globalFetch;
    jest.clearAllMocks();
  });

  const mockOsrmResponse = {
    code: 'Ok',
    routes: [
      {
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        distance: 1000,
        duration: 600
      }
    ]
  };

  it('should fetch from upstream on cache miss', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOsrmResponse
    });

    const route = await routingService.getRoute([0, 0], [1, 1]);
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(route.distanceMeters).toBe(1000);
    expect(route.durationSeconds).toBe(600);
  });

  it('should serve from cache on identical subsequent request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOsrmResponse
    });

    await routingService.getRoute([0, 0], [1, 1]);
    const route2 = await routingService.getRoute([0, 0], [1, 1]); // Cache hit

    expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once
    expect(route2.distanceMeters).toBe(1000);
  });

  it('should deduplicate concurrent requests (promise sharing)', async () => {
    // Delay the mock response to simulate concurrent requests
    mockFetch.mockImplementationOnce(() => new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ok: true,
          json: async () => mockOsrmResponse
        });
      }, 50);
    }));

    const [route1, route2] = await Promise.all([
      routingService.getRoute([0, 0], [1, 1]),
      routingService.getRoute([0, 0], [1, 1])
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1); // Only one network request
    expect(route1).toBe(route2); // Returns the exact same promise resolution
  });

  it('should not cache failed or malformed responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    await expect(routingService.getRoute([0, 0], [1, 1])).rejects.toThrow();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOsrmResponse
    });

    // Second call should attempt network request again (cache miss)
    await routingService.getRoute([0, 0], [1, 1]);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should normalize coordinates to 5 decimals for caching', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOsrmResponse
    });

    // 0.000001 difference shouldn't trigger a new request (falls within 5 decimal places)
    await routingService.getRoute([0.000001, 0.000001], [1.000001, 1.000001]);
    await routingService.getRoute([0.000002, 0.000002], [1.000002, 1.000002]); // Cache hit

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should invalidate/bypass cache on different routing inputs', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockOsrmResponse
    });

    await routingService.getRoute([0, 0], [1, 1]);
    await routingService.getRoute([0, 0], [2, 2]); // Different destination

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should evict expired cache entries', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockOsrmResponse
    });

    // Mock Date.now to control time
    const originalDateNow = Date.now;
    let mockNow = 1000000;
    global.Date.now = jest.fn(() => mockNow);

    await routingService.getRoute([0, 0], [1, 1]); // Cached with expiration based on env.OSRM_CACHE_TTL
    
    // Fast-forward time past TTL
    mockNow += (env.OSRM_CACHE_TTL * 1000) + 1000;

    await routingService.getRoute([0, 0], [1, 1]); // Should trigger new request

    expect(mockFetch).toHaveBeenCalledTimes(2);

    global.Date.now = originalDateNow;
  });

});
