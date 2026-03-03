import { GoogleGenAI, Type } from '@google/genai';
import { FactualAnchoringAsset } from '../types.js';
import { generateFactualAnchorsClaude, isGeminiQuotaError } from './claudeService.js';

const CLINICAL_ASSET_INSTRUCTION = `You are an AI Remediation Asset Generator operating in CLINICAL MODE.

Your task is to generate deployable remediation assets for the treatment:
"Explicit Factual Anchoring".

STRICT RULES:
1. MANDATORY SOURCE: Use the provided AUDIT FINDINGS as the absolute source of truth for facts (e.g., locations, sub-brands, services).
2. NO HALLUCINATION: Do NOT guess locations. If findings mention "Liverpool", you MUST use "Liverpool". Do NOT use "Birmingham" or any other city unless explicitly stated in findings.
3. NO MARKETING: Do NOT write marketing copy or persuasive language.
4. NO SUPERLATIVES: Do NOT claim superiority, rankings, or popularity.
5. NEUTRAL TONE: Output MUST be neutral, explanatory, and verifiable.

If a fact cannot be stated explicitly based on the provided findings, do not include it.`;

export async function generateFactualAnchors(
  brandData: { name: string; domain: string; category: string; location: string },
  findings: string[] = []
): Promise<FactualAnchoringAsset> {
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const prompt = `
  INPUT CONTEXT:
  {
    "brand_meta": ${JSON.stringify(brandData)},
    "verified_audit_findings": ${JSON.stringify(findings)},
    "treatment_objective": "Convert implied local authority into explicit factual anchors for answer engine ingestion."
  }`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          systemInstruction: CLINICAL_ASSET_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ['factual_anchors', 'deployment_targets', 'verification_criteria'],
            properties: {
              factual_anchors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ['anchor_type', 'content'],
                  properties: {
                    anchor_type: {
                      type: Type.STRING,
                      enum: ['entity_definition', 'operational_fact', 'contextual_explainer'],
                    },
                    content: { type: Type.STRING },
                  },
                },
              },
              deployment_targets: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ['page_type', 'placement_guidance'],
                  properties: {
                    page_type: { type: Type.STRING },
                    placement_guidance: { type: Type.STRING },
                  },
                },
              },
              verification_criteria: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
      });

      return JSON.parse(response.text);
    } catch (err) {
      if (isGeminiQuotaError(err) && anthropicKey) {
        console.warn('[remediationService] Gemini quota exceeded, falling back to Claude');
        return generateFactualAnchorsClaude(brandData, findings);
      }
      throw err;
    }
  }

  if (anthropicKey) {
    return generateFactualAnchorsClaude(brandData, findings);
  }

  throw new Error('GEMINI_API_KEY, API_KEY, or ANTHROPIC_API_KEY is required');
}
