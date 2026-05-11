"""Configuration for the ATI eval pipeline.

Values are loaded from a `.env` file in the Eval/ root (see `.env.example`).
Deployment names are intentionally hardcoded as defaults for a single-run class
project — override via environment variables if needed.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Resolve project root and load .env from there
EVAL_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(EVAL_ROOT / ".env")

# Azure OpenAI connection
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")

# Deployment names — set in Foundry / Azure OpenAI portal
CLASSIFIER_DEPLOYMENT = os.getenv("AZURE_OPENAI_CLASSIFIER_DEPLOYMENT", "gpt-5.4-nano")
JUDGE_DEPLOYMENT = os.getenv("AZURE_OPENAI_JUDGE_DEPLOYMENT", "gpt-5.4")

# gpt-5.4 family is a reasoning model: temperature is locked at default and
# token budgets use max_completion_tokens (not max_tokens).
MAX_COMPLETION_TOKENS = 4096

# Filesystem paths
SCENARIOS_DIR = EVAL_ROOT / "scenarios"
EVAL_SCENARIOS_DIR = SCENARIOS_DIR / "eval"
TRAIN_SCENARIOS_DIR = SCENARIOS_DIR / "train"
PROMPTS_DIR = EVAL_ROOT / "prompts"
RESULTS_DIR = EVAL_ROOT / "results"

# Held-out evaluation set: frozen, used to benchmark every model (LLM or ML).
# These scenarios are NEVER seen by training pipelines.
SCENARIO_FILES = [
    EVAL_SCENARIOS_DIR / "normal.json",
    EVAL_SCENARIOS_DIR / "tier1_stall.json",
    EVAL_SCENARIOS_DIR / "tier2_scope_restriction.json",
    EVAL_SCENARIOS_DIR / "tier3_session_kill.json",
    EVAL_SCENARIOS_DIR / "adversarial.json",
]

# Training set for the feature-based ML classifier — generated separately,
# zero overlap with the eval set above.
TRAIN_SCENARIO_FILES = [
    TRAIN_SCENARIOS_DIR / "normal.json",
    TRAIN_SCENARIOS_DIR / "tier1_stall.json",
    TRAIN_SCENARIOS_DIR / "tier2_scope_restriction.json",
    TRAIN_SCENARIOS_DIR / "tier3_session_kill.json",
    TRAIN_SCENARIOS_DIR / "adversarial.json",
]

CLASSIFIER_PROMPT_PATH = PROMPTS_DIR / "classifier_system_prompt.md"
JUDGE_PROMPT_PATH = PROMPTS_DIR / "judge_system_prompt.md"
