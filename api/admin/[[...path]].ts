import type { VercelRequest, VercelResponse } from '@vercel/node';
import adminAudits from '../../lib/apiHandlers/admin-audits.js';

type RouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;
const ROUTES: Record<string, RouteHandler> = {
  'audits': adminAudits as RouteHandler,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.query.path as string[] | string | undefined;
  const route = Array.isArray(path) ? path[0] : (typeof path === 'string' ? path : '').split('/')[0] || '';

  const routeHandler = ROUTES[route];
  if (!routeHandler) {
    return res.status(404).json({ error: `Unknown admin route: ${route || '(empty)'}` });
  }

  return routeHandler(req, res);
}
