"""Optional helper: synthesize additional scenarios from a template via the LLM.

This is NOT required for a v1 eval run — the 50 hand-authored scenarios in
scenarios/*.json are sufficient. Use this only when you want to expand the
library further.

Usage:
    python -m src.generate_scenarios --category tier1 --n 5 --output scenarios/extra_tier1.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import config
from .llm_client import LLMClient


TEMPLATE_PROMPT = """You are generating additional synthetic scenarios for an Okta ATI eval.

A scenario is a JSON object matching this shape (omit `integration_signals` for ~40% of generated scenarios):

```json
{{
  "id": "<unique id, e.g. T1-14>",
  "category": "{category}",
  "narrative": "1-2 sentence description of what's happening",
  "agent_profile": {{
    "agent_id": "...",
    "registered_purpose": "...",
    "registration_date": "YYYY-MM-DD",
    "owner": "...",
    "ai_platform": "openai | anthropic | internal | aws_bedrock",
    "auth_method": "oauth2_client_credentials | service_account"
  }},
  "events": [
    {{
      "event_id": "evt_...",
      "timestamp": "ISO8601",
      "event_type": "scope_request | auth | token_refresh | session_start | session_end | failed_auth | privilege_escalation",
      "target_app": {{"app_id": "...", "app_name": "...", "app_category": "..."}},
      "auth_details": {{...optional fields...}},
      "session_metadata": {{"ip_address": "...", "geolocation": "..."}}
    }}
  ],
  "cross_app_context": {{
    "apps_accessed_last_24h": ["..."],
    "total_auth_events_24h": 0,
    "scope_escalation_attempts_7d": 0,
    "new_app_connections_7d": 0
  }},
  "integration_signals": null | {{...}},
  "ground_truth": {{
    "classification": "Normal | Anomalous",
    "tier": null | 1 | 2 | 3,
    "expected_confidence_range": [0.7, 0.95],
    "key_signals": ["..."],
    "answer_rationale": "..."
  }}
}}
```

Generate {n} scenarios for category `{category}`. Vary agent types (CI/CD, customer support, data sync, compliance, IT provisioning, marketing, sales, finance, HR, engineering productivity). Each scenario must test a distinct combination of signals.

Return a JSON object: `{{"scenarios": [...]}}`. No prose outside the JSON.
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--category",
        required=True,
        choices=["normal", "tier1", "tier2", "tier3", "adversarial"],
    )
    parser.add_argument("--n", type=int, default=3)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    client = LLMClient(dry_run=False)
    prompt = TEMPLATE_PROMPT.format(category=args.category, n=args.n)

    print(f"Generating {args.n} scenarios for category={args.category}...")
    raw = client.classify(prompt, {"task": "generate"})
    args.output.write_text(json.dumps(raw, indent=2))
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
