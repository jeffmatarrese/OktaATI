"""Aggregate per-scenario results into a scorecard.

Emits JSON (raw), Markdown (human-readable), and CSV (one row per scenario).
"""

from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean
from typing import Any

from tabulate import tabulate

from .schema import ScenarioResult


CATEGORY_ORDER = ["normal", "tier1", "tier2", "tier3", "adversarial"]


def build_scorecard(results: list[ScenarioResult]) -> dict[str, Any]:
    total = len(results)

    classification_correct = sum(1 for r in results if r.judge.verifiable.classification_correct)
    tier_match = sum(1 for r in results if r.judge.verifiable.tier_correct == "match")
    tier_within_one = sum(1 for r in results if r.judge.verifiable.tier_correct == "within_one_tier")
    tier_wrong = sum(1 for r in results if r.judge.verifiable.tier_correct == "wrong")
    no_halluc = sum(1 for r in results if r.judge.verifiable.no_hallucination)

    # False positive rate: of the Normal scenarios, how many were flagged anomalous?
    normals = [r for r in results if r.ground_truth_classification == "Normal"]
    fps = [r for r in normals if not r.judge.verifiable.classification_correct]
    fpr = (len(fps) / len(normals)) if normals else 0.0

    # False negative rate: of the Anomalous scenarios, how many were missed?
    anomalies = [r for r in results if r.ground_truth_classification == "Anomalous"]
    fns = [r for r in anomalies if not r.judge.verifiable.classification_correct]
    fnr = (len(fns) / len(anomalies)) if anomalies else 0.0

    # Per-category accuracy
    by_category: dict[str, dict[str, Any]] = {}
    cat_groups: dict[str, list[ScenarioResult]] = defaultdict(list)
    for r in results:
        cat_groups[r.category].append(r)

    for cat in CATEGORY_ORDER:
        group = cat_groups.get(cat, [])
        if not group:
            continue
        cls_correct = sum(1 for r in group if r.judge.verifiable.classification_correct)
        tier_m = sum(1 for r in group if r.judge.verifiable.tier_correct == "match")
        by_category[cat] = {
            "count": len(group),
            "classification_accuracy": cls_correct / len(group),
            "tier_match_rate": tier_m / len(group),
        }

    # Semi-verifiable averages
    def avg(dim: str) -> float:
        scores = [getattr(r.judge.semi_verifiable, dim).score for r in results]
        return round(mean(scores), 2) if scores else 0.0

    semi_avgs = {
        "reasoning_quality": avg("reasoning_quality"),
        "cross_app_awareness": avg("cross_app_awareness"),
        "calibration": avg("calibration"),
        "analyst_utility": avg("analyst_utility"),
    }

    # Failure mode buckets
    failure_modes = Counter(r.judge.failure_mode for r in results if r.judge.failure_mode)

    return {
        "totals": {
            "n_scenarios": total,
            "classification_accuracy": round(classification_correct / total, 3) if total else 0,
            "tier_match_rate": round(tier_match / total, 3) if total else 0,
            "tier_within_one_rate": round((tier_match + tier_within_one) / total, 3) if total else 0,
            "hallucination_free_rate": round(no_halluc / total, 3) if total else 0,
            "false_positive_rate": round(fpr, 3),
            "false_negative_rate": round(fnr, 3),
        },
        "by_category": by_category,
        "semi_verifiable_avg_1_to_5": semi_avgs,
        "failure_modes": dict(failure_modes),
        "counts": {
            "classification_correct": classification_correct,
            "tier_match": tier_match,
            "tier_within_one": tier_within_one,
            "tier_wrong": tier_wrong,
            "no_hallucination": no_halluc,
        },
    }


def write_outputs(
    base: Path,
    results: list[ScenarioResult],
    scorecard: dict[str, Any],
    dry_run: bool,
) -> None:
    _write_json(base.with_suffix(".json"), results, scorecard, dry_run)
    _write_markdown(base.with_suffix(".md"), results, scorecard, dry_run)
    _write_csv(base.with_suffix(".csv"), results)


def _write_json(
    path: Path, results: list[ScenarioResult], scorecard: dict[str, Any], dry_run: bool
) -> None:
    payload = {
        "meta": {
            "dry_run": dry_run,
            "n_scenarios": len(results),
        },
        "scorecard": scorecard,
        "scenarios": [r.model_dump() for r in results],
    }
    path.write_text(json.dumps(payload, indent=2))


def _write_markdown(
    path: Path, results: list[ScenarioResult], scorecard: dict[str, Any], dry_run: bool
) -> None:
    totals = scorecard["totals"]
    sv = scorecard["semi_verifiable_avg_1_to_5"]

    lines: list[str] = []
    lines.append("# Okta ATI Eval — Scorecard")
    lines.append("")
    if dry_run:
        lines.append("> **DRY-RUN MODE.** Results are from stub LLM responses, not a real model.")
        lines.append("")
    lines.append(f"**Total scenarios:** {totals['n_scenarios']}")
    if results:
        lines.append(f"**Classifier model:** `{results[0].classifier_model}`")
        lines.append(f"**Judge model:** `{results[0].judge_model}`")
    lines.append("")

    lines.append("## Overall")
    lines.append("")
    overall_rows = [
        ["Classification accuracy", f"{totals['classification_accuracy']:.1%}"],
        ["Tier exact match", f"{totals['tier_match_rate']:.1%}"],
        ["Tier within-one match", f"{totals['tier_within_one_rate']:.1%}"],
        ["Hallucination-free rate", f"{totals['hallucination_free_rate']:.1%}"],
        ["False positive rate (on Normal)", f"{totals['false_positive_rate']:.1%}"],
        ["False negative rate (on Anomalous)", f"{totals['false_negative_rate']:.1%}"],
    ]
    lines.append(tabulate(overall_rows, headers=["Metric", "Value"], tablefmt="github"))
    lines.append("")

    lines.append("## By category")
    lines.append("")
    cat_rows = []
    for cat, stats in scorecard["by_category"].items():
        cat_rows.append([
            cat,
            stats["count"],
            f"{stats['classification_accuracy']:.1%}",
            f"{stats['tier_match_rate']:.1%}",
        ])
    lines.append(
        tabulate(
            cat_rows,
            headers=["Category", "N", "Classification accuracy", "Tier match"],
            tablefmt="github",
        )
    )
    lines.append("")

    lines.append("## Reasoning quality (1–5)")
    lines.append("")
    sv_rows = [[k, v] for k, v in sv.items()]
    lines.append(tabulate(sv_rows, headers=["Dimension", "Average"], tablefmt="github"))
    lines.append("")

    lines.append("## Failure modes")
    lines.append("")
    if scorecard["failure_modes"]:
        fm_rows = sorted(scorecard["failure_modes"].items(), key=lambda kv: -kv[1])
        lines.append(tabulate(fm_rows, headers=["Mode", "Count"], tablefmt="github"))
    else:
        lines.append("_No failure modes recorded._")
    lines.append("")

    lines.append("## Per-scenario summary")
    lines.append("")
    per_rows = []
    for r in results:
        gt_label = (
            f"T{r.ground_truth_tier}" if r.ground_truth_tier else r.ground_truth_classification
        )
        pred_label = (
            f"T{r.classifier.tier}" if r.classifier.tier else r.classifier.classification
        )
        per_rows.append([
            r.scenario_id,
            r.category,
            gt_label,
            pred_label,
            f"{r.classifier.confidence:.2f}",
            r.judge.verifiable.classification_correct,
            r.judge.verifiable.tier_correct,
            r.judge.failure_mode or "",
        ])
    lines.append(
        tabulate(
            per_rows,
            headers=["ID", "Category", "GT", "Pred", "Conf", "Class✓", "Tier", "Failure"],
            tablefmt="github",
        )
    )
    lines.append("")

    path.write_text("\n".join(lines))


def _write_csv(path: Path, results: list[ScenarioResult]) -> None:
    fields = [
        "scenario_id",
        "category",
        "ground_truth_classification",
        "ground_truth_tier",
        "pred_classification",
        "pred_tier",
        "confidence",
        "classification_correct",
        "tier_correct",
        "no_hallucination",
        "reasoning_quality",
        "cross_app_awareness",
        "calibration",
        "analyst_utility",
        "failure_mode",
        "classifier_model",
        "judge_model",
        "reasoning",
    ]
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for r in results:
            sv = r.judge.semi_verifiable
            v = r.judge.verifiable
            writer.writerow({
                "scenario_id": r.scenario_id,
                "category": r.category,
                "ground_truth_classification": r.ground_truth_classification,
                "ground_truth_tier": r.ground_truth_tier or "",
                "pred_classification": r.classifier.classification,
                "pred_tier": r.classifier.tier or "",
                "confidence": r.classifier.confidence,
                "classification_correct": v.classification_correct,
                "tier_correct": v.tier_correct,
                "no_hallucination": v.no_hallucination,
                "reasoning_quality": sv.reasoning_quality.score,
                "cross_app_awareness": sv.cross_app_awareness.score,
                "calibration": sv.calibration.score,
                "analyst_utility": sv.analyst_utility.score,
                "failure_mode": r.judge.failure_mode or "",
                "classifier_model": r.classifier_model,
                "judge_model": r.judge_model,
                "reasoning": r.classifier.reasoning,
            })
