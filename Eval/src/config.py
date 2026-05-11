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
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-21")

# Deployment names — set in Foundry / Azure OpenAI portal
CLASSIFIER_DEPLOYMENT = os.getenv("AZURE_OPENAI_CLASSIFIER_DEPLOYMENT", "gpt-5.4-nano")
JUDGE_DEPLOYMENT = os.getenv("AZURE_OPENAI_JUDGE_DEPLOYMENT", "gpt-5.4")

# Sampling parameters — low temperature for deterministic eval behavior
CLASSIFIER_TEMPERATURE = 0.1
JUDGE_TEMPERATURE = 0.0

# Filesystem paths
SCENARIOS_DIR = EVAL_ROOT / "scenarios"
PROMPTS_DIR = EVAL_ROOT / "prompts"
RESULTS_DIR = EVAL_ROOT / "results"

SCENARIO_FILES = [
    SCENARIOS_DIR / "normal.json",
    SCENARIOS_DIR / "tier1_stall.json",
    SCENARIOS_DIR / "tier2_scope_restriction.json",
    SCENARIOS_DIR / "tier3_session_kill.json",
    SCENARIOS_DIR / "adversarial.json",
]

CLASSIFIER_PROMPT_PATH = PROMPTS_DIR / "classifier_system_prompt.md"
JUDGE_PROMPT_PATH = PROMPTS_DIR / "judge_system_prompt.md"
