import type {
  AuditResponse,
  TechnicalHandoverArtifacts,
  DeploymentChecklist,
  ExtractionData,
  PrescriptionExecutionCard
} from '../types.js';

export async function performQuickAudit(
  url: string,
  name: string,
  extractionData: ExtractionData
): Promise<AuditResponse> {
  const res = await fetch('/api/quick-audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, name, extractionData })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.details ?? data.error ?? res.statusText);
  }
  return res.json();
}

export async function generateHandoverArtifacts(
  card: PrescriptionExecutionCard,
  subjectName: string
): Promise<TechnicalHandoverArtifacts> {
  const res = await fetch('/api/handover-artifacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card, subjectName })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.details ?? data.error ?? res.statusText);
  }
  return res.json();
}

export async function generateDeploymentChecklist(
  _card: PrescriptionExecutionCard,
  _subjectName: string
): Promise<DeploymentChecklist> {
  // API removed to stay within Vercel Hobby 12-function limit. Returns empty checklist.
  return {
    deployment_checklist: [],
    deployment_notes_guidance: []
  };
}
