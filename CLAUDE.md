# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A class project building a prototype + eval for **Agentic Threat Intelligence (ATI)** — an Okta Identity Threat Protection feature that detects anomalies in AI agent behavioral telemetry and recommends enforcement tiers (Stall / Scope Restriction / Session Kill).

The repository has three top-level directories, each with its own role:

- **`Reference/`** — `ATI_Eval_Framework.md` is the source-of-truth specification for the entire project: telemetry schema, scenario library, grading rubric, classifier prompt, judge prompt. Read this before making non-trivial changes to either the prototype or the eval. A mirror of it lives at `Eval/docs/eval_framework.md`.
- **`Eval/`** — Python eval pipeline (LLM-as-classifier graded by LLM-as-judge). Used to validate the eval methodology that would later grade the real ML classifier.
- **`Prototype/`** — UI for the ATI feature.

There is no top-level build, test, or lint — each subproject is independent.

## Eval pipeline (`Eval/`)

Python pipeline against Azure AI Foundry. See `Eval/README.md` for the full setup.

### Architecture
- **Scenarios** — hand-authored telemetry payloads with ground-truth answer keys, split into two non-overlapping sets:
  - `Eval/scenarios/eval/*.json` — **50 frozen scenarios** (15/13/10/5/7 across Normal/T1/T2/T3/Adversarial). This is the held-out test set used to benchmark every model (LLM or ML). **Never train on these.**
  - `Eval/scenarios/train/*.json` — **200 training scenarios** (60/50/40/20/30 — same distribution shape) used to train the feature-based ML classifier.
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

## Prototype (`Prototype/loveable-aaryn/`)

A Lovable-generated Vite + React + TypeScript + Tailwind + shadcn/ui dashboard authored by Aaryn (a classmate). **Treat this as a reference / potential foundation** — we may build the ATI UI on top of it rather than starting from scratch.

Current shape: React Router with `Index` (alerts list) and `NotFound`, components for `AlertCard` / `AlertDetail` / `SeverityBadge`, mock alert data in `src/data/alerts.ts`. Uses TanStack Query, react-hook-form + zod, sonner toasts.

### Working in the prototype
```bash
cd Prototype/loveable-aaryn
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

## Current phase

Phase 1 (LLM-as-classifier baseline) complete. First live run: 82% classification accuracy, 0% FPR, T1 accuracy only 30.8% — the bare-metal model under-tiers subtle single-signal anomalies. Full writeup in `Eval/results/eval_run_20260510_225418_analysis.md`.

Phase 2 in progress: train a feature-based ML classifier and compare head-to-head against gpt-5.4-nano on the frozen 50-scenario eval set. Three-stage pipeline:

1. ✅ Claude authored 200 training scenarios in `Eval/scenarios/train/`
2. ⏳ **Next:** GPT-5.4 cross-check script to audit the 200 for realism + eval-set contamination
3. Feature extractor (~18 numeric/boolean features per scenario) → CSV
4. Azure ML Studio AutoML on training CSV → predictions on the frozen eval CSV
5. Same scorecard format → direct comparison vs the baseline run
