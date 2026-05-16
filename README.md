# Agentic Threat Intelligence (ATI)

A class project: prototype + eval for an **Okta Identity Threat Protection** feature that detects anomalies in AI agent behavioral telemetry and recommends a tiered enforcement response (Stall / Scope Restriction / Session Kill).

## Live prototype

👉 **[okta-ati.vercel.app](https://okta-ati.vercel.app)**

The prototype is the V2 dashboard in `Prototype/V2/`. The Scenario Lab drawer (opens by default) lets you send hand-authored telemetry payloads through the real classifiers and watch the resulting alert land in the dashboard.

## Repo layout

```
Reference/        — source-of-truth spec (telemetry schema, scenario library,
                   grading rubric, classifier + judge prompts)
Eval/             — Python eval pipeline against Azure AI Foundry
                   (gpt-5.4-nano LLM classifier + bold_beard AutoML model,
                   both graded by gpt-5.4 as judge)
Prototype/V1/     — frozen "before" artifact (Lovable-generated dashboard)
Prototype/V2/     — active prototype (Vite + React + Tailwind + shadcn/ui)
EVAL_WRITEUP.md   — implementation-side companion to the Reference docs;
                   maps what was built to the framework and reports results
```

Each subproject is independent — there's no top-level build, test, or lint.

## What's in each piece

### `Reference/`
The framework spec. `ATI_Eval_Framework.md` is the source of truth for everything downstream: scenario shapes, ground-truth keys, the classifier output contract, and the judge rubric. Also includes the PR/FAQ draft and the broader product brief.

### `Eval/` — see [`Eval/README.md`](Eval/README.md)
50 frozen eval scenarios + 498 training scenarios across Normal / T1 / T2 / T3 / Adversarial. Two classifiers benchmarked head-to-head:
- **Phase 1** — gpt-5.4-nano bare-metal: 82% binary acc, 0% FPR, 33% T1 recall.
- **Phase 2** — `bold_beard` feature-based AutoML soft-voting ensemble: 84% binary acc, 73% T1 recall, 60% T3 recall, 91% anomalous recall.

Full results at [`EVAL_WRITEUP.md`](EVAL_WRITEUP.md).

### `Prototype/V2/` — see [`Prototype/V2/README.md`](Prototype/V2/README.md)
Okta-styled alerts dashboard with:
- Evidence-chain alert detail (deterministic — operators never see model probabilities).
- Agents directory with Shadow-AI filter.
- Scenario Lab drawer that replays real `bold_beard` + `gpt-5.4-nano` outputs to inject new alerts.
- Enforcement actions (Stall / Restrict Scope / Session Kill) wired end-to-end.
- Triage queue: tier-colored rows for needs-action, collapsed section for resolved.
- Mobile-friendly shell (hamburger nav, master-detail on small screens).

## Quick start

```bash
# Run the prototype
cd Prototype/V2
bun install        # or: npm install
bun run dev

# Run the eval (dry-run first to validate without Azure)
cd Eval
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # fill in AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY
python -m src.run_eval --dry-run
python -m src.run_eval     # full 50-scenario live run
```
