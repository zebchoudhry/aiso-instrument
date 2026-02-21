# AISO Instrument: CEO Proof & UX Plan

**Goal:** Prove to a CEO that our findings are correct, show what LLMs see and output, and demonstrate that our fixes work. Make the audit unmistakably clear and shareable.

---

## Part 1: CEO Proof Chain

### 1.1 "This is What LLMs See"

**What:** Machine-readable representation of the page that AI systems use.

**Build:**
- Add report section: **"What AI Systems Extract"**
- Surface: title, meta description, schema types (or "None"), main content summary (first 200 chars), citation anchors count
- Framing: *"When AI systems fetch your URL, they receive structured data like this. Gaps here explain weak or missing citations."*

**Data source:** `extractionData` (already in `lastExtractionData`). New component: `WhatLLMsSeeDisplay`.

**Location:** After Signal Coverage, before Fix Library.

---

### 1.2 "This is Their Output"

**What:** Actual AI responses to real queries.

**Build:**
- Extend Query Pack: for each query, add **"Paste AI response"** text area (optional)
- User runs query in ChatGPT/Perplexity, copies response, pastes into app
- Store per query: `{ query, response, cited: boolean }`
- Display: Query → AI response (truncated) → Cited? Yes/No

**Simpler MVP:** Keep current Cited/Mentioned/Not found buttons. Add optional "Paste response" expandable field per query. Show pasted response in report/PDF.

**Location:** Query Pack section; optional "Verification evidence" block in report.

---

### 1.3 "Here's Why"

**What:** Tie audit findings to AI non-citation.

**Build:**
- When user marks "Not cited" for a query, auto-suggest reasons from audit:
  - No Schema → "AI can't clearly identify your entity"
  - Weak meta → " retrieval ranking likely low"
  - Low propositional density → "content may not match answer patterns"
- Display in report: *"Why you weren't cited for [query]: [reasons from findings]"*

**Logic:** Map `extractionData` gaps + `audit.keyFindings` to plain-language reasons. New helper: `inferCitationReasons(extractionData, findings)`.

**Location:** Below each query verification; summary in "Executive proof" section.

---

### 1.4 "Before/After Fix"

**What:** Prove fixes work with same-queries comparison.

**Build:**
- Persist verification results ( Cited/Mentioned/Not found ) with audit
- On re-audit: prompt "Re-test the same queries" → load previous queries, show before vs after
- Display: | Query | Before | After |
- Add "Verification summary": "Before: 0/5 cited. After: 2/5 cited."

**Data:** Store in audit payload or new `audit_verifications` table: `{ auditId, query, result, response?, timestamp }`. On re-audit, compare by query.

**Location:** Delta/re-audit flow; new "Proof it worked" section in report.

---

## Part 2: User Clarity ("What Happened" / "What Will Happen")

### 2.1 Plain-Language Verdict

**What:** Single sentence: "You're invisible / partially visible / visible to AI search."

**Build:**
- Map verdict: LOW VISIBILITY → "invisible"; DEVELOPING → "partially visible"; AI-READY → "visible"
- Add component: `PlainLanguageVerdict` — one sentence at top of results
- Example: *"Your site is **partially visible** to AI search — AI may mention you in some answers but often won't cite you as a primary source."*

**Location:** Top of ResultDashboard, above scores.

---

### 2.2 "What We Measured"

**What:** Short list of what was checked and what was found.

**Build:**
- From `extractionData` + `audit.keyFindings`: generate bullet list
- Example: *"We checked: entity identity (title, meta, schema), content structure, verification signals, crawlability. Found: strong structure, weak entity clarity, no Schema."*

**Location:** Right after plain-language verdict.

---

### 2.3 "Why This Matters"

**What:** 1–2 sentences on business impact.

**Build:**
- Static or dynamic text based on verdict
- Example: *"When people ask ChatGPT or Perplexity for [category], they get short answers with 2–3 cited links. If you're not in that list, you're invisible for that search."*

**Location:** After "What we measured."

---

### 2.4 "Your Top 3 Actions"

**What:** Single prioritized list from Fix Library / Treatment Plan.

**Build:**
- Merge top fixes from Fix Library and Treatment Plan
- Display: 1. [Action] — [one-line outcome]
- Max 5; emphasize top 3.

**Location:** Main action block before detailed Treatment Plan.

---

### 2.5 "What Will Change"

**What:** Before/after narrative.

**Build:**
- Template: *"**Before (now):** [verdict]. Score: X. **After (if you complete the plan):** [expected state]. You can verify with re-audit and query re-test."*

**Location:** After "Your top 3 actions."

---

### 2.6 "Proof It Worked"

**What:** Clear re-audit + query re-test instructions.

**Build:**
- Copy: *"After implementing fixes: (1) Click Re-audit to see score change. (2) Re-test the same queries in ChatGPT/Perplexity and mark results. Compare before vs after."*
- Link to Re-audit button; link to Query Pack.

**Location:** End of action block; in PDF/report.

---

## Part 3: Credibility

### 3.1 "How We Know" Block

**What:** Research citations linking signals to AI citation.

**Build:**
- Add section: *"Research shows: pages with Schema markup are cited ~2.3× more; content under 6 months old ~3.2× more; listicles and how-to formats account for ~72% of AI citations."*
- Link to sources (e.g. Hashmeta, Search Atlas).

**Location:** Methodology page; optional footer in report.

---

### 3.2 Benchmark Percentile

**What:** "58/100 = top 30%"

**Build:**
- Already have `getPercentileLabel` in ResultDashboard
- Ensure it's visible and prominent
- Optional: "Compared to X sites we've audited"

**Location:** ResultDashboard score area.

---

## Part 4: Sharing & Handoff

### 4.1 Share Report Button

**What:** Copy link + optional email.

**Build:**
- After audit: "Share report" button
- Copy `window.location.origin + /report/ + auditId` to clipboard
- Toast: "Link copied"
- Optional: "Email this report" (future: Resend/SendGrid)

**Location:** ResultDashboard; Report page header.

---

### 4.2 Board-Ready PDF First Page

**What:** First page = verdict + why it matters + top 3 actions + what will change.

**Build:**
- Extend `ReportService.generatePdf` first page:
  - Plain-language verdict
  - "Why this matters" (1–2 sentences)
  - "Your top 3 actions"
  - "What will change"
- Rest of PDF: scores, findings, full fix list.

**Location:** `reportService.ts`

---

## Part 5: Landing

### 5.1 Landing Hero

**What:** Clear value prop before form.

**Build:**
- Add hero above AuditForm when no audit:
  - Headline: *"Are you invisible to AI search?"*
  - Sub: *"See how AI systems view your site — and get a clear plan to fix it."*
  - Bullets: Verdict • Action plan • Proof it worked

**Location:** App.tsx, above grid with AuditForm.

---

## Part 6: Implementation Order

| Phase | Items | Effort |
|-------|-------|--------|
| **Phase 1: Quick wins** | Plain-language verdict, "Your top 3 actions", Share report button, Landing hero | Low |
| **Phase 2: Proof chain** | "What LLMs see" section, "Here's why" mapping | Medium |
| **Phase 3: Verification** | "Paste AI response" per query, persist verification, before/after comparison | Medium |
| **Phase 4: Polish** | "What we measured", "Why this matters", "What will change", "Proof it worked" copy | Low |
| **Phase 5: Credibility** | "How we know" block, benchmark prominence | Low |
| **Phase 6: PDF** | Board-ready first page | Low |

---

## Part 7: File Changes Overview

| New | Modify |
|-----|--------|
| `components/WhatLLMsSeeDisplay.tsx` | `components/ResultDashboard.tsx` |
| `components/PlainLanguageVerdict.tsx` | `components/QueryPackDisplay.tsx` |
| `components/TopActionsSummary.tsx` | `services/reportService.ts` |
| `components/LandingHero.tsx` | `App.tsx` |
| `lib/inferCitationReasons.ts` | `pages/Methodology.tsx` |

---

## Part 8: Success Criteria

- CEO can say: *"This is what AI sees, this is what it outputs, here's why we weren't cited, and here's the before/after proof that our fixes worked."*
- Site owner can say: *"I understand what happened and what will happen if I follow the plan."*
- Report is shareable and board-ready with one click.
