# Eval Run Analysis — 2026-05-10

**Run:** `eval_run_20260510_225418`
**Classifier:** `gpt-5.4-nano`
**Judge:** `gpt-5.4`
**Scenarios:** 50 (15 Normal / 13 T1 / 10 T2 / 5 T3 / 7 Adversarial)

## Headline numbers

| Metric | Value |
|---|---|
| Classification accuracy | 82.0% |
| Tier exact match | 78.0% |
| Tier within-one match | 82.0% |
| **False positive rate (on Normal)** | **0.0%** — 15/15 |
| **False negative rate (on Anomalous)** | **27.3%** |
| Hallucination-free rate | 92.0% (3 hallucinations) |
| Reasoning quality (1–5) | 4.42 |
| Cross-app awareness (1–5) | 4.74 |
| Calibration (1–5) | 4.14 |
| Analyst utility (1–5) | 4.40 |

## Accuracy by category

| Category | N | Classification accuracy | Tier match |
|---|---|---|---|
| Normal | 15 | 100.0% | 100.0% |
| Tier 1 — Stall | 13 | 30.8% | 30.8% |
| Tier 2 — Scope Restriction | 10 | 100.0% | 100.0% |
| Tier 3 — Session Kill | 5 | 100.0% | 80.0% |
| Adversarial / Edge | 7 | 100.0% | 85.7% |

## The story

### What the model does well

- **Zero false positives on Normal.** Every routine scenario was correctly classified, including the false-positive traps (quarter-end volume spike, new-agent onboarding, IT-provisioning admin scopes with 90-day history). That's the calibration a SOC team wants.
- **Loud anomalies are reliably caught.** Tier 2 (cross-app scope expansion, data harvesting), Tier 3 (simultaneous-geo sessions, token replay, privilege-escalation chains), and the adversarial scenarios (slow-roll attacks, mimicry, integration-signal contradictions) were all classified correctly at 100%.
- **Strong cross-app reasoning.** The judge scored cross-app awareness at 4.74/5 — the model consistently connected signals across applications when relevant, which is the framework's stated unique-value proposition.

### Where the model fails

**The entire weakness lives in subtle Tier 1.** T1 classification accuracy is only **30.8%** (4/13). The model has a conservative anomaly threshold — it correctly flags loud single-signal T1s but drops subtle ones to Normal.

**T1 scenarios the model caught (loud signals):**

| ID | Signal |
|---|---|
| T1-01 | Write scope requested by read-only-registered agent |
| T1-02 | IP shift US → Romania |
| T1-03 | Off-hours run at 2:47am PT |
| T1-11 | Service-account credentials from mobile-carrier IP |

**T1 scenarios the model missed:**

| ID | Subtle signal |
|---|---|
| T1-04 | First new-app connection with read-only scope |
| T1-05 | IP shift within same country (us-east-1 → us-west-2) |
| T1-06 | Token refresh rate 4x baseline |
| T1-07 | `ai_platform` field changed (OpenAI → Anthropic) |
| T1-08 | Single `failed_auth` (token expired) → immediate retry success |
| T1-09 | Concurrent sessions from same trusted IP range |
| T1-10 | Session duration 10x baseline |
| T1-12 | Scope shrinkage (fewer scopes requested than usual) |
| T1-13 | Integration-signal CRUD count 1.6x baseline |

The misses follow a consistent pattern: any T1 that doesn't include a dramatic single-signal anomaly (geo, time, novel auth method, explicit scope escalation) is dropped to Normal.

### Secondary findings

- **3 hallucinations** (T2-09, T3-03, T3-04). All on scenarios the model classified correctly, but the judge identified signals cited in the reasoning that didn't exist in the input. Worth tracking as a separate quality dimension — analysts won't trust output that cites fabricated evidence.
- **5 miscalibrations**, all on Normal scenarios where the model returned 0.86–0.96 confidence on cases the rubric scoped to 0.6–0.85 (new agents, first-time app connections). The model is slightly overconfident on "this is fine."
- **T3-02 under-tiered to T2** (Slack-summarization agent escalating to admin scopes across 4 identity providers in 12 minutes). The framework doc explicitly calls this scenario "unambiguously malicious" — within-one-tier credit but the kind of miss worth tracking.

## What this tells us about the eval methodology

The eval surfaced a specific, defensible calibration gap (subtle T1 detection) that wouldn't appear in a casual "did it catch the obvious attacks" demo. The pipeline did exactly what the framework doc said it should: synthetic scenarios + structured rubric + LLM judge produced an actionable scorecard that points engineering at a specific tuning surface (the Stall threshold) rather than a vague "model needs improvement."

## Recommendations for the writeup

1. **Lead with 0% FPR + 100% T2/T3** — the model is production-deployable for high-confidence cases.
2. **Highlight 30.8% T1 accuracy as the tuning surface** — this is where Okta would invest training data and threshold calibration in production.
3. **Flag the 3 hallucinations as a separate dimension** — even when classification is right, fabricated grounding undermines analyst trust.
4. **Note that the framework's "cross-app correlation" thesis was validated** — the model scored highest on cross-app awareness (4.74), the dimension Okta uniquely owns.
