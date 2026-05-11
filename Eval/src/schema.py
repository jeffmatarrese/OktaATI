"""Pydantic schemas for scenarios, classifier output, and judge output.

These guard against the LLMs returning malformed JSON and give us typed access
to fields throughout the pipeline.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


Classification = Literal["Normal", "Anomalous"]
Tier = Literal[1, 2, 3]


class GroundTruth(BaseModel):
    classification: Classification
    tier: Tier | None = None
    expected_confidence_range: tuple[float, float] = (0.6, 1.0)
    key_signals: list[str] = Field(default_factory=list)
    answer_rationale: str = ""


class Scenario(BaseModel):
    """One eval scenario. Telemetry shape is flexible — we hand it to the LLM as JSON."""

    id: str
    category: Literal["normal", "tier1", "tier2", "tier3", "adversarial"]
    narrative: str
    agent_profile: dict[str, Any]
    events: list[dict[str, Any]]
    cross_app_context: dict[str, Any]
    integration_signals: dict[str, Any] | None = None
    ground_truth: GroundTruth


class ClassifierOutput(BaseModel):
    classification: Classification
    tier: Tier | None = None
    confidence: float
    reasoning: str
    analyst_guidance: str

    @field_validator("confidence")
    @classmethod
    def _clamp_confidence(cls, v: float) -> float:
        return max(0.0, min(1.0, float(v)))

    @field_validator("tier", mode="before")
    @classmethod
    def _normalize_tier(cls, v: Any) -> Any:
        if v in ("null", "None", "", 0):
            return None
        return v


class VerifiableScores(BaseModel):
    classification_correct: bool
    tier_correct: Literal["match", "within_one_tier", "wrong"]
    no_hallucination: bool
    hallucinated_signals: list[str] = Field(default_factory=list)


class GradedDimension(BaseModel):
    score: int
    justification: str

    @field_validator("score")
    @classmethod
    def _clamp_score(cls, v: int) -> int:
        return max(1, min(5, int(v)))


class SemiVerifiableScores(BaseModel):
    reasoning_quality: GradedDimension
    cross_app_awareness: GradedDimension
    calibration: GradedDimension
    analyst_utility: GradedDimension


FailureMode = Literal[
    "false_positive",
    "false_negative",
    "wrong_tier",
    "hallucination",
    "miscalibrated",
    "weak_reasoning",
]


class JudgeOutput(BaseModel):
    verifiable: VerifiableScores
    semi_verifiable: SemiVerifiableScores
    failure_mode: FailureMode | None = None
    summary: str


class ScenarioResult(BaseModel):
    """One row of the eval run: scenario + classifier output + judge output."""

    scenario_id: str
    category: str
    ground_truth_classification: Classification
    ground_truth_tier: Tier | None
    classifier: ClassifierOutput
    judge: JudgeOutput
    classifier_model: str
    judge_model: str
