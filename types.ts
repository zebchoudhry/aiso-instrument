/** Response shape from /api/extract */
export interface ExtractionData {
  title: string;
  metaDescription: string;
  mainContent: string;
  schemaMarkup: string;
  headings: string[];
  wordCount: number;
  schemaCount: number;
  extractionCoverage: number;
  propositionalDensity?: number;
  citationAnchors?: string[];
  schemaTypes?: string[];
  errors?: string[];
  openGraph?: { title?: string; description?: string; image?: string; type?: string };
  twitterCard?: { card?: string; title?: string; description?: string };
  canonicalUrl?: string;
  sameAsUrls?: string[];
  datePublished?: string;
  dateModified?: string;
  author?: string;
  publisher?: string;
  robotsMeta?: string;
  hasBreadcrumbList?: boolean;
  contentFormats?: string[];
  firstPersonScore?: number;
  freshnessMonths?: number | null;
  isCrawlable?: boolean;
}

/** Signal coverage for AI citation report */
export interface SignalCoverageItem {
  category: string;
  signal: string;
  status: 'pass' | 'fail' | 'partial';
  value?: string | number | boolean;
  recommendation?: string;
}

export type ScoreMetric = 'AI_VISIBILITY' | 'CITATION_LIKELIHOOD' | 'ANSWER_ENGINE_READINESS';
export type AuditMode = 'OBSERVED' | 'SANDBOX' | 'STRESS_TEST';
export type UserRole = 'CLIENT' | 'CONSULTANT';

export interface ScoreSnapshot {
  aiVisibility: number;
  citationLikelihood: number;
  answerEngineReadiness: number;
  confidenceInterval: number;
  /** Overall 0–100 maturity; derived from the three metrics for dashboard */
  overallMaturityIndex?: number;
}

export interface ReadinessBreakdownItem {
  score: number;
  explanation: string;
}

export interface ReadinessScore {
  internal_ai_readiness_score: number;
  breakdown: {
    entity_clarity: ReadinessBreakdownItem;
    structural_signals: ReadinessBreakdownItem;
    compressibility: ReadinessBreakdownItem;
    corroboration: ReadinessBreakdownItem;
  };
}

export interface AuditFinding {
  label: string;
  confidence: number;
  diagnosticTrace: string;
  failureClass: string;
}

export interface MarketSynthesisDelta {
  consensus_winner: string;
  signal_gap_analysis: string[];
  entity_overlap_percentage: number;
  recommended_displacement_path: string;
}

export interface EntityQueryMapping {
  primary_intent_nodes: Array<{
    node: string;
    affinity_score: number;
    discovery_potential: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  unclaimed_semantic_territory: string[];
}

export interface DeepSynthesis {
  marketDelta: MarketSynthesisDelta;
  entityMapping: EntityQueryMapping;
  crossPlatformAudit: {
    platform: string;
    recognition_state: string;
    barrier: string;
  }[];
}

export interface AuditResponse {
  summary: {
    url: string;
    benchmarkUrl?: string;
    scores: ScoreSnapshot;
    aiVisibilityLabel: string;
    confidenceNote: string;
    timestamp: number;
    heuristicVersion: string;
    inputSignalHash: string;
    mode: AuditMode;
    subjectName?: string;
    tier1Verdict?: string;
    verdictMeaning?: string;
    readinessScore?: ReadinessScore;
  };
  keyFindings: AuditFinding[];
  whyThisMattersForAI: string[];
  clientReadyExplanation: string;
  howToImprove: string[];
  epistemicGrounding: {
    verifiedFacts: string[];
    potentialHallucinationRisks: string[];
  };
  remediationBlueprint?: {
    immediateFixes: unknown[];
    structuralChanges: unknown[];
  };
}

export interface BaselineRecord {
  domain: string;
  timestamp: number;
  scores: ScoreSnapshot;
  aiVisibilityLabel: string;
  heuristicVersion: string;
  inputSignalHash: string;
  isFrozen?: boolean;
}

export interface ChronicityScore {
  metric: ScoreMetric;
  severity: number;
  crossLift: number;
  unlockPotential: number;
  harmPenalty: number;
  totalIndex: number;
}

export interface DiagnosticReport {
  reportId: string;
  timestamp: number;
  url: string;
  email: string;
  verdict: string;
  executiveVerdict: string;
  failureClasses: Array<{
    name: string;
    definition: string;
    impact: string;
  }>;
  evidence: string[];
  prescriptions: Array<{
    name: string;
    action: string;
    forbidden: string[];
  }>;
  status: string;
}

export interface Prescription {
  id: string;
  signalId?: string;
  metric: ScoreMetric;
  label: string;
  expectedImpact: number;
  effort: number;
  rationale: string;
  automationRisk?: number;
  tradeOffPenalty?: number;
}

export interface TreatmentPlan {
  primaryChronicMetric: ScoreMetric;
  chronicityScores: Record<ScoreMetric, ChronicityScore>;
  prescriptions: Array<{
    prescription: Prescription;
    priority: number;
    remediationState: 'not_started' | 'assets_generated';
    leverage: number;
    isOverridden?: boolean;
  }>;
  expectedOutcomeSummary: string;
  verificationProtocol: {
    requirements: string[];
    stopConditions: string[];
  };
  timestamp: Date;
  roleContext: UserRole;
}

export interface PrescriptionExecutionCard {
  cardId: string;
  prescriptionId: string;
  primaryDisorder: ScoreMetric;
  priorityStage: number;
  rationale: string;
  action: {
    description: string;
    forbiddenActions: string[];
  };
  scope: {
    applyTo: string[];
    excludeFrom: string[];
  };
  example: {
    before: string;
    after: string;
  };
  checklist: string[];
  verification: {
    reAuditRequired: boolean;
    expectedDeltaRange: { metric: string; min: number; max: number };
    adjacentMetricTolerance: number;
    timeWindowDays: number;
  };
  stopConditions: string[];
  nextStepLock: {
    lockedUntilVerified: boolean;
    reason: string;
  };
}

export interface TechnicalHandoverArtifacts {
  structural_blueprint: {
    target_architecture: string;
    entity_declaration_anchors: string[];
    required_schema_modifications: string[];
  };
  alignment_matrix: {
    observed_signal: string;
    prescribed_signal: string;
  };
  verification_protocol: any;
}

export interface DeploymentChecklist {
  deployment_checklist: Array<{
    step_id: string;
    description: string;
    evidence_required: string;
  }>;
  deployment_notes_guidance: string[];
}

export interface AuditDelta {
  delta_summary: any;
  observed_changes: string[];
  unchanged_elements: string[];
  next_verification_guidance: string[];
  confidence_note: string;
}

export interface ExecutiveReport {
  executive_summary: any;
}

export interface CommercialForecast {
  monthly_discovery_volume: number;
  market_intent_density: 'HIGH' | 'MEDIUM' | 'LOW';
  estimated_lead_value: number;
  projections: {
    year_one_total_opportunity: number;
  };
}

export interface FactualAnchoringAsset {
  factual_anchors: Array<{
    anchor_type: string;
    content: string;
  }>;
  deployment_targets: Array<{
    page_type: string;
    placement_guidance: string;
  }>;
  verification_criteria: string[];
}

/** Enrichment response types (minimal shapes for display components) */
export interface QueryPackResponse {
  queries?: string[];
  [key: string]: unknown;
}

export interface FixLibraryResponse {
  fixes?: unknown[];
  [key: string]: unknown;
}

export interface ClientTranslationResponse {
  summary?: string;
  [key: string]: unknown;
}

// --- Roadmap types ---

export interface RoadmapAction {
  title: string;
  why: string;
  expectedImpact: string;
  difficulty: 'Low' | 'Medium' | 'High';
}

export interface RoadmapPhase {
  objective: string;
  actions: RoadmapAction[];
}

export interface RoadmapScoreProjection {
  current: number;
  projected90Day: number;
  confidence: 'Low' | 'Medium' | 'High';
}

export interface RoadmapResponse {
  phase1: RoadmapPhase;
  phase2: RoadmapPhase;
  phase3: RoadmapPhase;
  scoreProjection: RoadmapScoreProjection;
}

export interface DiagnosisResult {
  summary: string;
  causes: string[];
  items: Array<{
    key: 'entity' | 'citation' | 'compressibility' | 'trust';
    title: string;
    cause: string;
    customerImpact: string;
    nextAction: string;
    expectedBenefit: string;
    priority: 'Now' | 'Next' | 'Later';
  }>;
}

export interface RoadmapPayload {
  overallScore: number;
  signalCoverageScore: number;
  citationHealthScore: number;
  contentDepthScore: number;
  authoritySignalsScore: number;
  diagnosis: DiagnosisResult;
  identifiedWeakSignals: string[];
  topOpportunities: string[];
  extractionSummary: {
    title: string;
    metaDescription: string;
    wordCount: number;
    mainContentExcerpt: string;
  };
  schemaTypes: string[];
  headings: string[];
  domain: string;
  queryPack: string[];
}

// --- AI Outcome Validation / Answer Test ---

export interface AIAnswerTestRequest {
  queries: string[];
  brandName: string;
  domain: string;
}

export interface AIAnswerTestResult {
  query: string;
  answer: string;
  brandMentioned: boolean;
  brandCited: boolean;
  competitors: string[];
}

export interface AIAnswerTestSummary {
  queriesTested: number;
  brandMentionRate: number;
  brandCitationRate: number;
}

export interface AIAnswerTestResponse {
  results: AIAnswerTestResult[];
  summary: AIAnswerTestSummary;
}
