You are generating synthetic Okta Identity Threat Protection telemetry scenarios for training an ML classifier. Each scenario is one JSON object describing an AI agent's behavioral telemetry at the identity layer.

You MUST return a single JSON object matching this exact schema:

```json
{
  "id": "<exact id assigned to you>",
  "category": "<one of: normal, tier1, tier2, tier3, adversarial>",
  "narrative": "1-3 sentence plain-English summary that describes what's happening and why it matches the assigned category.",
  "agent_profile": {
    "agent_id": "agent_<role>_<2-digit-number> (must be UNIQUE — do not reuse any agent_id from examples or from your prior outputs)",
    "registered_purpose": "what this agent was registered to do",
    "registration_date": "YYYY-MM-DD",
    "owner": "team@acmecorp.com",
    "ai_platform": "openai | anthropic | internal",
    "auth_method": "service_account | oauth2_client_credentials"
  },
  "events": [
    {
      "event_id": "evt_<scenario_id_lowercase_no_dashes>_<3-digit>",
      "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
      "event_type": "session_start | session_end | scope_request | failed_auth | auth | token_refresh | privilege_escalation",
      "target_app": { "app_name": "string", "note": "optional, e.g. 'NEW APP'" },
      "auth_details": {
        "scopes_granted": ["..."],
        "scopes_requested": ["..."],
        "scope_delta": true | false,
        "new_scopes": ["..."],
        "result": "success | granted | failure",
        "failure_reason": "...",
        "token_fingerprint": "...",
        "action": "...",
        "...": "include only fields that are realistic for this event type"
      },
      "session_metadata": {
        "ip_address": "...",
        "geolocation": "...",
        "session_duration_minutes": 0,
        "concurrent_sessions": 0,
        "...": "optional, include only when relevant"
      }
    }
  ],
  "cross_app_context": {
    "apps_accessed_last_24h": ["..."],
    "total_auth_events_24h": 0,
    "scope_escalation_attempts_7d": 0,
    "new_app_connections_7d": 0,
    "note": "optional summary of the cross-app pattern"
  },
  "integration_signals": null,
  "ground_truth": {
    "classification": "Normal | Anomalous",
    "tier": null | 1 | 2 | 3,
    "expected_confidence_range": [0.0, 1.0],
    "key_signals": ["..."],
    "answer_rationale": "1-2 sentence explanation of why this label is correct."
  }
}
```

Tier definitions (use to set `ground_truth.tier`):
- **Normal**: agent doing what it was registered to do, OR a benign edge case explained by context (CHG ticket, owner relocation, baseline drift). `classification`=Normal, `tier`=null.
- **Tier 1 (Stall)**: a single ambiguous anomaly signal where the benign interpretation is plausible. New geo, off-hours, single new scope, minor volume bump. `classification`=Anomalous, `tier`=1.
- **Tier 2 (Scope Restriction)**: multiple converging cross-app signals — new apps + scope escalation + volume — pointing outside registered purpose. `classification`=Anomalous, `tier`=2.
- **Tier 3 (Session Kill)**: unambiguous attack pattern with corroborating evidence (token replay across geos with same fingerprint, mass enumeration THEN actual destructive actions, identity-provider takeover with rogue SAML registration, etc.). NEEDS confirmed downstream action, not just intent. `classification`=Anomalous, `tier`=3.
- **Adversarial**: a deliberately tricky case where naive classifiers misfire. Ground truth can be any of Normal/T1/T2/T3 — the "adversarial" tag is about difficulty, not class.

Generation rules:
1. **Use the assigned id and category EXACTLY** — they will be passed to you in the user message.
2. **Realism > drama.** Real Okta telemetry is sparse. 2-7 events is plenty for most scenarios. Don't pad.
3. **Tier 3 needs evidence of action, not just request.** Include privilege_escalation events with concrete actions (bulk_export, delete_object, create_admin_user, etc.) — not just scope_request followed by silence.
4. **agent_id MUST be unique.** Do not reuse `agent_id`s from any provided examples. Pick a fresh role-based id like `agent_<role>_<2-digit-number>` with a number you haven't seen.
5. **No copying narratives.** Vary the agent role, business context, app set, geo, scopes, and attack pattern across scenarios. If your output reads like a rewrite of an example, start over.
6. **integration_signals is optional** — set to `null` ~60% of the time, include it ~40% of the time to test graceful degradation. When included, use realistic fields like `crud_action_count_1h`, `baseline_crud_1h`, `data_volume_indicator`, `source`.
7. **Timestamps must be coherent** — events should be in chronological order with realistic deltas (seconds to minutes for an attack burst; hours/days for slow drift).
8. **expected_confidence_range** should be high (0.85-0.99) for unambiguous cases and lower (0.5-0.85) for boundary/adversarial cases.

Output JSON only. No prose, no markdown fences, no commentary.
