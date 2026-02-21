
import { 
  ScoreMetric, 
  BaselineRecord, 
  AuditResponse, 
  Prescription, 
  ChronicityScore, 
  TreatmentPlan, 
  UserRole, 
  PrescriptionExecutionCard 
} from "../types";

// ALIGNED WITH CANONICAL FAILURE CLASSES
const PRESCRIPTION_LIBRARY: Prescription[] = [
  { id: "TX_CAT_AMB", signalId: "entity_block", metric: "AI_VISIBILITY", label: "Authoritative Category Declaration", expectedImpact: 20, effort: 4, automationRisk: 0.1, tradeOffPenalty: 0.1, rationale: "Resolves CATEGORY AMBIGUITY by defining a single primary role for the entity." },
  { id: "TX_EXP_FAIL", signalId: "ans_first", metric: "ANSWER_ENGINE_READINESS", label: "Explicit Factual Anchoring", expectedImpact: 18, effort: 3, automationRisk: 0.2, tradeOffPenalty: 0.0, rationale: "Resolves EXPLAINABILITY FAILURE by converting implied claims into compressible properties." },
  { id: "TX_DEF_LANG", signalId: "neutral_tone", metric: "CITATION_LIKELIHOOD", label: "Defensive Qualifier Implementation", expectedImpact: 15, effort: 2, automationRisk: 0.4, tradeOffPenalty: 0.5, rationale: "Resolves DEFENSIVE LANGUAGE ABSENCE by providing AI-safe hedging language." },
  { id: "TX_CON_OMIT", signalId: "fact_data", metric: "ANSWER_ENGINE_READINESS", label: "Operational Constraint Declaration", expectedImpact: 12, effort: 5, automationRisk: 0.1, tradeOffPenalty: 0.2, rationale: "Resolves CONSTRAINT OMISSION by defining explicit price, time, and usage boundaries." },
  { id: "TX_EXC_BOUND", signalId: "fact_data", metric: "AI_VISIBILITY", label: "Exclusion Boundary Definition", expectedImpact: 10, effort: 3, automationRisk: 0.3, tradeOffPenalty: 0.2, rationale: "Resolves EXCLUSION BOUNDARY MISSING by clarifying use cases where the entity is NOT suitable." },
  { id: "TX_ADJ_COMP", signalId: "neutral_tone", metric: "CITATION_LIKELIHOOD", label: "Adjective Compression Removal", expectedImpact: 18, effort: 2, automationRisk: 0.5, tradeOffPenalty: 0.6, rationale: "Resolves ADJECTIVE COMPRESSION FAILURE by replacing subjective bias with measurable facts." }
];

const EXECUTION_CONTENT_MAP: Record<string, any> = {
  "TX_CAT_AMB": {
    action: "Introduce a single authoritative category declaration. Subordinate all secondary roles to a 'Who we are' block.",
    forbidden: ["Positioning claims", "Marketing narrative", "Category overlap"],
    scope: ["Organization About page", "Header Schema"],
    example: { before: "Service, store, and community hub.", after: "Entity is a [Specific Category] specializing in [Primary Function]." },
    checklist: ["One primary role only", "Schema match established"]
  },
  "TX_EXP_FAIL": {
    action: "Add explicit factual anchors for all implied claims. Convert adjectives into stated properties.",
    forbidden: ["Persuasive copy", "Narrative expansions"],
    scope: ["Service landing pages", "Pillar content"],
    example: { before: "Fast and reliable.", after: "Performance: [Numeric Metric] | Reliability: [Verified Uptime]." },
    checklist: ["Facts are text-parseable", "Implied claims removed"]
  },
  "TX_DEF_LANG": {
    action: "Implement AI-safe hedging qualifiers. Ensure every claim includes a verification pathway.",
    forbidden: ["Unqualified superlatives", "Absolute promises"],
    scope: ["Risk disclosures", "Help articles"],
    example: { before: "Guaranteed results for everyone.", after: "Outcome subject to [Condition] as verified by [Path]." },
    checklist: ["Hedging language present", "Verification paths defined"]
  },
  "TX_CON_OMIT": {
    action: "Declare operational constraints explicitly. Define boundaries for price, availability, and eligibility.",
    forbidden: ["Hidden pricing", "Vague availability"],
    scope: ["Product grids", "Contact pages"],
    example: { before: "Affordable solutions.", after: "Pricing from $X - $Y for [Service Level] in [Region]." },
    checklist: ["Constraints declared", "Pricing boundaries visible"]
  },
  "TX_EXC_BOUND": {
    action: "Define negative applicability. State clearly who should NOT use this service.",
    forbidden: ["Total market appeal", "Universal suitability claims"],
    scope: ["Onboarding documentation", "Intro copy"],
    example: { before: "Solution for all industries.", after: "Solution specifically for [Industry A]; unsuitable for [Industry B] due to [Reason]." },
    checklist: ["Exclusion criteria listed", "Boundary clarity achieved"]
  },
  "TX_ADJ_COMP": {
    action: "Perform an Adjective Audit. Replace experiential language with measurable properties.",
    forbidden: ["Tone optimization", "Brand voice enhancements"],
    scope: ["Factual definitions", "Core descriptions"],
    example: { before: "Innovative revolutionary platform.", after: "Platform executes [Mechanism] with [Accuracy Level] precision." },
    checklist: ["Subjective descriptors removed", "Measurable properties added"]
  }
};

export const TreatmentGenerator = {
  calculateChronicity(baseline: BaselineRecord, sandboxSnapshots: AuditResponse[]): Record<ScoreMetric, ChronicityScore> {
    const metrics: ScoreMetric[] = ["AI_VISIBILITY", "CITATION_LIKELIHOOD", "ANSWER_ENGINE_READINESS"];
    const results: any = {};
    metrics.forEach(m => {
      const key = m === "AI_VISIBILITY" ? "aiVisibility" : m === "CITATION_LIKELIHOOD" ? "citationLikelihood" : "answerEngineReadiness";
      const sev = 100 - baseline.scores[key];
      results[m] = { metric: m, severity: sev, crossLift: 0, unlockPotential: 0, harmPenalty: 0, totalIndex: sev };
    });
    return results;
  },

  generatePlan(baseline: BaselineRecord, sandboxSnapshots: AuditResponse[], role: UserRole): TreatmentPlan {
    const chronicity = this.calculateChronicity(baseline, sandboxSnapshots);
    const primary = (Object.values(chronicity) as ChronicityScore[]).sort((a,b) => b.totalIndex - a.totalIndex)[0].metric;
    
    const prescriptions = PRESCRIPTION_LIBRARY
      .filter(p => p.metric === primary)
      .map((p, i) => ({ prescription: p, priority: i + 1, leverage: p.expectedImpact / p.effort, remediationState: 'not_started' as const }))
      .sort((a,b) => b.leverage - a.leverage);

    return {
      primaryChronicMetric: primary,
      chronicityScores: chronicity,
      prescriptions,
      expectedOutcomeSummary: "Structural resolution of AI discovery failures via canonical prescriptions.",
      verificationProtocol: { requirements: ["Signal deployment verification"], stopConditions: ["Negative delta detection"] },
      // FIX: Use new Date() instead of Date.now() to match expected 'Date' type in TreatmentPlan interface
      timestamp: new Date(),
      roleContext: role
    };
  },

  generateExecutionCard(pData: any, primaryDisorder: ScoreMetric, sandbox: any, baseline: any): PrescriptionExecutionCard {
    const p = pData.prescription;
    const content = EXECUTION_CONTENT_MAP[p.id] || { action: p.rationale, forbidden: ["Non-structural changes"], scope: ["All core paths"], example: { before: "...", after: "..." }, checklist: ["Action verified"] };
    
    return {
      cardId: `EX-${p.id}-${Date.now()}`,
      prescriptionId: p.id,
      primaryDisorder,
      priorityStage: pData.priority,
      rationale: p.rationale,
      action: { description: content.action, forbiddenActions: content.forbidden },
      scope: { applyTo: content.scope, excludeFrom: [] },
      example: content.example,
      checklist: content.checklist,
      verification: { reAuditRequired: true, expectedDeltaRange: { metric: p.metric, min: 5, max: 20 }, adjacentMetricTolerance: 5, timeWindowDays: 14 },
      stopConditions: ["Negative delta detection"],
      nextStepLock: { lockedUntilVerified: true, reason: "Structural integrity required." }
    };
  }
};
