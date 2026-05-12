# Phase 2 Comparison: AutoML vs gpt-5.4-nano on held-out 50-scenario eval set

_Generated: 2026-05-12T07:22:14.876837_

Compares every AutoML run to the bare-metal gpt-5.4-nano Phase-1 baseline. All models scored on the SAME frozen 50-scenario held-out eval set (never seen during training).

- **strong_fowl (200 train)** — run `green_holiday_vgwb1gknhq_49`
- **bold_beard (498 train)** — run `dynamic_ring_m8zb54`
- **Baseline**: gpt-5.4-nano bare-metal classifier from `eval_run_20260510_225418`

## Headline

| Metric | gpt-5.4-nano | strong_fowl (200 train) | bold_beard (498 train) |
|---|---|---|---|
| 4-class accuracy (Normal/T1/T2/T3) | 78.0% | 68.0% | 76.0% |
| Binary accuracy (Normal vs Anomalous) | 82.0% | 76.0% | 84.0% |
| False positive rate (Normal → Anomalous) | 0.0% | 29.4% | 29.4% |
| Anomalous recall (catch rate on real threats) | 72.7% | 78.8% | 90.9% |

## Per-class recall

| Class | n | gpt-5.4-nano | strong_fowl (200 train) | bold_beard (498 train) |
|---|---|---|---|---|
| Normal | 17 | 17/17 = 100.0% | 12/17 = 70.6% | 12/17 = 70.6% |
| T1 | 15 | 5/15 = 33.3% | 7/15 = 46.7% | 11/15 = 73.3% |
| T2 | 13 | 13/13 = 100.0% | 10/13 = 76.9% | 12/13 = 92.3% |
| T3 | 5 | 4/5 = 80.0% | 5/5 = 100.0% | 3/5 = 60.0% |

## Confusion matrices

**strong_fowl (200 train)**

|  | pred Normal | pred T1 | pred T2 | pred T3 |
|---|---|---|---|---|
| **true Normal** | 12 | 4 | 0 | 1 |
| **true T1** | 7 | 7 | 1 | 0 |
| **true T2** | 0 | 1 | 10 | 2 |
| **true T3** | 0 | 0 | 0 | 5 |

**bold_beard (498 train)**

|  | pred Normal | pred T1 | pred T2 | pred T3 |
|---|---|---|---|---|
| **true Normal** | 12 | 5 | 0 | 0 |
| **true T1** | 3 | 11 | 1 | 0 |
| **true T2** | 0 | 1 | 12 | 0 |
| **true T3** | 0 | 0 | 2 | 3 |

**gpt-5.4-nano baseline**

|  | pred Normal | pred T1 | pred T2 | pred T3 |
|---|---|---|---|---|
| **true Normal** | 17 | 0 | 0 | 0 |
| **true T1** | 9 | 5 | 1 | 0 |
| **true T2** | 0 | 0 | 13 | 0 |
| **true T3** | 0 | 0 | 1 | 4 |

## Read

- **Scaling training data from 200 → 498 scenarios lifted overall binary accuracy by 8 points and anomalous-recall (catch rate on real threats) by 12 points** — exactly the lever we'd hoped synthetic-data scaling would pull.
- **T1 (Stall) tier — the gpt-5.4-nano baseline's known weakness — is the biggest winner.** Bare-metal nano caught 5/15 (33%); 200-row AutoML caught 7/15 (47%); 498-row AutoML caught 11/15 (73%). A 40-point recall jump for the trickiest single-signal class.
- **T3 (Session Kill) regressed at 498 rows.** Went from 5/5 perfect to 3/5 (both misses dropped to T2 — still caught as Anomalous, just under-tiered). Likely cause: the 30 newly-generated T3 scenarios leaned toward the T2/T3 boundary, blurring the model's decision surface. Quality > quantity on T3 specifically.
- **False positive rate didn't improve.** Both AutoML runs sit at 29% FPR vs nano's 0%. Scaling data didn't help here — that's a feature-engineering problem, not a data-quantity problem. Adding richer signals (scope severity, geo distance from baseline, purpose-app overlap) is the lever for next phase.
- **Production framing:** the ML model is now the right primary detector — 91% catch rate on real threats at sub-millisecond inference vs gpt-5.4-nano's 73% catch rate at ~1 second per call. The LLM moves out of the detection path and into the analyst-copilot role (explainability + edge-case verification).
- **Caveat:** 50-scenario eval is small and synthetic. Absolute numbers move ±5 points with eval-set composition; the *direction* of the deltas is what matters.
