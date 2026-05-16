# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A class project building a prototype + eval for **Agentic Threat Intelligence (ATI)** — an Okta Identity Threat Protection feature that detects anomalies in AI agent behavioral telemetry and recommends enforcement tiers (Stall / Scope Restriction / Session Kill).

The repository has three top-level directories, each with its own role:

- **`Reference/`** — `ATI_Eval_Framework.md` is the source-of-truth specification for the entire project: telemetry schema, scenario library, grading rubric, classifier prompt, judge prompt. Read this before making non-trivial changes to either the prototype or the eval. A mirror of it lives at `Eval/docs/eval_framework.md`.
- **`Eval/`** — Python eval pipeline (LLM-as-classifier and feature-based ML classifier both graded by LLM-as-judge). Used to validate the eval methodology that would later grade the real ML classifier.
- **`Prototype/`** — UI for the ATI feature.
- **`EVAL_WRITEUP.md`** (top of repo) — implementation-side companion to the Reference docs. Maps what was built to the framework, reports results, lists open work. Read this for current project state before doing new work.

There is no top-level build, test, or lint — each subproject is independent.

## Eval pipeline (`Eval/`)

Python pipeline against Azure AI Foundry. See `Eval/README.md` for the full setup.

### Architecture
- **Scenarios** — hand-authored telemetry payloads with ground-truth answer keys, split into two non-overlapping sets:
  - `Eval/scenarios/eval/*.json` — **50 frozen scenarios** (15/13/10/5/7 across Normal/T1/T2/T3/Adversarial). This is the held-out test set used to benchmark every model (LLM or ML). **Never train on these.**
  - `Eval/scenarios/train/*.json` — **498 training scenarios** (148/125/100/50/75) used to train the feature-based ML classifier. The first 200 were hand-authored; the additional 298 were synthesized by gpt-5.4 via `src/generate_scenarios.py`.
  - ~40% of scenarios intentionally omit `integration_signals` to test graceful degradation.
- **Prompts** (`Eval/prompts/*.md`) — the classifier system prompt enforces a strict JSON output contract; the judge system prompt enforces a scoring rubric over both verifiable (binary) and semi-verifiable (1–5) dimensions.
- **Pipeline** (`Eval/src/`):
  - `run_eval.py` → loads scenarios, strips ground truth, sends to classifier, then sends `(telemetry, model_output, ground_truth)` to the judge.
  - `schema.py` → Pydantic models for scenarios + LLM outputs (guards against malformed JSON).
  - `llm_client.py` → AzureOpenAI wrapper with a `--dry-run` mode that returns deliberately-noisy stub responses so the full pipeline can be validated without API calls.
  - `scorecard.py` → aggregates results into JSON (raw), Markdown (human-readable), and CSV (per-scenario) outputs.
- **Defaults** (`Eval/src/config.py`) — classifier `gpt-5.4-nano`, judge `gpt-5.4`. Overridable via env vars in `.env`.

### Working in `Eval/`
```bash
cd Eval
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env       # fill in AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY

python -m src.run_eval --dry-run              # validate pipeline without Azure
python -m src.run_eval --limit 5              # smoke-test 5 scenarios live
python -m src.run_eval                        # full 50-scenario live run
```
Outputs land in `Eval/results/eval_run_YYYYMMDD_HHMMSS.{json,md,csv}` (gitignored).

### When editing scenarios
The `Scenario` Pydantic model enforces the shape; the `events`, `cross_app_context`, `integration_signals`, and `agent_profile` fields are typed as flexible dicts because real telemetry has variable shapes — only the top-level structure is rigid. Every scenario must have a `ground_truth` block with `classification`, `tier` (null for Normal), `key_signals`, and `answer_rationale` — these flow into the judge.

## Prototype (`Prototype/V2/`)

Vite + React + TypeScript + Tailwind + shadcn/ui dashboard. **`Prototype/V2/` is the active working copy.** All prototype work happens here.

- **`Prototype/V1/`** — frozen "before" artifact. The original Lovable-generated dashboard authored by Aaryn (a classmate). Do not modify; keep as a reference for the V1 → V2 evolution.
- **`Prototype/V2/`** — active. Started as a copy of V1, being redesigned per `docs/superpowers/specs/2026-05-16-prototype-v2-design.md`: Okta visual identity, agent-first navigation, evidence-chain alert detail (no probabilities, per CISO feedback), and a Scenario Lab drawer that replays real `bold_beard` + `gpt-5.4-nano` outputs to drive new alerts into the dashboard.

### Working in the prototype
```bash
cd Prototype/V2
bun install        # or: npm install
bun run dev        # Vite dev server
bun run build      # production build
bun run lint       # ESLint
bun run test       # Vitest (single run)
bun run test:watch # Vitest watch mode
```

Path alias: `@/` → `src/` (configured in `tsconfig.json` and `vite.config.ts`).

## Conventions worth knowing

- **The Reference doc is authoritative.** When the framework spec and code disagree, the doc wins unless we've explicitly decided to deviate (in which case update both).
- **Ground truth lives with the scenario.** Do not pass ground truth to the classifier (only the judge sees it). `run_eval.py` enforces this via `scenario_to_classifier_payload()`.
- **Dry-run mode is the first-line smoke test.** Always validate pipeline changes with `--dry-run` before burning Azure tokens.
- **Commits: no `Co-Authored-By: Claude` trailer.** User preference.
- **gpt-5.4 reasoning-model API contract.** Calls use `max_completion_tokens` (not `max_tokens`), no `temperature` parameter, and `api_version=2024-12-01-preview`. These were deliberately set — don't restore the older params if you see them missing.
- **AutoML uploads use `mltable_*_ml/` folders, NOT the raw CSVs.** The `_ml` folders strip `scenario_id` and `category` columns to prevent label leakage — without that, AutoML's CharGramCountVectorizer tokenizes `category` and learns "category=tier3 → predict T3" for free (a leaky early run hit 99.7% AUC this way). Force all numeric columns to floats in those CSVs too, so Azure schema inference doesn't flip 0/1-only columns to Boolean in the eval set when training has wider ranges.
- **The framing matters for the writeup.** Synthetic-data generation via gpt-5.4 was a stopgap for *us as students with no SME panel and no real telemetry* — it is NOT the production recommendation. The production path per the Reference docs is expert-labeled golden set + anonymized real customer telemetry + small ML classifier. Don't reframe synthetic scaling as the recommended approach.

## Current phase

**Phase 1 complete** — bare-metal gpt-5.4-nano: 82% binary acc, 0% FPR, 33% T1 recall on the 50-scenario eval. `Eval/results/eval_run_20260510_225418_analysis.md`.

**Phase 2 complete** — feature-based ML classifier trained in Azure AutoML. Two winning models live at `Eval/AzureML/`:
- `strong_fowl/` — 200-train PrefittedSoftVotingClassifier (76% binary acc, 47% T1 recall, 100% T3 recall, 29% FPR)
- `bold_beard/` — 498-train PrefittedSoftVotingClassifier (84% binary acc, 73% T1 recall, 60% T3 recall, 29% FPR, 91% anomalous recall)

Both folders ship the same 6 files: `model.pkl`, `scoring_file_v_2_0_0.py`, `conda_env_v_1_0_0.yml`, `confusion_matrix`, `accuracy_table`, `predictions.csv`. Head-to-head scorecard at `Eval/results/automl/comparison.md`; regenerate with `python -m src.build_comparison`.

Full Phase 1 + Phase 2 writeup at `EVAL_WRITEUP.md` (top of repo). Open work documented in `EVAL_WRITEUP.md §5`: prototype panel + scoring-pipeline integration is the active next workstream.

### Eval/src commands beyond `run_eval`
```bash
python -m src.feature_extractor              # regenerate features_train/eval CSVs + mltable_*_ml folders
python -m src.cross_check --dry-run          # gpt-5.4 audit of training scenarios
python -m src.generate_scenarios --dry-run   # synthesize more training scenarios via gpt-5.4
python -m src.build_comparison               # 3-way scorecard: gpt-5.4-nano vs strong_fowl vs bold_beard
```
