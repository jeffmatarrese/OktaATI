"""Main eval pipeline.

Usage:
    python -m src.run_eval              # live run against Foundry deployments
    python -m src.run_eval --dry-run    # stub responses, no API calls

Outputs land in results/ as JSON, Markdown, and CSV.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from pydantic import ValidationError

from . import config
from .llm_client import LLMClient
from .schema import (
    ClassifierOutput,
    JudgeOutput,
    Scenario,
    ScenarioResult,
)
from .scorecard import build_scorecard, write_outputs


def load_scenarios() -> list[Scenario]:
    scenarios: list[Scenario] = []
    for path in config.SCENARIO_FILES:
        if not path.exists():
            print(f"  WARN: missing scenario file {path}", file=sys.stderr)
            continue
        with path.open() as f:
            raw = json.load(f)
        for entry in raw["scenarios"]:
            scenarios.append(Scenario.model_validate(entry))
    return scenarios


def scenario_to_classifier_payload(scenario: Scenario) -> dict:
    """Strip ground truth before handing to the classifier."""
    payload = {
        "scenario_id": scenario.id,
        "narrative_context_only": scenario.narrative,
        "agent": scenario.agent_profile,
        "events": scenario.events,
        "cross_app_context": scenario.cross_app_context,
    }
    if scenario.integration_signals is not None:
        payload["integration_signals"] = scenario.integration_signals
    return payload


def scenario_to_dryrun_payload(scenario: Scenario) -> dict:
    """For dry-run, include ground truth so the stub can produce realistic output."""
    payload = scenario_to_classifier_payload(scenario)
    payload["ground_truth"] = scenario.ground_truth.model_dump()
    payload["id"] = scenario.id
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the Okta ATI eval pipeline.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Use stub LLM responses; do not call Azure.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of scenarios (useful for smoke testing).",
    )
    args = parser.parse_args()

    print("Loading scenarios...")
    scenarios = load_scenarios()
    if args.limit:
        scenarios = scenarios[: args.limit]
    print(f"  loaded {len(scenarios)} scenarios")

    classifier_prompt = config.CLASSIFIER_PROMPT_PATH.read_text()
    judge_prompt = config.JUDGE_PROMPT_PATH.read_text()

    client = LLMClient(dry_run=args.dry_run)
    mode_label = "DRY-RUN" if args.dry_run else "LIVE"
    print(
        f"\nRunning in {mode_label} mode  "
        f"(classifier={config.CLASSIFIER_DEPLOYMENT}, judge={config.JUDGE_DEPLOYMENT})\n"
    )

    results: list[ScenarioResult] = []

    for idx, scenario in enumerate(scenarios, start=1):
        print(f"[{idx:>3}/{len(scenarios)}] {scenario.id} ({scenario.category}) ... ", end="", flush=True)

        try:
            if args.dry_run:
                payload = scenario_to_dryrun_payload(scenario)
            else:
                payload = scenario_to_classifier_payload(scenario)

            raw_classifier = client.classify(classifier_prompt, payload)
            classifier_out = ClassifierOutput.model_validate(raw_classifier)

            telemetry_for_judge = scenario_to_classifier_payload(scenario)
            raw_judge = client.judge(
                judge_prompt,
                telemetry=telemetry_for_judge,
                model_output=classifier_out.model_dump(),
                ground_truth=scenario.ground_truth.model_dump(),
            )
            judge_out = JudgeOutput.model_validate(raw_judge)

            results.append(
                ScenarioResult(
                    scenario_id=scenario.id,
                    category=scenario.category,
                    ground_truth_classification=scenario.ground_truth.classification,
                    ground_truth_tier=scenario.ground_truth.tier,
                    classifier=classifier_out,
                    judge=judge_out,
                    classifier_model=config.CLASSIFIER_DEPLOYMENT,
                    judge_model=config.JUDGE_DEPLOYMENT,
                )
            )
            tier_str = (
                f"T{scenario.ground_truth.tier}" if scenario.ground_truth.tier else "Normal"
            )
            print(f"OK  (gt={tier_str}, pred={classifier_out.classification}/{classifier_out.tier})")
        except ValidationError as exc:
            print(f"VALIDATION ERROR: {exc}")
        except Exception as exc:  # noqa: BLE001 — we want to keep going on any failure
            print(f"ERROR: {exc}")

    if not results:
        print("\nNo successful results. Aborting scorecard.")
        return 1

    print("\nBuilding scorecard...")
    scorecard = build_scorecard(results)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    config.RESULTS_DIR.mkdir(exist_ok=True)
    base = config.RESULTS_DIR / f"eval_run_{timestamp}"
    write_outputs(base, results, scorecard, dry_run=args.dry_run)

    print(f"\nWrote results to:")
    print(f"  {base}.json")
    print(f"  {base}.md")
    print(f"  {base}.csv")
    return 0


if __name__ == "__main__":
    sys.exit(main())
