import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as handlers from '../lib/apiHandlers';

const ROUTES: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<void>> = {
  'extract': handlers.extract,
  'extract-from-html': handlers.extractFromHtml,
  'audits': handlers.audits,
  'audit-enrich': handlers.auditEnrich,
  'config': handlers.config,
  'competitive': handlers.competitive,
  'quick-audit': handlers.quickAudit,
  'handover-artifacts': handlers.handoverArtifacts,
  'deployment-checklist': handlers.deploymentChecklist,
  'factual-anchors': handlers.factualAnchors,
  'answer-test': handlers.answerTest,
  'competitor-discovery': handlers.competitorDiscovery,
  'roadmap': handlers.roadmap,
  'users': handlers.users,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let path = req.query.path as string[] | undefined;
  let route = Array.isArray(path) ? path[0] : (path || '').split('/')[0] || '';

  // Fallback: derive route from req.url when Vercel doesn't populate path (non-Next.js)
  if (!route && req.url) {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const match = pathname.match(/^\/api\/([^/?]+)/);
      if (match) route = match[1];
    } catch (_) {}
  }

  const routeHandler = ROUTES[route];
  if (!routeHandler) {
    return res.status(404).json({ error: `Unknown API route: ${route || '(empty)'}` });
  }

  return routeHandler(req, res);
}
