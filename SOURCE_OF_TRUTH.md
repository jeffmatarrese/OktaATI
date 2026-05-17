# Source of Truth — Agentic Threat Intelligence (ATI)

> A single-document spec and index for the ATI class project. It defines the problem, the telemetry shape, the scenario library, the classifier and judge contracts, the eval methodology, the prototype architecture, and the conventions that govern the repo. Depth lives in the linked source files — this document tells you what exists, what it means, and where to look.

**Authoritative companion docs**
- `Reference/ATI_Eval_Framework.md` — original framework spec (eval methodology, scenario taxonomy, rubric)
- `Reference/Product Brief - Agentic Threat Intelligence.md` — product framing
- `Reference/Okta ATI - Tiered Automated Enforcement Experiment.md` — enforcement-tier design
- `Reference/prfaq-final.md` — PR/FAQ + Appendix
- `Eval/EVAL_WRITEUP.md` — implementation-side companion: results, gap analysis, open work
- `docs/superpowers/specs/2026-05-16-prototype-v2-design.md` — Prototype V2 design spec
- `docs/superpowers/plans/2026-05-16-prototype-v2.md` — Prototype V2 implementation plan

When this doc and the linked sources disagree, the linked sources win unless we have explicitly decided to deviate (in which case both should be updated).

---

## 1. Project overview

### 1.1 What ATI is

**Agentic Threat Intelligence (ATI)** is a proposed feature for Okta Identity Threat Protection that detects anomalies in **AI agent** behavioral telemetry — not human user behavior — and recommends a tiered enforcement response. The premise is that agents have distinct, denser, faster, and more inspectable behavioral surfaces than humans, and the existing ITP risk pipeline isn't tuned for them.

**Source files:** `Reference/Product Brief - Agentic Threat Intelligence.md`, `Reference/prfaq-draft.md`, `Reference/ATI_Eval_Framework.md` §1

### 1.2 Problem statement

Agents act in dense bursts across many apps and APIs, often with broad scopes and minimal human supervision. A compromised or misconfigured agent can do real damage in seconds. Anomaly signals that matter for agents (tool-call cadence, scope drift, cross-app pivots, prompt-injection echoes) are different from those used for humans. ATI's job is to surface those signals, classify the severity, and recommend an enforcement tier an operator can act on — or that policy can auto-apply.

### 1.3 Deliverables for this class project

1. **Eval pipeline** (`Eval/`) — LLM classifier + feature-based ML classifier, both graded by an LLM-as-judge over a frozen 50-scenario test set. Validates the eval methodology that would later grade a real ML classifier.
2. **Prototype** (`Prototype/V2/`) — operator-facing dashboard showing alerts, agents, and a "Scenario Lab" that replays real classifier outputs.
3. **Eval writeup** (`Eval/EVAL_WRITEUP.md`) — phase-by-phase results, methodology critique, and what a production version would need.
4. **This document** — single-file source of truth for AI-agent handoff.

### 1.4 Non-goals

- A production-ready ML classifier (we don't have real telemetry or a SME-labeled golden set).
- A live integration with Okta or any other IdP.
- Hardening the prototype against real adversarial input (replay-only).
- Defending synthetic data generation as the production path — it is a class-project stopgap. See §11.6.

---

## 2. Conceptual model

### 2.1 Anomaly taxonomy

Scenarios are classified into five categories:

| Label | Meaning |
|---|---|
| **Normal** | No anomaly. Expected agent behavior given its profile. |
| **T1** | Mild anomaly. Worth flagging; usually does not warrant disruption. |
| **T2** | Material anomaly. Indicates scope drift, unusual cadence, or out-of-pattern data access. |
| **T3** | Severe anomaly. Strong indication of compromise, data exfiltration, or runaway behavior. |
| **Adversarial** | Crafted to confuse the classifier (looks anomalous but isn't, or vice versa). Used to test robustness, not as a separate enforcement tier. |

**Source files:** `Reference/ATI_Eval_Framework.md` §2; ground-truth labels in `Eval/scenarios/eval/*.json` and `Eval/scenarios/train/*.json`

### 2.2 Enforcement tiers

| Tier | Action | When |
|---|---|---|
| **Stall** | Delay the next agent action; require re-authentication or human approval. | T1 |
| **Scope Restriction** | Revoke specific scopes or tools mid-session. | T2 |
| **Session Kill** | Terminate the agent session immediately. | T3 |

`Adversarial` and `Normal` produce no enforcement.

**Source files:** `Reference/Okta ATI - Tiered Automated Enforcement Experiment.md`, `Prototype/V2/src/store/alertsStore.ts` (`applyAction`)

### 2.3 Tier → enforcement mapping

The mapping is 1:1 with category in the current prototype (T1→Stall, T2→Restrict, T3→Kill). In production this would be policy-driven, not hard-coded; the prototype models the simplest case.

### 2.4 Operator persona and decision flow

The operator is a SOC / IAM analyst. They see an alert list; opening an alert shows an **evidence chain** (deterministic, no probabilities — see §9.4) and a recommended enforcement action they can apply, override, or dismiss. The Scenario Lab is a separate surface — see §9.

---

## 3. Telemetry schema

### 3.1 Top-level shape

Every scenario is one JSON object with these top-level fields:

- `scenario_id` — string, unique
- `category` — `"normal" | "tier1" | "tier2" | "tier3" | "adversarial"`
- `agent_profile` — dict describing the agent (name, owner, expected scopes, baseline behavior)
- `events` — list of timestamped actions the agent took
- `cross_app_context` — dict of activity correlated across apps (may be sparse)
- `integration_signals` — optional dict of upstream signals (MDM, EDR, DLP, etc.) — **omitted in ~40% of scenarios on purpose** (§3.3)
- `ground_truth` — dict (stripped before reaching the classifier; see §11.2)

`events`, `cross_app_context`, `integration_signals`, and `agent_profile` are typed as flexible dicts in the Pydantic model because real telemetry has variable shapes. Only the top-level structure is rigid.

**Source files:** `Eval/src/schema.py` (`Scenario`), `Reference/ATI_Eval_Framework.md` §3, `Eval/scenarios/eval/*.json` (examples)

### 3.2 Field reference

Detailed field semantics live in `Reference/ATI_Eval_Framework.md` §3 and are exemplified across the scenarios in `Eval/scenarios/`. The classifier prompt (§5.1) is the operational definition of which fields matter.

### 3.3 Graceful degradation rule

About 40% of scenarios omit `integration_signals` to verify the classifier can still produce a reasoned answer from agent telemetry alone. This is enforced by authoring discipline, not code.

### 3.4 Ground-truth contract

Every scenario must carry a `ground_truth` block:

```json
"ground_truth": {
  "classification": "normal | tier1 | tier2 | tier3 | adversarial",
  "tier": "T1 | T2 | T3 | null",
  "key_signals": ["...short phrases the judge expects to see..."],
  "answer_rationale": "free-text explanation, used by the judge"
}
```

`tier` is `null` for Normal scenarios. `key_signals` flow into the judge's verifiable-dimension grading.

---

## 4. Scenario library

### 4.1 Split design

| Split | Path | Count | Use |
|---|---|---|---|
| **Eval** | `Eval/scenarios/eval/` | 50 | Frozen test set. Every model (LLM or ML) is benchmarked against this. **Never trained on.** |
| **Train** | `Eval/scenarios/train/` | 498 | Training set for the ML classifier. First 200 hand-authored, remaining 298 synthesized by gpt-5.4 via `Eval/src/generate_scenarios.py`. |

### 4.2 Category distribution

| Split | Normal | T1 | T2 | T3 | Adversarial | Total |
|---|---|---|---|---|---|---|
| Eval | 15 | 13 | 10 | 5 | 7 | 50 |
| Train | 148 | 125 | 100 | 50 | 75 | 498 |

### 4.3 Authoring guidelines

- Every scenario must produce a single defensible classification — if a reasonable analyst could plausibly land on two different tiers, rewrite.
- `key_signals` should be the literal short phrases the judge will look for in the model's rationale.
- Adversarial scenarios should look like a confident wrong answer to a naive classifier — usually that means surface noise that mimics anomaly with a benign underlying explanation, or vice versa.

### 4.4 Cross-check loop

After authoring or generation, run `python -m src.cross_check --dry-run` (or live) to have gpt-5.4 audit scenarios against their labels. Outputs land in `Eval/results/cross_check_*.{json,md,csv}`.

**Source files:** `Eval/src/cross_check.py`, `Eval/prompts/cross_check_system_prompt.md`, `Eval/results/cross_check_20260511_135335.md`

### 4.5 Synthetic generation

`Eval/src/generate_scenarios.py` uses gpt-5.4 against `Eval/prompts/generator_system_prompt.md` to produce additional training scenarios in the same JSON shape. The generator never sees eval scenarios. This is a **stopgap** — see §11.6 for the framing rule.

---

## 5. Classifier specifications

Two classifiers are evaluated against the same 50-scenario eval set.

### 5.1 LLM classifier (Phase 1)

- **Model:** `gpt-5.4-nano`
- **System prompt:** `Eval/prompts/classifier_system_prompt.md` (authoritative — full text)
- **Output contract:** strict JSON, validated by Pydantic in `Eval/src/schema.py` (`ClassifierOutput`):
  - `classification` — one of the five categories
  - `tier` — `"T1" | "T2" | "T3" | null`
  - `recommended_action` — one of stall / restrict / kill / none
  - `key_signals` — list of strings
  - `rationale` — free-text
- **API contract:** `max_completion_tokens` (not `max_tokens`), no `temperature`, `api_version=2024-12-01-preview`. These were set deliberately for the gpt-5.4 reasoning-model contract — do not restore older params. (§11.4)

**Source files:** `Eval/src/llm_client.py`, `Eval/src/run_eval.py`, `Eval/prompts/classifier_system_prompt.md`

### 5.2 Feature-based ML classifier (Phase 2)

Trained in Azure AutoML against features extracted from training scenarios.

- **Feature extractor:** `Eval/src/feature_extractor.py` → `Eval/features/features_train.csv` + `Eval/features/features_eval.csv`
- **AutoML input folders:** `Eval/features/mltable_train_ml/` + `Eval/features/mltable_eval_ml/` (the `_ml` suffix folders strip `scenario_id` and `category` to prevent label leakage — see §11.3)
- **Trained models:** both `PrefittedSoftVotingClassifier` ensembles
  - `Eval/AzureML/strong_fowl/` — 200 training scenarios
  - `Eval/AzureML/bold_beard/` — 498 training scenarios
  - Each folder contains: `model.pkl`, `scoring_file_v_2_0_0.py`, `conda_env_v_1_0_0.yml`, `confusion_matrix`, `accuracy_table`, `predictions.csv`

**Source files:** `Eval/src/feature_extractor.py`, `Eval/AzureML/{bold_beard,strong_fowl}/`, `Eval/results/automl/comparison.md`

---

## 6. Evaluation methodology

### 6.1 LLM-as-judge rationale

A second LLM grades the classifier's output against the scenario's `ground_truth`. The judge is the only place ground truth enters the pipeline — the classifier never sees it. This was chosen over pure binary accuracy because the rubric includes **semi-verifiable** dimensions (rationale quality, key-signal coverage) that benefit from a graded score.

### 6.2 Judge prompt and rubric

- **Model:** `gpt-5.4`
- **System prompt:** `Eval/prompts/judge_system_prompt.md` (authoritative — full text)
- **Verifiable dimensions** (binary): correct classification, correct tier, correct recommended action
- **Semi-verifiable dimensions** (1–5): key-signal coverage, rationale quality
- **Aggregate:** per-scenario score, plus rollups by category and overall

**Source files:** `Eval/prompts/judge_system_prompt.md`, `Reference/ATI_Eval_Framework.md` §4

### 6.3 What each model sees

| Component | Sees telemetry | Sees ground truth |
|---|---|---|
| Classifier (LLM or ML) | ✅ | ❌ |
| Judge | ✅ | ✅ |

Ground-truth stripping happens in `scenario_to_classifier_payload()` in `Eval/src/run_eval.py`. This boundary is non-negotiable. (§11.2)

### 6.4 Scoring outputs

Each run produces three artifacts under `Eval/results/eval_run_YYYYMMDD_HHMMSS.*`:

- `.json` — raw judge output per scenario plus aggregates
- `.md` — human-readable scorecard
- `.csv` — per-scenario flat table (for ad-hoc analysis)

**Source files:** `Eval/src/scorecard.py`, `Eval/results/eval_run_20260510_225418.{json,md,csv}`

---

## 7. Pipeline architecture (Eval/)

### 7.1 Module map

| Module | Role |
|---|---|
| `Eval/src/run_eval.py` | Entry point. Loads scenarios, strips ground truth, runs classifier, runs judge, builds scorecard. |
| `Eval/src/schema.py` | Pydantic models for `Scenario`, `ClassifierOutput`, `JudgeOutput`. Source of truth for JSON shape. |
| `Eval/src/llm_client.py` | AzureOpenAI wrapper. Includes `--dry-run` stub returning deliberately-noisy responses so the full pipeline can be exercised without API cost. |
| `Eval/src/scorecard.py` | Aggregation + writers for json/md/csv outputs. |
| `Eval/src/feature_extractor.py` | Turns scenarios into the feature CSVs and `_ml` folders used by AutoML. |
| `Eval/src/cross_check.py` | gpt-5.4 audit pass over training scenarios. |
| `Eval/src/generate_scenarios.py` | gpt-5.4 synthetic scenario generation. |
| `Eval/src/build_comparison.py` | 3-way scorecard: gpt-5.4-nano vs strong_fowl vs bold_beard. |
| `Eval/src/build_replay_data.py` | Builds the prototype's replay JSONs from eval outputs + AutoML predictions. |
| `Eval/src/config.py` | Env-driven defaults (classifier `gpt-5.4-nano`, judge `gpt-5.4`). |

### 7.2 Dry-run mode

`--dry-run` skips Azure calls and returns stubs from `llm_client.py`. **First-line smoke test for any pipeline change** — always validate dry-run before burning tokens.

### 7.3 Commands

```bash
cd Eval
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY

python -m src.run_eval --dry-run        # validate pipeline
python -m src.run_eval --limit 5        # smoke-test 5 scenarios live
python -m src.run_eval                  # full 50-scenario live run

python -m src.feature_extractor         # regenerate features + mltable_*_ml folders
python -m src.cross_check --dry-run     # gpt-5.4 audit of training scenarios
python -m src.generate_scenarios --dry-run  # synthesize more training scenarios
python -m src.build_comparison          # 3-way scorecard
python src/build_replay_data.py         # rebuild prototype replay JSONs
```

**Source files:** `Eval/README.md`

---

## 8. Results

### 8.1 Phase 1 — bare-metal gpt-5.4-nano

- 82% binary accuracy (anomalous vs. normal)
- 0% false positive rate
- 33% T1 recall (the main miss)
- 100% T3 recall

Full analysis: `Eval/results/eval_run_20260510_225418_analysis.md`.

### 8.2 Phase 2 — feature-based ML

| Model | Train size | Binary acc | T1 recall | T3 recall | FPR | Anomalous recall |
|---|---|---|---|---|---|---|
| `strong_fowl` | 200 | 76% | 47% | 100% | 29% | — |
| `bold_beard` | 498 | 84% | 73% | 60% | 29% | 91% |

Head-to-head: `Eval/results/automl/comparison.md` (regenerate with `python -m src.build_comparison`).

### 8.3 Key takeaways

- **Bare-metal LLM is conservative.** Zero FPR is great; T1 recall of 33% means it under-flags the easy cases.
- **ML with more data improves T1 dramatically** (47% → 73%) but trades some T3 recall (100% → 60%).
- **Both have the same FPR ceiling (29% for ML, lower for LLM)** — suggests the eval set has scenarios that are genuinely ambiguous at the Normal/T1 boundary; see §14.1.
- The eval methodology itself works — the judge produces stable, defensible scores. That was the actual deliverable, not a final classifier.

### 8.4 Full writeup

`Eval/EVAL_WRITEUP.md` — implementation-side companion. May be stale on the "active next workstream" line (Phase 3 is complete); §1–§4 are current.

---

## 9. Prototype (V2)

### 9.1 Goals and V1→V2 rationale

V1 (`Prototype/V1/`, frozen) was a Lovable-generated dashboard. V2 was rebuilt to address three V1 weaknesses:

1. **Visual identity** — V2 uses Okta's blue/charcoal palette, not generic Tailwind.
2. **Information architecture** — agent-first navigation. Agents and Alerts are co-equal surfaces, not nested.
3. **Operator UX** — alert detail uses a deterministic **evidence chain** instead of probability bars. See §9.4 for the rule and rationale.
4. **Scenario Lab** - added the scenario lab which simulates how eval-set scenarios would flow through the ML model and app surface.

**Source files:** `docs/superpowers/specs/2026-05-16-prototype-v2-design.md`, `docs/superpowers/plans/2026-05-16-prototype-v2.md`

### 9.2 Stack

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand for state (`src/store/`)
- Vitest + React Testing Library for tests
- Path alias `@/` → `src/` (in `tsconfig.json` + `vite.config.ts`)

### 9.3 Information architecture

| Surface | Route | Purpose |
|---|---|---|
| **Alerts** | `/alerts` | Operator queue. List + detail. |
| **Agents** | `/agents` | Directory of agents, with Shadow AI filter. |
| **Scenario Lab** | left-side drawer | Replays real classifier outputs to inject new alerts into the dashboard. |

**Source files:** `Prototype/V2/src/pages/`, `Prototype/V2/src/components/{Alerts,Agents,Lab,Shell}/`

### 9.4 Operator UX rule: no probabilities outside the Lab

The Alert detail surface uses a **deterministic evidence chain** — a sequenced list of telemetry observations leading to a recommended action. It **never** shows probability or confidence percentages.

The Scenario Lab is the **only** place probabilities are shown. This is an intentional fourth-wall break: the Lab exists to make the eval narrative visible (here is what the bare-metal LLM said, here is what the ML model said, here is the disagreement) and is not part of the production operator experience.

**Do not add probability/confidence to the Alert detail surface.** This rule is in `CLAUDE.md` and is enforced by convention, not by code.

### 9.5 State management

| Store | File | Role |
|---|---|---|
| `alertsStore` | `Prototype/V2/src/store/alertsStore.ts` | Seed alerts; `appendAlert` flashes a new alert; `applyAction` mutates enforcement state and appends a timeline event. |
| `labStore` | `Prototype/V2/src/store/labStore.ts` | Drawer state; `sendScenario` parallel-classifies both models then appends an alert via `buildAlertFromScenario`. |

Tests: `Prototype/V2/src/store/{alertsStore,labStore}.test.ts`.

### 9.6 Enforcement action wiring

The three actions (Stall / Restrict Scope / Session Kill) are wired end-to-end:

1. Operator clicks action on Alert detail.
2. `applyAction` in `alertsStore` mutates alert state and appends a timeline event with timestamp + action.
3. Agent profile shows the active enforcement (visible on the Agents page).

There is no real backend — actions persist only in the store for the session.

**Source files:** `Prototype/V2/src/store/alertsStore.ts`, `Prototype/V2/src/components/Alerts/`

### 9.7 Classifier service abstraction

`Prototype/V2/src/services/classifier.ts` defines a `ClassifierService` interface. Current implementation is `ReplayClassifier`, reading bundled JSON from `Prototype/V2/src/data/replay/`. Swapping to a live model endpoint is a one-constructor change.

**Replay JSONs:** `predictions_bold_beard.json` + `predictions_gpt54nano.json`, built by `Eval/src/build_replay_data.py` from:
- `Eval/AzureML/bold_beard/predictions.csv`
- `Eval/features/features_eval.csv`
- `Eval/results/eval_run_20260510_225418.json`

Regenerate after any new eval or training run.

### 9.8 Commands

```bash
cd Prototype/V2
bun install        # or: npm install
bun run dev        # Vite dev server
bun run build
bun run lint
bun run test       # vitest single run
bun run test:watch
```

`bun` may not be installed everywhere — `npx vitest` and `npx tsc` are safe fallbacks. `CLAUDE.md` notes this.

---

## 10. Production recommendation (vs. what we built)

The class project is not the production answer. A production ATI would need:

1. **Expert-labeled golden set.** A panel of SOC / IAM SMEs labeling real anonymized customer telemetry. Our 50-scenario set is a methodology demo, not a benchmark.
2. **Anonymized real telemetry at volume.** Synthetic data captures shape but not the long tail of real agent behavior. Our synthetic train set (§4.5) is a stopgap because we had no SME panel and no real telemetry — see §11.6.
3. **Small ML classifier as the primary decision-maker.** The LLM's role in production is rationale generation and human-readable alert framing, not the classification itself. Latency and cost rule it out for inline use.
4. **Policy-driven tier → enforcement mapping.** Hard-coded in the prototype (§2.3); production needs per-tenant policy.
5. **A real LLM-as-judge run on every model release**, against the SME-labeled golden set, with judge-score thresholds gating release.

The prototype's `ClassifierService` interface (§9.7) is the migration seam for replacing replay with a live model.

---

## 11. Conventions and gotchas

### 11.1 Reference docs are authoritative

`Reference/ATI_Eval_Framework.md` is the source of truth for the eval methodology. When code and the framework spec disagree, the framework wins unless we have explicitly decided to deviate (and updated both).

### 11.2 Ground truth never reaches the classifier

Enforced by `scenario_to_classifier_payload()` in `Eval/src/run_eval.py`. Only the judge sees ground truth. This is the single most important invariant in the pipeline.

### 11.3 AutoML featurization gotchas

- **Strip leak columns.** `mltable_train_ml/` and `mltable_eval_ml/` exist specifically because Azure AutoML's `CharGramCountVectorizer` will tokenize `category` and learn `category=tier3 → predict T3` for free. A leaky early run hit 99.7% AUC this way. Always upload from the `_ml` folders, never the raw CSVs.
- **Force float columns.** All numeric columns in the `_ml` CSVs are coerced to floats. Without this, Azure's schema inference flips 0/1-only columns to Boolean in the eval set when training has wider ranges — which then mismatches the model's input contract.
- **No Apple Silicon support for the AutoML runtime.** Models are trained and scored in Azure; local inference on M-series Macs is not supported by the conda env.

**Source files:** `Eval/src/feature_extractor.py`, `Eval/features/mltable_*_ml/`

### 11.4 gpt-5.4 reasoning-model API contract

Calls to gpt-5.4 / gpt-5.4-nano use:
- `max_completion_tokens` (not `max_tokens`)
- **No** `temperature` parameter
- `api_version=2024-12-01-preview`

These were set deliberately. If you see them missing, do not "restore" the older OpenAI params — the calls will fail.

**Source files:** `Eval/src/llm_client.py`, `Eval/src/config.py`

### 11.5 Synthetic data framing

`Eval/src/generate_scenarios.py` and the 298 synthetic training scenarios are a **class-project stopgap** because we have no SME panel and no real telemetry. The production recommendation (§10) is expert-labeled real data. Do **not** reframe synthetic generation as the recommended approach in any writeup.

### 11.6 Prototype probability rule

See §9.4. Probabilities live in the Scenario Lab only.

---

## 12. Repo map

```
OktaATI/
├── SOURCE_OF_TRUTH.md          ← this file
├── Eval/EVAL_WRITEUP.md         ← implementation-side companion (results, open work)
├── README.md                   ← top-level orientation
│
├── Reference/                  ← authoritative spec docs (do not modify lightly)
│   ├── ATI_Eval_Framework.md
│   ├── Product Brief - Agentic Threat Intelligence.md
│   ├── Okta ATI - Tiered Automated Enforcement Experiment.md
│   ├── Okta ATI - Anomaly detection and response model eval.md
│   └── prfaq-draft.md
│
├── docs/superpowers/
│   ├── specs/2026-05-16-prototype-v2-design.md
│   └── plans/2026-05-16-prototype-v2.md
│
├── Eval/
│   ├── README.md
│   ├── requirements.txt
│   ├── prompts/                ← classifier / judge / cross-check / generator system prompts
│   ├── scenarios/
│   │   ├── eval/               ← 50 frozen scenarios
│   │   └── train/              ← 498 training scenarios
│   ├── features/               ← features_train/eval.csv + mltable_*_ml folders
│   ├── src/                    ← pipeline modules (see §7.1)
│   ├── AzureML/
│   │   ├── bold_beard/         ← 498-train PrefittedSoftVotingClassifier
│   │   └── strong_fowl/        ← 200-train PrefittedSoftVotingClassifier
│   ├── results/                ← eval_run_*.{json,md,csv}, cross_check_*, automl/
│   └── docs/
│
└── Prototype/
    ├── V1/                     ← frozen "before" artifact (do not modify)
    └── V2/                     ← active prototype
        ├── README.md
        ├── package.json
        └── src/
            ├── pages/          ← Alerts, Agents pages
            ├── components/     ← Alerts, Agents, Lab, Shell, ui
            ├── store/          ← alertsStore, labStore (+ tests)
            ├── services/       ← classifier.ts (ReplayClassifier)
            ├── data/
            │   ├── agents.ts
            │   ├── alerts.ts
            │   ├── scenarios.ts
            │   └── replay/     ← predictions_{bold_beard,gpt54nano}.json
            └── test/
```

---

## 13. How to run everything

### 13.1 Eval pipeline

See §7.3 for the full command reference. The minimum loop:

```bash
cd Eval
source .venv/bin/activate
python -m src.run_eval --dry-run          # always start here
python -m src.run_eval                    # full live run
```

### 13.2 Prototype

See §9.8.

### 13.3 Replay regeneration loop

After any new eval run or AutoML retrain:

```bash
cd Eval
python src/build_replay_data.py           # writes to Prototype/V2/src/data/replay/
cd ../Prototype/V2
bun run test                              # confirm classifier service still parses
bun run dev                               # smoke-check the Lab drawer
```

---

## 14. Open work and known limitations

### 14.1 Small eval set

n=50 is enough to demonstrate the methodology and produce comparative scorecards, but the confidence intervals on per-category metrics (especially T2 with n=10 and T3 with n=5) are wide. Production needs at least an order of magnitude more, with SME-labeled real telemetry.

### 14.2 Classifier gaps

- **T1 recall** is the main weakness. gpt-5.4-nano under-flags (33%); `bold_beard` improves to 73% but plateaus.
- **FPR floor** around 29% for the ML models suggests genuinely ambiguous Normal/T1 cases in the eval set. A bigger, SME-labeled set would clarify whether this is the boundary or the data.
- **T3 recall** drops between `strong_fowl` (100%) and `bold_beard` (60%) — adding training data helped T1 at the cost of T3. Worth investigating before declaring `bold_beard` the winner.

### 14.3 Prototype limitations

- No live classifier — replay only. The `ClassifierService` seam (§9.7) is the planned swap point.
- No real backend — enforcement actions persist only in the zustand store for the session.
- No auth, no multi-tenant model — single-operator demo.

### 14.4 Next steps for a real pilot

1. SME panel + golden set
2. Anonymized customer telemetry pipeline
3. Live model endpoint behind `ClassifierService`
4. Per-tenant policy for tier → enforcement
5. Judge-score gates in CI for any model release

---

## Appendix A — Where the prompts live

Full text is intentionally not duplicated here to avoid drift. Read the files directly:

- `Eval/prompts/classifier_system_prompt.md`
- `Eval/prompts/judge_system_prompt.md`
- `Eval/prompts/cross_check_system_prompt.md`
- `Eval/prompts/generator_system_prompt.md`

## Appendix B — Example scenarios

One representative scenario per category lives in `Eval/scenarios/eval/`. Browse by filename — they are grouped by category prefix.

## Appendix C — Glossary

| Term | Meaning |
|---|---|
| **ATI** | Agentic Threat Intelligence — this project. |
| **ITP** | Okta Identity Threat Protection — the parent product surface. |
| **Tier (T1/T2/T3)** | Anomaly severity, mapping to an enforcement action. |
| **Stall / Restrict / Kill** | The three enforcement actions. |
| **Evidence chain** | Deterministic, ordered list of telemetry observations shown in Alert detail (no probabilities). |
| **Scenario Lab** | Prototype drawer that replays real classifier outputs to inject alerts. |
| **bare-metal** | The unmodified gpt-5.4-nano LLM classifier (Phase 1). |
| **golden set** | SME-labeled benchmark scenarios (we don't have one; the eval split is the closest approximation). |
| **replay** | Pre-recorded classifier output bundled with the prototype (no live model calls). |
