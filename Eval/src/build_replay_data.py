"""Build replay-data JSONs for the V2 Prototype Scenario Lab.

Reads:
  - Eval/features/features_eval.csv          (for the canonical scenario_id ordering)
  - Eval/AzureML/bold_beard/predictions.csv  (per-row ML predictions; no scenario_id)
  - Eval/results/eval_run_20260510_225418.json (nano LLM eval; already keyed by scenario_id)

Writes:
  - Prototype/V2/src/data/replay/predictions_bold_beard.json
  - Prototype/V2/src/data/replay/predictions_gpt54nano.json

Run from repo root:
  python -m src.build_replay_data         # (from Eval/)
or
  python Eval/src/build_replay_data.py
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FEATURES_EVAL = REPO_ROOT / "Eval" / "features" / "features_eval.csv"
BB_PREDICTIONS = REPO_ROOT / "Eval" / "AzureML" / "bold_beard" / "predictions.csv"
NANO_RESULTS = REPO_ROOT / "Eval" / "results" / "eval_run_20260510_225418.json"
OUT_DIR = REPO_ROOT / "Prototype" / "V2" / "src" / "data" / "replay"

TIERS = ("Normal", "T1", "T2", "T3")


def map_nano_tier(classification: str, tier: int | None) -> str:
    """Map nano output (classification + tier) to our 4-bucket Tier."""
    if classification == "Normal":
        return "Normal"
    if tier in (1, 2, 3):
        return f"T{tier}"
    raise ValueError(f"unexpected nano output: {classification!r} tier={tier!r}")


def build_bold_beard() -> list[dict]:
    """Join predictions.csv to scenario IDs by row order against features_eval.csv."""
    with FEATURES_EVAL.open() as f:
        scenario_ids = [row["scenario_id"] for row in csv.DictReader(f)]
    with BB_PREDICTIONS.open() as f:
        rows = list(csv.DictReader(f))
    assert len(scenario_ids) == len(rows), (
        f"row count mismatch: features_eval={len(scenario_ids)} predictions={len(rows)}"
    )
    out = []
    for sid, row in zip(scenario_ids, rows):
        probs = {t: float(row[f"{t}_predicted_proba"]) for t in TIERS}
        out.append({
            "scenarioId": sid,
            "predicted": row["label_predicted"],
            "probs": probs,
        })
    return out


def build_nano() -> list[dict]:
    data = json.loads(NANO_RESULTS.read_text())
    out = []
    for s in data["scenarios"]:
        c = s["classifier"]
        out.append({
            "scenarioId": s["scenario_id"],
            "predicted": map_nano_tier(c["classification"], c.get("tier")),
            "confidence": float(c["confidence"]),
            "reasoning": c["reasoning"],
        })
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    bb = build_bold_beard()
    nano = build_nano()
    (OUT_DIR / "predictions_bold_beard.json").write_text(
        json.dumps(bb, indent=2) + "\n"
    )
    (OUT_DIR / "predictions_gpt54nano.json").write_text(
        json.dumps(nano, indent=2) + "\n"
    )
    print(f"Wrote {len(bb)} bold_beard rows and {len(nano)} nano rows to {OUT_DIR}")


if __name__ == "__main__":
    main()
