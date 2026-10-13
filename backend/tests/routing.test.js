'use strict';

const { RoutingService } = require('../src/modules/routing/routing.service');

const osrmResponse = { code: 'Ok', routes: [{ geometry: { type: 'LineString', coordinates: [[84.01, 24.95], [84.02, 24.96]] }, distance: 1200, duration: 300 }] };

describe('RoutingService', () => {
  const realFetch = global.fetch;
  let fetchMock;
  let service;

  beforeEach(() => {
    service = new RoutingService();
    fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => osrmResponse });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('maps the OSRM response and caches it', async () => {
    const route = await service.getRoute([84.01, 24.95], [84.02, 24.96]);
    expect(route).toEqual({ geometry: osrmResponse.routes[0].geometry, distanceMeters: 1200, durationSeconds: 300 });
    await service.getRoute([84.010001, 24.950001], [84.02, 24.96]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('de-duplicates concurrent identical requests', async () => {
    await Promise.all([service.getRoute([1, 1], [2, 2]), service.getRoute([1, 1], [2, 2])]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(service.getRoute([1, 1], [2, 2])).rejects.toThrow(/status 500/);
    await service.getRoute([1, 1], [2, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
