'use strict';

const { z } = require('zod');
const { routingService } = require('./routing.service');
const { logger } = require('../../utils/logger');

const COORD = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;

const routeQuerySchema = z.object({
  origin: z.string().regex(COORD, 'Origin must be in format lng,lat'),
  destination: z.string().regex(COORD, 'Destination must be in format lng,lat'),
  profile: z.enum(['driving', 'cycling', 'walking']).optional().default('driving')
});

const getRoute = async (req, res) => {
  const parsed = routeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Invalid routing parameters' });
  }

  const { origin, destination, profile } = parsed.data;
  const o = origin.split(',').map(Number);
  const d = destination.split(',').map(Number);
  if (o[0] === d[0] && o[1] === d[1]) {
    return res.status(400).json({ success: false, code: 'SAME_POINT', message: 'Origin and destination are the same' });
  }

  try {
    const data = await routingService.getRoute(o, d, profile);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error(`[RoutingController] ${error.message}`);
    if (error.name === 'AbortError') {
      return res.status(504).json({ success: false, code: 'UPSTREAM_TIMEOUT', message: 'Routing service timed out' });
    }
    return res.status(502).json({ success: false, code: 'UPSTREAM_ERROR', message: 'Routing service unavailable' });
  }
};

module.exports = { getRoute };
