# Agentic Threat Intelligence — Project Writeup

Matarrese | May 12, 2026

This is the implementation-side companion to the design docs in `Reference/`. The framework spec (`Reference/ATI_Eval_Framework.md`) and the pre-evaluation writeup (`Reference/Okta ATI - Anomaly detection and response model eval.md`) establish the thesis, the schema, the scoring rubric, and the production-quality bar. This document reports what was built against that spec, what the results say, and where the prototype falls short of the production target on purpose.

---

## 0.0 What was built

A two-phase implementation that walks from the framework's LLM-as-stand-in classifier through to a feature-based ML classifier that approximates the production architecture. Both phases are graded on the same held-out 50-scenario eval set using the framework's grading rubric, executed end-to-end through an automated pipeline.

- **`Eval/`** — the eval pipeline (scenario library, classifier system prompt, judge system prompt, scorecard generator) plus the Phase 2 additions: feature extractor, AutoML training data, model comparison.
- **`Prototype/`** — the SOC dashboard UI (extending classmate Aaryn's Lovable-generated foundation; ATI panel work in flight).
- **`Reference/`** — the source-of-truth design docs. The framework spec wins when implementation and spec disagree.

Numbers in this writeup come from `Eval/results/automl/comparison.{md,json,csv}` and `Eval/results/eval_run_20260510_225418.json`. The repository is reproducible: `python -m src.run_eval` regenerates Phase 1 numbers; `python -m src.build_comparison` regenerates Phase 2 numbers.

---

## 1.0 Phase 1 — LLM-as-classifier baseline

**Purpose.** Per `Reference/ATI_Eval_Framework.md` §0, the LLM-as-classifier is a stand-in for the production ML model. Phase 1 validates that the eval methodology (synthetic scenarios → classifier → judge → scorecard) executes end-to-end and produces results that match the rubric's expected shape.

**Setup.** 50 hand-authored scenarios in `Eval/scenarios/eval/` (15 Normal / 13 T1 / 10 T2 / 5 T3 / 7 Adversarial), classifier = `gpt-5.4-nano` (bare-metal, no fine-tune), judge = `gpt-5.4`. Both deployed in Azure AI Foundry. Pipeline at `Eval/src/run_eval.py`.

**Phase 1 results on the 50-scenario eval set:**

| Dimension | Result |
|---|---|
| Binary accuracy (Normal vs Anomalous) | 82.0% |
| Four-class accuracy (Normal / T1 / T2 / T3) | 78.0% |
| Anomalous recall (catch rate on real threats) | 72.7% (24/33) |
| False positive rate | **0.0%** (0/17) |
| Hallucination rate (judge-detected) | 0% |
| **Tier-1 recall** | **33.3% (5/15)** |
| Tier-2 recall | 100% (13/13) |
| Tier-3 recall | 80% (4/5) |

The bare-metal LLM is **conservative and precise**: zero false positives on benign traffic, perfect on the unambiguous T2 cases, but materially under-tiers ambiguous single-signal anomalies. Tier-1 recall at 33% is the headline weakness — exactly the failure mode the framework spec anticipates ("ambiguous behavior that warrants pausing the action for analyst review"). When the right answer is "this isn't obviously bad but you should pause it," the bare-metal model frequently calls it Normal instead.

**What Phase 1 validated:**
- The eval pipeline is structurally correct: scenarios load, classifier output validates against the JSON contract, judge grades against the rubric, scorecard aggregates correctly.
- The grading rubric discriminates: same model gets different scores on the four scoring dimensions (`reasoning_quality`, `cross_app_awareness`, `calibration`, `analyst_utility`) — the rubric isn't degenerate.
- The judge is consistent: re-runs produce stable scores (within ±0.1 mean shift across dimensions).

Full writeup at `Eval/results/eval_run_20260510_225418_analysis.md`.

---

## 2.0 Phase 2 — ML classifier as a more realistic stand-in

The framework spec is explicit (§0): the production detector is a "purpose-built ML classifier trained on Okta's proprietary behavioral data," not an LLM. Phase 2 implements that architecture on our scale and grades it on the same eval set, so the comparison is apples-to-apples.

### 2.1 Feature extraction

Scenario JSONs are nested and partially textual; a tree-based classifier needs a flat numeric vector. `Eval/src/feature_extractor.py` collapses each scenario into 26 numeric features across five groups:

| Group | Features | Rationale |
|---|---|---|
| Event shape | `event_count`, `unique_apps_in_events`, `unique_event_types`, `failed_auth_count`, `scope_request_count`, `privilege_escalation_count`, `token_refresh_count` | Mass enumeration and privilege actions are strong tier signals |
| Scope analysis | `has_scope_delta`, `total_scopes_seen`, `unique_scopes`, `has_admin_scope`, `has_write_scope` | Scope drift is the T1/T2 boundary signal |
| Geo / session | `unique_geos`, `unique_ips`, `max_concurrent_sessions`, `has_anonymizer_geo` | Impossible-travel and Tor exits are T3 signals |
| Cross-app context | `apps_accessed_last_24h_count`, `total_auth_events_24h`, `scope_escalation_attempts_7d`, `new_app_connections_7d` | Per framework Product Brief §0: cross-app correlation is Okta's unique angle |
| Agent profile + integration | `agent_age_days`, `auth_method_*`, `integration_signals_present`, `crud_volume_ratio`, `data_volume_high` | Agent baseline + integration data when available |

Scenario string content (app names, geos, scope names, narratives) is deliberately not featurized at this stage — that would require embeddings or category-level encoding, which adds dependency complexity disproportionate to the gain at our data scale. Pre-extracted CSVs live at `Eval/features/features_{train,eval}.csv`.

The label is derived from each scenario's `ground_truth.classification` + `tier` (Normal / T1 / T2 / T3). `scenario_id` and `category` are excluded from the model's view to prevent label leakage — an early run that retained `category` learned `category=tier3 → predict T3` for free, hitting a misleading 99.7% validation AUC. Diagnosing and removing that leak is itself a lesson worth carrying into the production training pipeline.

### 2.2 Phase 2a — AutoML on 200 hand-authored scenarios (`strong_fowl`)

200 scenarios were hand-authored in `Eval/scenarios/train/` to match the framework's target distribution shape (60 Normal / 50 T1 / 40 T2 / 20 T3 / 30 Adversarial). Each scenario was also cross-checked through a GPT-5.4 auditor (`Eval/src/cross_check.py`) for realism, internal consistency, ground-truth fit, and de-duplication against the eval set; 76/200 verdicts came back `keep`, 124 `revise`, 0 `drop`. Twelve scenarios where the auditor disagreed with the assigned label were revised before training.

Azure AutoML (Classification, multi-class, serverless CPU) trained 74 candidate pipelines and selected a soft-voting ensemble (`strong_fowl`, run `green_holiday_vgwb1gknhq_49`). Held-out eval scoring:

| Dimension | Phase 1 (LLM) | Phase 2a (200 train) | Δ |
|---|---|---|---|
| Binary accuracy | 82.0% | 76.0% | −6.0 |
| Four-class accuracy | 78.0% | 68.0% | −10.0 |
| Anomalous recall | 72.7% | 78.8% | +6.1 |
| **T1 recall** | **33.3%** | **46.7%** | **+13.4** |
| T2 recall | 100% | 76.9% | −23.1 |
| T3 recall | 80% | 100% | +20.0 |
| FPR | 0.0% | **29.4%** | +29.4 |

The shape of the trade-off matched the hypothesis: the ML model is more sensitive to subtle anomalies (T1 recall up, T3 recall perfect) but pays for that sensitivity with false positives on benign edge cases. The 29.4% FPR is the model calling 5/17 benign Normal scenarios as Anomalous — these are the "looks suspicious but actually benign" edge cases the framework explicitly designs for (`Reference/ATI_Eval_Framework.md` §1: "Normal scenarios are not filler. They test the model's ability to NOT flag legitimate behavior.").

### 2.3 Phase 2b — Synthetic data scaling experiment (`bold_beard`)

To isolate the "more training data" lever, 298 additional training scenarios were generated by GPT-5.4 in parallel (`Eval/src/generate_scenarios.py`), validated against the Pydantic `Scenario` schema, and gated against eval-set agent-id and narrative-similarity collisions. Total training set: 498 scenarios (193 / 137 / 113 / 55 across Normal / T1 / T2 / T3 — the T3 class roughly doubled). The eval set was untouched.

A second AutoML run on the expanded training set produced `bold_beard` (run `dynamic_ring_m8zb54`). Held-out eval results vs the 200-row model and the LLM baseline:

| Dimension | gpt-5.4-nano | strong_fowl (200) | bold_beard (498) |
|---|---|---|---|
| Binary accuracy | 82.0% | 76.0% | **84.0%** |
| Four-class accuracy | 78.0% | 68.0% | 76.0% |
| Anomalous recall | 72.7% | 78.8% | **90.9%** |
| Normal recall | 100% | 70.6% | 70.6% |
| **T1 recall** | 33.3% | 46.7% | **73.3%** |
| T2 recall | 100% | 76.9% | 92.3% |
| T3 recall | 80% | 100% | 60% |
| FPR | 0.0% | 29.4% | 29.4% |

**The scaling experiment did exactly what we'd hope for on the metrics it was designed to move, and held still on the ones it couldn't.** Binary accuracy lifted 8 points, anomalous recall lifted 12 points, T1 recall jumped 27 points. The FPR did not improve — synthetic scaling cannot fix that, because synthetic Normal scenarios reflect what an LLM thinks benign traffic looks like, not what it actually looks like in a tenant. The 29.4% FPR is the synthetic-data ceiling.

The T3 regression (100% → 60%) is interesting and likely a data-quality issue rather than a scaling issue: the 30 newly generated T3 scenarios disproportionately landed near the T2/T3 boundary, blurring the model's decision surface for unambiguous Session Kill cases. Auditing the new T3 scenarios is a Phase 3 task. Both T3 misses were predicted as T2 (Scope Restriction) — still caught as Anomalous, just under-tiered, which is the right kind of failure mode if it has to fail.

Per-scenario predictions and probabilities are in `Eval/AzureML/bold_beard/predictions.csv` (and the strong_fowl equivalent at `Eval/AzureML/strong_fowl/predictions.csv`).

---

## 3.0 What this tells us about the production path

The framework spec (`Reference/Okta ATI - Anomaly detection and response model eval.md` §1.5) sets the production bar at >98% classification accuracy and >99% recall on the golden dataset, with <1% hallucination rate. The prototype hits 84% binary accuracy and 91% anomalous recall. That's a 14-point and 8-point gap respectively — and the gap is not a model-architecture problem.

**The gap is data.** Specifically, the framework's §1.1 spec for the 500-scenario golden dataset:

- Authored or curated by a standing panel of 20 SOC SMEs with 10+ years of identity-threat experience
- Three sources: real anonymized agent telemetry from early-access tenants, synthetic scenarios from security engineers, adversarial cases designed against the model's failure modes
- Ground truth set by majority consensus across 4+ independent labelers per scenario
- Inter-reviewer agreement tracked as a meta-metric (≥80% threshold; below that, the rubric needs refinement before the eval is valid)

The prototype substitutes a single non-expert author (Claude) plus a GPT-5.4 auditor pass. That substitution is the entire reason for the 29% FPR ceiling and the inability to push T1 recall past 73%. The framework's pre-eval writeup anticipates this exactly: "If the rubric is ambiguous, if SMEs disagree frequently, or if scenarios don't represent real-world distributions, the eval produces misleading confidence."

**The other gap is training data volume.** A purpose-built ML classifier trained on Okta's aggregate cross-customer telemetry (per `Reference/Product Brief - Agentic Threat Intelligence.md`) would see millions of agent-actions per day across thousands of tenants. The data flywheel — XAA adoption → behavioral data → better models — is the moat. 498 synthetic scenarios is what's possible without that telemetry, not what production looks like.

**Where the framework's 98% target lives:** golden dataset authored and labeled by the SME panel, weak-labeled production telemetry as bulk training (1-2 orders of magnitude more rows), continuous human-in-loop labeling per §1.4 Stage 1, and richer feature engineering than the 26 features at our scale. The recommendation from this prototype isn't "scale synthetic data" — it's "stand up the SME labeling pipeline first." Synthetic scaling has a use case (bootstrapping the training set before the data flywheel turns), but only an SME-validated golden eval can tell you whether the model is actually production-ready.

---

## 4.0 Reusable artifacts

What transfers directly from this prototype to Okta's real model evaluation:

1. **The pipeline architecture** (`Eval/src/run_eval.py`, `Eval/prompts/`). The classifier+judge+scorecard structure works for any model under test. Swapping `gpt-5.4-nano` for a Sagemaker endpoint, an Azure ML real-time endpoint, or a model registry artifact is one config change.

2. **The grading rubric implementation** (`Eval/prompts/judge_system_prompt.md`, `Eval/src/schema.py`). The verifiable / semi-verifiable scoring contract maps directly to §1.4 Stage 2 of the framework — frontier-LLM judging at scale once SME panel sets the few-shot references.

3. **The cross-check methodology** (`Eval/src/cross_check.py`). The auditor-grades-the-scenarios pattern is a low-cost way to flag rubric ambiguity and labeling drift between SME refresh cycles. Drop in a different judge model and run against any refresh of the golden set.

4. **The scaling experiment template** (`Eval/src/generate_scenarios.py` + comparison harness). When synthetic augmentation is appropriate (e.g., generating adversarial mutations of SME-labeled cases per §1.4 Stage 2), the parallel-generation + de-leak gate + comparison-scorecard pattern is ready to lift.

5. **The feature extraction schema** (`Eval/src/feature_extractor.py`). The 26-feature vector is a starting taxonomy that a production team can extend (scope severity scoring, geo baseline distance, purpose-app overlap, time-since-baseline-event) without re-deriving the structural decomposition.

---

## 5.0 Open work

Items in roughly the order they'd appear on a production roadmap, not the order they happened here:

- **SME panel + golden dataset.** Per framework §1.1. This is the single highest-leverage gap. Nothing else moves the prototype past ~85% binary accuracy.
- **Real telemetry pipeline.** Anonymized agent telemetry from early-access XAA tenants as bulk training data, with weak labels derived from incident outcomes and analyst feedback.
- **T3 audit pass.** The 30 generated T3 scenarios in the 498-row training set need to be cross-checked specifically for "this is actually a strong T2" cases. Re-train without the contaminated ones and verify T3 recall returns to 100%.
- **Feature engineering Phase 2.** `scope_severity_score` (numeric encoding of admin:* vs read:*), `geo_baseline_distance_km`, `purpose_app_overlap_ratio`, `time_since_last_baseline_event`. Each has a clear hypothesis about which class boundary it sharpens.
- **Hallucination measurement on the ML model.** The 0% hallucination rate from Phase 1 was on the LLM's explanation field; the ML model produces probabilities, not explanations. Production needs a separate explanation pipeline (likely SHAP-based, with templating) and its own hallucination rubric.
- **Latency benchmarking.** Framework §1.2 requires P95 < 2 seconds detection. The ML model should be sub-millisecond per inference; the wrapping pipeline (feature extraction from streaming telemetry, integration signal fetching) is where the budget actually goes. Not measured in this prototype.
- **Prototype panel.** SOC dashboard integration of the model — simulate-a-scenario flow against the trained `bold_beard` endpoint or cached predictions, surface tier recommendation + analyst guidance, demonstrate the triage UX the framework's Tiered Automated Enforcement Experiment is designed against.

---

## 6.0 Closing note

The most useful sentence in the framework spec, repeated here verbatim because it's the right framing for this entire project:

> _"In production, the anomaly detection model would be a purpose-built ML classifier trained on Okta's proprietary behavioral data. This prototype uses an LLM as a stand-in to validate the eval methodology itself. The pipeline (synthetic data, structured rubric, automated judging, reasoning analysis) transfers directly to evaluating the real model."_

The prototype delivered against that framing: the pipeline runs, the rubric discriminates, the judge is consistent, the ML-vs-LLM comparison shows the production architecture is the right shape, and the synthetic-data ceiling shows the SME panel + telemetry pipeline is the bottleneck — exactly as the design docs predicted. The numbers in this writeup measure how much of that prediction the prototype could verify, not how close to production we are. Those are different questions, and the framework spec was correct to keep them separate.
