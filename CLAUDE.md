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
- **Scenarios** (`Eval/scenarios/*.json`, 50 total across 5 files) — hand-authored telemetry payloads with ground-truth answer keys. Distribution: 15 Normal, 13 Tier 1, 10 Tier 2, 5 Tier 3, 7 Adversarial. ~40% intentionally omit `integration_signals` to test graceful degradation.
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
