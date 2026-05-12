"""Cross-check the 200 training scenarios for realism, label fit, and
contamination with the frozen eval set.

Two passes:
  1. LOCAL contamination check — id overlap, agent_id overlap, and
     shingle-Jaccard narrative similarity between every train/eval pair.
  2. LLM audit — sends each training scenario to gpt-5.4 (judge tier) and
     collects a structured verdict (keep / revise / drop) per scenario.

Outputs land in results/cross_check_YYYYMMDD_HHMMSS.{json,md,csv}.

Usage:
    python -m src.cross_check --dry-run
    python -m src.cross_check --limit 10
    python -m src.cross_check                  # full 200-scenario live run
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

from . import config
from .llm_client import LLMClient


# ---------------------------------------------------------------------------
# Scenario loading
# ---------------------------------------------------------------------------


def _load_scenarios(paths: list[Path]) -> list[dict[str, Any]]:
    scenarios: list[dict[str, Any]] = []
    for path in paths:
        if not path.exists():
            print(f"  WARN: missing scenario file {path}", file=sys.stderr)
            continue
        with path.open() as f:
            raw = json.load(f)
        scenarios.extend(raw["scenarios"])
    return scenarios


def load_train() -> list[dict[str, Any]]:
    return _load_scenarios(config.TRAIN_SCENARIO_FILES)


def load_eval() -> list[dict[str, Any]]:
    return _load_scenarios(config.SCENARIO_FILES)


# ---------------------------------------------------------------------------
# Local contamination check
# ---------------------------------------------------------------------------


_WORD = re.compile(r"[A-Za-z0-9_]+")


def _shingles(text: str, k: int = 4) -> set[str]:
    tokens = [t.lower() for t in _WORD.findall(text or "")]
    if len(tokens) < k:
        return {" ".join(tokens)} if tokens else set()
    return {" ".join(tokens[i : i + k]) for i in range(len(tokens) - k + 1)}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def contamination_report(
    train: list[dict[str, Any]], evalset: list[dict[str, Any]], threshold: float = 0.45
) -> dict[str, Any]:
    """Find any train scenario that shares an id, agent_id, or near-identical
    narrative with any eval scenario."""

    eval_ids = {s["id"] for s in evalset}
    eval_agents = {s["agent_profile"]["agent_id"] for s in evalset}
    eval_shingles = [(s["id"], _shingles(s.get("narrative", ""))) for s in evalset]

    id_collisions: list[str] = []
    agent_collisions: list[dict[str, str]] = []
    narrative_collisions: list[dict[str, Any]] = []

    for t in train:
        tid = t["id"]
        if tid in eval_ids:
            id_collisions.append(tid)

        tagent = t["agent_profile"]["agent_id"]
        if tagent in eval_agents:
            agent_collisions.append({"train_id": tid, "shared_agent_id": tagent})

        tshingles = _shingles(t.get("narrative", ""))
        for eid, eshingles in eval_shingles:
            sim = _jaccard(tshingles, eshingles)
            if sim >= threshold:
                narrative_collisions.append(
                    {"train_id": tid, "eval_id": eid, "jaccard": round(sim, 3)}
                )

    return {
        "threshold_jaccard": threshold,
        "id_collisions": id_collisions,
        "agent_id_collisions": agent_collisions,
        "narrative_collisions": narrative_collisions,
        "clean": not (id_collisions or agent_collisions or narrative_collisions),
    }


# ---------------------------------------------------------------------------
# LLM audit
# ---------------------------------------------------------------------------


def _audit_payload(scenario: dict[str, Any]) -> dict[str, Any]:
    """The auditor sees the full scenario including ground truth — that's the point."""
    payload = {
        "id": scenario["id"],
        "category": scenario["category"],
        "narrative": scenario["narrative"],
        "agent_profile": scenario["agent_profile"],
        "events": scenario["events"],
        "cross_app_context": scenario["cross_app_context"],
        "ground_truth": scenario["ground_truth"],
    }
    if scenario.get("integration_signals") is not None:
        payload["integration_signals"] = scenario["integration_signals"]
    return payload


def run_audit(
    train: list[dict[str, Any]],
    dry_run: bool,
    limit: int | None,
    only_ids: set[str] | None = None,
) -> list[dict[str, Any]]:
    if only_ids:
        train = [s for s in train if s["id"] in only_ids]
    elif limit:
        train = train[:limit]

    client = LLMClient(dry_run=dry_run)
    system_prompt = config.CROSS_CHECK_PROMPT_PATH.read_text()

    audits: list[dict[str, Any]] = []
    for idx, scenario in enumerate(train, start=1):
        sid = scenario["id"]
        print(f"[{idx:>3}/{len(train)}] {sid} ({scenario['category']}) ... ", end="", flush=True)
        try:
            raw = client.audit(system_prompt, _audit_payload(scenario))
            verdict = raw.get("overall_verdict", "?")
            audits.append({"scenario_id": sid, "category": scenario["category"], **raw})
            print(f"OK  verdict={verdict}")
        except Exception as exc:  # noqa: BLE001
            print(f"ERROR: {exc}")
            audits.append(
                {
                    "scenario_id": sid,
                    "category": scenario["category"],
                    "error": str(exc),
                }
            )
    return audits


# ---------------------------------------------------------------------------
# Aggregation + output
# ---------------------------------------------------------------------------


def summarize_audits(audits: list[dict[str, Any]]) -> dict[str, Any]:
    verdicts = Counter(a.get("overall_verdict", "error") for a in audits)
    fits_label_false = [
        a["scenario_id"]
        for a in audits
        if a.get("ground_truth_fit", {}).get("fits_label") is False
    ]

    def mean(key_path: tuple[str, str]) -> float | None:
        vals = []
        for a in audits:
            v = a.get(key_path[0], {}).get(key_path[1])
            if isinstance(v, (int, float)):
                vals.append(v)
        return round(sum(vals) / len(vals), 2) if vals else None

    per_category: dict[str, Counter] = {}
    for a in audits:
        cat = a.get("category", "?")
        per_category.setdefault(cat, Counter())[a.get("overall_verdict", "error")] += 1

    return {
        "total": len(audits),
        "verdict_counts": dict(verdicts),
        "verdict_counts_by_category": {k: dict(v) for k, v in per_category.items()},
        "mean_realism": mean(("realism", "score")),
        "mean_internal_consistency": mean(("internal_consistency", "score")),
        "mean_ground_truth_fit": mean(("ground_truth_fit", "score")),
        "mean_diversity_signal": mean(("diversity_signal", "score")),
        "label_fit_failures": fits_label_false,
    }


def write_outputs(
    base: Path,
    contamination: dict[str, Any],
    audits: list[dict[str, Any]],
    summary: dict[str, Any],
    dry_run: bool,
) -> None:
    base.parent.mkdir(exist_ok=True, parents=True)

    full = {
        "generated_at": datetime.now().isoformat(),
        "dry_run": dry_run,
        "judge_model": config.JUDGE_DEPLOYMENT,
        "contamination": contamination,
        "summary": summary,
        "audits": audits,
    }
    base.with_suffix(".json").write_text(json.dumps(full, indent=2))

    # CSV — one row per scenario
    csv_path = base.with_suffix(".csv")
    with csv_path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "scenario_id",
                "category",
                "verdict",
                "realism",
                "internal_consistency",
                "ground_truth_fit",
                "fits_label",
                "diversity_signal",
                "issues",
                "verdict_reason",
            ]
        )
        for a in audits:
            w.writerow(
                [
                    a.get("scenario_id"),
                    a.get("category"),
                    a.get("overall_verdict") or a.get("error"),
                    a.get("realism", {}).get("score"),
                    a.get("internal_consistency", {}).get("score"),
                    a.get("ground_truth_fit", {}).get("score"),
                    a.get("ground_truth_fit", {}).get("fits_label"),
                    a.get("diversity_signal", {}).get("score"),
                    " | ".join(a.get("issues", []) or []),
                    a.get("verdict_reason", ""),
                ]
            )

    # Markdown report
    md = base.with_suffix(".md")
    lines: list[str] = []
    mode = "DRY-RUN" if dry_run else "LIVE"
    lines.append(f"# Cross-check report ({mode})")
    lines.append("")
    lines.append(f"- Generated: {datetime.now().isoformat()}")
    lines.append(f"- Judge model: `{config.JUDGE_DEPLOYMENT}`")
    lines.append(f"- Training scenarios audited: **{summary['total']}**")
    lines.append("")
    lines.append("## Contamination check (local)")
    if contamination["clean"]:
        lines.append("- ✅ No id, agent_id, or near-duplicate narrative overlap with the eval set.")
    else:
        lines.append("- ⚠️ Overlap detected:")
        if contamination["id_collisions"]:
            lines.append(f"  - id collisions: {contamination['id_collisions']}")
        if contamination["agent_id_collisions"]:
            lines.append(f"  - shared agent_ids: {contamination['agent_id_collisions']}")
        if contamination["narrative_collisions"]:
            lines.append(
                f"  - narrative Jaccard >= {contamination['threshold_jaccard']}:"
            )
            for c in contamination["narrative_collisions"]:
                lines.append(
                    f"    - train {c['train_id']} <-> eval {c['eval_id']} (j={c['jaccard']})"
                )
    lines.append("")
    lines.append("## Audit summary")
    lines.append(f"- Verdicts: `{summary['verdict_counts']}`")
    lines.append(f"- Mean realism: `{summary['mean_realism']}`")
    lines.append(f"- Mean internal consistency: `{summary['mean_internal_consistency']}`")
    lines.append(f"- Mean ground-truth fit: `{summary['mean_ground_truth_fit']}`")
    lines.append(f"- Mean diversity signal: `{summary['mean_diversity_signal']}`")
    lines.append("")
    lines.append("### Verdicts by category")
    for cat, counts in summary["verdict_counts_by_category"].items():
        lines.append(f"- **{cat}**: {counts}")
    lines.append("")

    flagged = [a for a in audits if a.get("overall_verdict") in ("revise", "drop")]
    lines.append(f"## Flagged scenarios ({len(flagged)})")
    for a in flagged:
        lines.append(
            f"- **{a['scenario_id']}** ({a.get('category')}) — "
            f"`{a.get('overall_verdict')}`: {a.get('verdict_reason','')}"
        )
        for issue in a.get("issues", []) or []:
            lines.append(f"  - {issue}")
    lines.append("")

    if summary["label_fit_failures"]:
        lines.append("## Scenarios where auditor disagreed with the label")
        for sid in summary["label_fit_failures"]:
            lines.append(f"- {sid}")
        lines.append("")

    md.write_text("\n".join(lines))


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description="Cross-check training scenarios.")
    parser.add_argument("--dry-run", action="store_true", help="Stub LLM responses.")
    parser.add_argument("--limit", type=int, default=None, help="Audit only the first N.")
    parser.add_argument(
        "--only-ids",
        type=str,
        default=None,
        help="Comma-separated scenario ids to audit (overrides --limit). Useful for re-running errors.",
    )
    parser.add_argument(
        "--merge-into",
        type=Path,
        default=None,
        help="Existing cross_check_*.json to merge results into. Errored entries with matching ids are replaced.",
    )
    parser.add_argument(
        "--jaccard-threshold",
        type=float,
        default=0.45,
        help="Narrative-similarity threshold for contamination flagging.",
    )
    args = parser.parse_args()

    print("Loading scenarios...")
    train = load_train()
    evalset = load_eval()
    print(f"  train: {len(train)}  eval: {len(evalset)}")

    print("\nRunning local contamination check...")
    contamination = contamination_report(train, evalset, threshold=args.jaccard_threshold)
    if contamination["clean"]:
        print("  ✅ no overlap")
    else:
        print(
            f"  ⚠️ id={len(contamination['id_collisions'])} "
            f"agent={len(contamination['agent_id_collisions'])} "
            f"narrative={len(contamination['narrative_collisions'])}"
        )

    only_ids = (
        {x.strip() for x in args.only_ids.split(",") if x.strip()} if args.only_ids else None
    )

    mode = "DRY-RUN" if args.dry_run else "LIVE"
    print(f"\nRunning audit in {mode} mode (judge={config.JUDGE_DEPLOYMENT})...\n")
    audits = run_audit(train, dry_run=args.dry_run, limit=args.limit, only_ids=only_ids)

    if args.merge_into and args.merge_into.exists():
        prior = json.loads(args.merge_into.read_text())
        prior_audits = prior.get("audits", [])
        new_by_id = {a["scenario_id"]: a for a in audits}
        replaced = 0
        merged: list[dict[str, Any]] = []
        for a in prior_audits:
            sid = a.get("scenario_id")
            if sid in new_by_id:
                merged.append(new_by_id.pop(sid))
                replaced += 1
            else:
                merged.append(a)
        merged.extend(new_by_id.values())
        audits = merged
        print(f"\nMerged: replaced {replaced} prior rows, added {len(new_by_id)} new rows.")

    summary = summarize_audits(audits)
    print("\nSummary:")
    print(f"  verdicts: {summary['verdict_counts']}")
    print(f"  mean realism={summary['mean_realism']}  "
          f"consistency={summary['mean_internal_consistency']}  "
          f"label_fit={summary['mean_ground_truth_fit']}  "
          f"diversity={summary['mean_diversity_signal']}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base = config.RESULTS_DIR / f"cross_check_{timestamp}"
    write_outputs(base, contamination, audits, summary, dry_run=args.dry_run)
    print(f"\nWrote:\n  {base}.json\n  {base}.md\n  {base}.csv")
    return 0


if __name__ == "__main__":
    sys.exit(main())
