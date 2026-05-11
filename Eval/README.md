# Okta ATI Eval

An evaluation harness for the **Agentic Threat Intelligence (ATI)** anomaly-detection model. A classifier LLM reads synthetic Okta agent telemetry and produces a `(classification, tier, confidence, reasoning, analyst_guidance)` tuple. A judge LLM grades the classifier's output against ground truth, producing both binary (correct / incorrect / hallucinated) and 1–5 graded dimensions (reasoning quality, cross-app awareness, calibration, analyst utility). Results are aggregated into a scorecard in JSON, Markdown, and CSV.

This pipeline is a stand-in: in production the classifier would be a purpose-built ML model trained on Okta's behavioral data. The eval methodology — synthetic scenarios, structured rubric, LLM-as-judge, reasoning analysis — transfers directly.

See [`docs/eval_framework.md`](docs/eval_framework.md) for the full framework specification.

---

## Project layout

```
Eval/
├── prompts/                 # System prompts for classifier + judge
├── scenarios/               # 50 hand-authored telemetry scenarios
├── src/                     # Python pipeline code
├── results/                 # Output (gitignored)
└── docs/                    # Framework reference
```

## Setup

1. **Install dependencies**

   ```bash
   cd Eval
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Deploy two Azure AI Foundry models**

   The pipeline uses two distinct deployments — one classifier (model under test) and one judge (grader, should be at least as capable as the classifier).

   | Role        | Recommended deployment | Why                                              |
   |-------------|------------------------|--------------------------------------------------|
   | Classifier  | `gpt-5.4-nano`         | Newest small model — small enough to produce interesting failure modes on tier-boundary scenarios |
   | Judge       | `gpt-5.4`              | Same architecture family, clearly more capable so its grades on the classifier are trustworthy |

   In the Foundry portal: deploy `gpt-5.4-nano` and `gpt-5.4` from the model catalog, name the deployments whatever you like, copy your endpoint and API key.

3. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your endpoint, key, and deployment names
   ```

## Running the eval

**Dry-run (no Azure calls, uses stub responses to validate the pipeline):**

```bash
python -m src.run_eval --dry-run
```

**Live run (calls your Foundry deployments):**

```bash
python -m src.run_eval
```

Outputs land in `results/`:

- `eval_run_YYYYMMDD_HHMMSS.json` — raw per-scenario classifier output + judge scores
- `eval_run_YYYYMMDD_HHMMSS.md` — human-readable scorecard
- `eval_run_YYYYMMDD_HHMMSS.csv` — one row per scenario for spreadsheet analysis

## Scorecard dimensions

**Verifiable (binary):**
- `classification_correct` — did flag/no-flag match ground truth?
- `tier_correct` — did the recommended tier match (within-one-tier partial credit)?
- `no_hallucination` — did the reasoning cite only signals present in the input?

**Semi-verifiable (1–5):**
- `reasoning_quality`
- `cross_app_awareness`
- `calibration`
- `analyst_utility`

Aggregations: overall accuracy, accuracy by tier, false-positive rate on Normal scenarios, hallucination rate, and 1–5 averages per dimension.

## Scenario library

50 hand-authored scenarios following the framework's target distribution:

| File                             | Count | Category                                   |
|----------------------------------|-------|--------------------------------------------|
| `scenarios/normal.json`          | 15    | Routine agent behavior (false-positive trap) |
| `scenarios/tier1_stall.json`     | 13    | Ambiguous anomalies → analyst review        |
| `scenarios/tier2_scope_restriction.json` | 10 | High-confidence cross-app anomalies        |
| `scenarios/tier3_session_kill.json`      | 5  | Severe attacks matching known signatures   |
| `scenarios/adversarial.json`     | 7     | Tier-boundary and benign-mirror edge cases |

About 40% of scenarios omit the optional `integration_signals` block to test graceful degradation when only auth-layer data is available.

## Extending the library

`src/generate_scenarios.py` is a helper that calls the classifier deployment to synthesize additional scenarios from templates. It's a convenience tool; the 50 seed scenarios are sufficient for a v1 eval run.
