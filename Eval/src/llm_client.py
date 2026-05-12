"""Azure OpenAI client wrapper for classifier and judge calls.

In `--dry-run` mode, returns stub responses so the pipeline can be validated
end-to-end without deploying Foundry models.
"""

from __future__ import annotations

import json
import random
from typing import Any

from openai import AzureOpenAI

from . import config


class LLMClient:
    def __init__(self, dry_run: bool = False) -> None:
        self.dry_run = dry_run
        if dry_run:
            self._client: AzureOpenAI | None = None
            return

        if not config.AZURE_OPENAI_ENDPOINT or not config.AZURE_OPENAI_API_KEY:
            raise RuntimeError(
                "AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY must be set in .env "
                "for live runs. Use --dry-run to test without Azure."
            )

        self._client = AzureOpenAI(
            azure_endpoint=config.AZURE_OPENAI_ENDPOINT,
            api_key=config.AZURE_OPENAI_API_KEY,
            api_version=config.AZURE_OPENAI_API_VERSION,
        )

    def classify(self, system_prompt: str, scenario_payload: dict[str, Any]) -> dict[str, Any]:
        """Call the classifier deployment. Returns parsed JSON dict."""
        if self.dry_run:
            return _stub_classifier_output(scenario_payload)

        user_content = json.dumps(scenario_payload, indent=2)
        resp = self._client.chat.completions.create(  # type: ignore[union-attr]
            model=config.CLASSIFIER_DEPLOYMENT,
            max_completion_tokens=config.MAX_COMPLETION_TOKENS,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
        )
        return _parse_json(resp.choices[0].message.content or "{}")

    def audit(self, system_prompt: str, scenario: dict[str, Any]) -> dict[str, Any]:
        """Call the judge-tier deployment to audit a training scenario for realism,
        consistency, and ground-truth fit. Returns parsed JSON dict.
        """
        if self.dry_run:
            return _stub_audit_output(scenario)

        user_content = json.dumps(scenario, indent=2)
        resp = self._client.chat.completions.create(  # type: ignore[union-attr]
            model=config.JUDGE_DEPLOYMENT,
            max_completion_tokens=config.MAX_COMPLETION_TOKENS,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
        )
        return _parse_json(resp.choices[0].message.content or "{}")

    def judge(
        self,
        system_prompt: str,
        telemetry: dict[str, Any],
        model_output: dict[str, Any],
        ground_truth: dict[str, Any],
    ) -> dict[str, Any]:
        """Call the judge deployment. Returns parsed JSON dict."""
        if self.dry_run:
            return _stub_judge_output(model_output, ground_truth)

        user_content = json.dumps(
            {
                "TELEMETRY": telemetry,
                "MODEL_OUTPUT": model_output,
                "GROUND_TRUTH": ground_truth,
            },
            indent=2,
        )
        resp = self._client.chat.completions.create(  # type: ignore[union-attr]
            model=config.JUDGE_DEPLOYMENT,
            max_completion_tokens=config.MAX_COMPLETION_TOKENS,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
        )
        return _parse_json(resp.choices[0].message.content or "{}")


def _parse_json(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)


# Stub responses for --dry-run mode.
# These are intentionally heuristic — they mimic a plausible classifier so the
# scorecard math exercises every code path.

def _stub_classifier_output(scenario_payload: dict[str, Any]) -> dict[str, Any]:
    """Heuristic stub: read the ground-truth-ish hints from the scenario narrative.

    NOTE: In dry-run we DO have access to the scenario's ground truth (we're not
    actually calling an LLM). To make scorecard output realistic, we add noise:
    80% correct classification, 70% correct tier when anomalous.
    """
    gt = scenario_payload.get("ground_truth", {})
    correct_class: str = gt.get("classification", "Normal")
    correct_tier = gt.get("tier")

    rng = random.Random(scenario_payload.get("id", "x"))

    # Inject some realistic miss patterns
    classification = correct_class
    tier = correct_tier
    if rng.random() < 0.20:
        # 20% misclassification
        classification = "Anomalous" if correct_class == "Normal" else "Normal"
        tier = 1 if classification == "Anomalous" else None
    elif classification == "Anomalous" and rng.random() < 0.30:
        # 30% wrong-tier among anomalous
        choices = [t for t in (1, 2, 3) if t != correct_tier]
        tier = rng.choice(choices)

    confidence = round(rng.uniform(0.55, 0.92), 2)

    return {
        "classification": classification,
        "tier": tier,
        "confidence": confidence,
        "reasoning": (
            "[DRY-RUN STUB] Stub classifier output. The real classifier would cite "
            "specific signals from the telemetry, baseline comparisons, and cross-app "
            f"patterns. Scenario id: {scenario_payload.get('id')}."
        ),
        "analyst_guidance": (
            "[DRY-RUN STUB] Verify agent owner intent and review recent scope changes."
        ),
    }


def _stub_audit_output(scenario: dict[str, Any]) -> dict[str, Any]:
    """Heuristic stub audit: mostly 'keep' verdicts with occasional 'revise'."""
    rng = random.Random(scenario.get("id", "x"))
    realism = rng.choice([3, 4, 4, 4, 5, 5])
    consistency = rng.choice([3, 4, 4, 4, 5, 5])
    fit = rng.choice([3, 4, 4, 5, 5])
    diversity = rng.choice([2, 3, 3, 4, 4])
    fits_label = fit >= 4
    verdict = "keep" if fits_label and consistency >= 4 else rng.choice(["revise", "keep"])
    issues = [] if verdict == "keep" else ["[DRY-RUN STUB] simulated revise flag"]
    return {
        "realism": {"score": realism, "justification": "[DRY-RUN STUB]"},
        "internal_consistency": {"score": consistency, "justification": "[DRY-RUN STUB]"},
        "ground_truth_fit": {
            "score": fit,
            "fits_label": fits_label,
            "justification": "[DRY-RUN STUB]",
        },
        "diversity_signal": {"score": diversity, "justification": "[DRY-RUN STUB]"},
        "issues": issues,
        "overall_verdict": verdict,
        "verdict_reason": "[DRY-RUN STUB] stub verdict for pipeline validation",
    }


def _stub_judge_output(
    model_output: dict[str, Any], ground_truth: dict[str, Any]
) -> dict[str, Any]:
    """Heuristic stub judge: compares classification and tier mechanically."""
    model_class = model_output.get("classification")
    gt_class = ground_truth.get("classification")
    model_tier = model_output.get("tier")
    gt_tier = ground_truth.get("tier")

    classification_correct = model_class == gt_class

    if model_tier == gt_tier:
        tier_correct = "match"
    elif model_tier is None or gt_tier is None:
        tier_correct = "wrong"
    elif abs(int(model_tier) - int(gt_tier)) == 1:
        tier_correct = "within_one_tier"
    else:
        tier_correct = "wrong"

    failure_mode: str | None
    if not classification_correct:
        failure_mode = "false_positive" if gt_class == "Normal" else "false_negative"
    elif tier_correct == "wrong":
        failure_mode = "wrong_tier"
    else:
        failure_mode = None

    base_score = 4 if classification_correct and tier_correct != "wrong" else 2

    return {
        "verifiable": {
            "classification_correct": classification_correct,
            "tier_correct": tier_correct,
            "no_hallucination": True,
            "hallucinated_signals": [],
        },
        "semi_verifiable": {
            "reasoning_quality": {"score": base_score, "justification": "[DRY-RUN STUB]"},
            "cross_app_awareness": {"score": base_score, "justification": "[DRY-RUN STUB]"},
            "calibration": {"score": base_score, "justification": "[DRY-RUN STUB]"},
            "analyst_utility": {"score": base_score, "justification": "[DRY-RUN STUB]"},
        },
        "failure_mode": failure_mode,
        "summary": "[DRY-RUN STUB] Stub judge output for pipeline validation.",
    }
