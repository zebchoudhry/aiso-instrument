/**
 * API handler modules - used by api/[[...path]].ts router.
 */
export { default as extract } from './extract';
export { default as extractFromHtml } from './extract-from-html';
export { default as audits } from './audits';
export { default as auditEnrich } from './audit-enrich';
export { default as config } from './config';
export { default as competitive } from './competitive';
export { default as quickAudit } from './quick-audit';
export { default as handoverArtifacts } from './handover-artifacts';
export { default as deploymentChecklist } from './deployment-checklist';
export { default as factualAnchors } from './factual-anchors';
export { default as answerTest } from './answer-test';
export { default as competitorDiscovery } from './competitor-discovery';
export { default as roadmap } from './roadmap';
export { default as users } from './users';
