import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { routingService } from './routing.service';
import { logger } from '../../utils/logger';

const routeQuerySchema = z.object({
  origin: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'Origin must be in format lng,lat'),
  destination: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'Destination must be in format lng,lat'),
  profile: z.string().optional().default('driving')
});

export const getRoute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = routeQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid routing parameters',
        errors: parseResult.error.format()
      });
    }

    const { origin, destination, profile } = parseResult.data;

    const oParts = origin.split(',').map(Number);
    const dParts = destination.split(',').map(Number);

    if (oParts[0] === dParts[0] && oParts[1] === dParts[1]) {
      return res.status(400).json({ success: false, message: 'Origin and destination are the same' });
    }

    const routeData = await routingService.getRoute(oParts, dParts, profile);

    return res.status(200).json({
      success: true,
      data: routeData
    });
  } catch (error: any) {
    logger.error(`[RoutingController] Error fetching route: ${error.message}`);
    // If it's an abort error, return 504
    if (error.name === 'AbortError') {
      return res.status(504).json({ success: false, message: 'Upstream routing service timeout' });
    }
    return res.status(502).json({ success: false, message: 'Failed to fetch route from upstream service' });
  }
};
