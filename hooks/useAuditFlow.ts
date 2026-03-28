import { useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import {
  AuditResponse,
  UserRole,
  ExtractionData,
  TreatmentPlan,
  QueryPackResponse,
  FixLibraryResponse,
  ClientTranslationResponse,
} from '../types';
import { performQuickAudit } from '../services/geminiClient';
import { TreatmentGenerator } from '../services/treatmentService';
import { BaselineStore } from '../services/storageService';

export function getDomain(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export function getHostname(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(href).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    const host =
      trimmed
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .split('/')[0]
        .split('?')[0]
        .split('#')[0] || '';
    return host.replace(/^www\./, '');
  }
}

export function useAuditFlow(userRole: UserRole, navigate: NavigateFunction) {
  const [observedAudit, setObservedAudit] = useState<AuditResponse | null>(null);
  const [lastExtractionData, setLastExtractionData] = useState<ExtractionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usePasteFallback, setUsePasteFallback] = useState(false);
  const [lastAuditId, setLastAuditId] = useState<string | null>(null);
  const [lastAuditContactEmail, setLastAuditContactEmail] = useState('');
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const [isFixLoading, setIsFixLoading] = useState(false);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const [queryPack, setQueryPack] = useState<QueryPackResponse | null>(null);
  const [fixLibrary, setFixLibrary] = useState<FixLibraryResponse | null>(null);
  const [clientBriefing, setClientBriefing] = useState<ClientTranslationResponse | null>(null);
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);

  const handleAudit = async (url: string, name: string, email: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setObservedAudit(null);
    setLastAuditContactEmail(email);

    try {
      setLoadingStage('Harvesting live website signals…');

      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!extractRes.ok) {
        const errBody = await extractRes.text();
        let message = 'Source website unreachable or blocked.';
        if (extractRes.status === 429) {
          message = 'Rate limit exceeded. Max 10 requests per minute. Please try again later.';
        } else if (extractRes.status >= 500) {
          message = 'Extraction service error. Please try again later.';
        } else {
          try {
            const errJson = JSON.parse(errBody);
            if (typeof errJson?.error === 'string') message = errJson.error;
            if (typeof errJson?.details === 'string') message += ` ${errJson.details}`;
          } catch (_) {
            if (errBody && errBody.length < 200) message = errBody;
          }
        }
        setUsePasteFallback(true);
        throw new Error(message.trim());
      }

      let extractionData: ExtractionData;
      try {
        extractionData = await extractRes.json();
      } catch (parseErr) {
        console.error('[handleAudit] Failed to parse extract response as JSON:', parseErr);
        throw new Error(
          'Invalid response from extraction service (expected JSON). The API may not be available. For local dev, run `vercel dev` or ensure the API is proxied correctly.'
        );
      }
      console.log('[handleAudit] extractionData received successfully');
      setLastExtractionData(extractionData);

      setLoadingStage('Computing baseline AI readiness…');

      const baseAudit = await performQuickAudit(url, name, extractionData);

      const fullAudit: AuditResponse = {
        ...baseAudit,
        keyFindings: [],
        epistemicGrounding: {
          verifiedFacts: [],
          potentialHallucinationRisks: []
        },
        remediationBlueprint: {
          immediateFixes: [],
          structuralChanges: []
        }
      };

      setObservedAudit(fullAudit);
      setIsLoading(false);

      const saveRes = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          name,
          extractionData,
          auditResult: fullAudit,
          findings: null,
          fixLibrary: null,
          clientBriefing: null,
        }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      const savedAuditId = saveData?.id ?? null;
      if (savedAuditId) setLastAuditId(savedAuditId);

      const domain = getDomain(url);
      BaselineStore.saveBaseline({
        domain,
        timestamp: baseAudit.summary.timestamp,
        scores: baseAudit.summary.scores,
        aiVisibilityLabel: baseAudit.summary.aiVisibilityLabel,
        heuristicVersion: baseAudit.summary.heuristicVersion,
        inputSignalHash: baseAudit.summary.inputSignalHash,
        isFrozen: false
      });

      setIsQueryLoading(true);
      setIsFixLoading(true);
      setIsBriefLoading(true);
      fetch('/api/audit-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          name,
          extractionData,
          audit: fullAudit
        })
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
        .then(({ findings, queryPack: qp, fixLibrary: fl, clientTranslation }) => {
          setObservedAudit((prev) =>
            prev ? { ...prev, keyFindings: findings ?? [] } : prev
          );
          setFixLibrary(fl ?? null);
          setClientBriefing(clientTranslation ?? null);
          setQueryPack(qp ?? null);
          if (savedAuditId && (findings?.length || fl || clientTranslation || qp)) {
            fetch('/api/audits', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: savedAuditId, findings, fixLibrary: fl, clientBriefing: clientTranslation, queryPack: qp }),
            }).catch(() => {});
          }
        })
        .catch((err) => {
          setErrorMessage(
            'Audit enrichment failed (fix library, query pack, briefing may be incomplete): ' +
            (err instanceof Error ? err.message : 'Unknown error')
          );
        })
        .finally(() => {
          setIsQueryLoading(false);
          setIsFixLoading(false);
          setIsBriefLoading(false);
        });

      const plan = TreatmentGenerator.generatePlan(
        {
          domain: url,
          timestamp: Date.now(),
          heuristicVersion: baseAudit.summary.heuristicVersion,
          scores: baseAudit.summary.scores,
          aiVisibilityLabel: baseAudit.summary.aiVisibilityLabel,
          inputSignalHash: baseAudit.summary.inputSignalHash
        },
        [],
        userRole
      );

      setTreatmentPlan(plan);
    } catch (err) {
      setIsLoading(false);
      console.error('[handleAudit] Audit failed:', err instanceof Error ? err.message : err);
      if (err instanceof Error && err.stack) console.error('[handleAudit] Stack:', err.stack);
      const msg = err instanceof Error ? err.message : 'Diagnostic failed due to an unexpected error.';
      setErrorMessage(msg);
      if (msg.includes('unreachable') || msg.includes('blocked') || msg.includes('Extraction service')) {
        setUsePasteFallback(true);
      }
    }
  };

  const handleAuditFromHtml = async (html: string, url: string, name: string, email: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setObservedAudit(null);
    setUsePasteFallback(false);
    setLastAuditContactEmail(email);

    try {
      setLoadingStage('Processing pasted HTML…');

      const extractRes = await fetch('/api/extract-from-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, url: url || 'https://example.com' }),
      });

      if (!extractRes.ok) {
        const errBody = await extractRes.text();
        let message = 'HTML processing failed.';
        try {
          const errJson = JSON.parse(errBody);
          if (typeof errJson?.error === 'string') message = errJson.error;
        } catch (_) {}
        throw new Error(message);
      }

      const extractionData: ExtractionData = await extractRes.json();
      setLastExtractionData(extractionData);
      setLoadingStage('Computing baseline AI readiness…');

      const effectiveUrl = url || 'https://example.com';
      const baseAudit = await performQuickAudit(effectiveUrl, name, extractionData);

      const fullAudit: AuditResponse = {
        ...baseAudit,
        keyFindings: [],
        epistemicGrounding: { verifiedFacts: [], potentialHallucinationRisks: [] },
        remediationBlueprint: { immediateFixes: [], structuralChanges: [] },
      };

      setObservedAudit(fullAudit);
      setIsLoading(false);

      const saveRes = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: effectiveUrl,
          name,
          extractionData,
          auditResult: fullAudit,
          findings: null,
          fixLibrary: null,
          clientBriefing: null,
        }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      const savedAuditId = saveData?.id ?? null;
      if (savedAuditId) setLastAuditId(savedAuditId);

      const domain = getDomain(effectiveUrl);
      BaselineStore.saveBaseline({
        domain,
        timestamp: baseAudit.summary.timestamp,
        scores: baseAudit.summary.scores,
        aiVisibilityLabel: baseAudit.summary.aiVisibilityLabel,
        heuristicVersion: baseAudit.summary.heuristicVersion,
        inputSignalHash: baseAudit.summary.inputSignalHash,
        isFrozen: false,
      });

      setIsQueryLoading(true);
      setIsFixLoading(true);
      setIsBriefLoading(true);
      fetch('/api/audit-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: effectiveUrl,
          name,
          extractionData,
          audit: fullAudit,
        }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
        .then(({ findings, queryPack: qp, fixLibrary: fl, clientTranslation }) => {
          setObservedAudit((prev) =>
            prev ? { ...prev, keyFindings: findings ?? [] } : prev
          );
          setFixLibrary(fl ?? null);
          setClientBriefing(clientTranslation ?? null);
          setQueryPack(qp ?? null);
          if (savedAuditId && (findings?.length || fl || clientTranslation || qp)) {
            fetch('/api/audits', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: savedAuditId, findings, fixLibrary: fl, clientBriefing: clientTranslation, queryPack: qp }),
            }).catch(() => {});
          }
        })
        .catch((err) => {
          setErrorMessage(
            'Audit enrichment failed (fix library, query pack, briefing may be incomplete): ' +
            (err instanceof Error ? err.message : 'Unknown error')
          );
        })
        .finally(() => {
          setIsQueryLoading(false);
          setIsFixLoading(false);
          setIsBriefLoading(false);
        });

      const plan = TreatmentGenerator.generatePlan(
        {
          domain: effectiveUrl,
          timestamp: Date.now(),
          heuristicVersion: baseAudit.summary.heuristicVersion,
          scores: baseAudit.summary.scores,
          aiVisibilityLabel: baseAudit.summary.aiVisibilityLabel,
          inputSignalHash: baseAudit.summary.inputSignalHash,
        },
        [],
        userRole
      );

      setTreatmentPlan(plan);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(
        err instanceof Error ? err.message : 'HTML processing failed.'
      );
    }
  };

  const handleReset = () => {
    setObservedAudit(null);
    setLastAuditId(null);
    setLastExtractionData(null);
    setQueryPack(null);
    setFixLibrary(null);
    setClientBriefing(null);
    setTreatmentPlan(null);
    setErrorMessage(null);
    setUsePasteFallback(false);
    setLastAuditContactEmail('');
  };

  return {
    observedAudit,
    setObservedAudit,
    lastExtractionData,
    setLastExtractionData,
    isLoading,
    loadingStage,
    errorMessage,
    setErrorMessage,
    usePasteFallback,
    lastAuditId,
    lastAuditContactEmail,
    isQueryLoading,
    isFixLoading,
    isBriefLoading,
    queryPack,
    fixLibrary,
    clientBriefing,
    treatmentPlan,
    setTreatmentPlan,
    handleAudit,
    handleAuditFromHtml,
    handleReset,
  };
}
