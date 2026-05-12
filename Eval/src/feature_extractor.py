"""Convert ATI scenarios into feature vectors for ML training.

Reads scenarios from `scenarios/train/` and `scenarios/eval/`, emits two CSVs:
  - features_train.csv (200 rows)
  - features_eval.csv   (50 rows, frozen held-out)

Each row has the same columns. The `label` column is derived from
`ground_truth.classification`/`tier` (Normal / T1 / T2 / T3). The trainable
features are all numeric or boolean — categorical strings stay in the
traceability columns (`scenario_id`, `category`) and the CSV consumer
(Azure ML AutoML) should be told to ignore those.

Usage:
    python -m src.feature_extractor                  # writes both CSVs
    python -m src.feature_extractor --print-schema   # show feature names
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any

from . import config


# Reference date for "agent_age_days". Scenarios are dated to mid-May 2026
# in the synthetic timeline; use today's machine clock so this stays sane if
# the dataset is regenerated later.
TODAY = date.today()


# ---------------------------------------------------------------------------
# Label derivation
# ---------------------------------------------------------------------------


def derive_label(scenario: dict[str, Any]) -> str:
    gt = scenario["ground_truth"]
    if gt["classification"] == "Normal":
        return "Normal"
    tier = gt.get("tier")
    if tier in (1, 2, 3):
        return f"T{tier}"
    return "Unknown"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _all_scopes(events: list[dict[str, Any]]) -> list[str]:
    out: list[str] = []
    for e in events:
        ad = e.get("auth_details") or {}
        for key in ("scopes_granted", "scopes_requested", "new_scopes", "removed_scopes"):
            v = ad.get(key)
            if isinstance(v, list):
                out.extend(str(s) for s in v)
    return out


def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        return None


def _max_concurrent_sessions(events: list[dict[str, Any]]) -> int:
    best = 0
    for e in events:
        sm = e.get("session_metadata") or {}
        v = sm.get("concurrent_sessions")
        if isinstance(v, int) and v > best:
            best = v
    return best


def _has_anonymizer(events: list[dict[str, Any]]) -> bool:
    keywords = ("tor", "anonymizer", "proxy", "exit node")
    for e in events:
        sm = e.get("session_metadata") or {}
        geo = (sm.get("geolocation") or "").lower()
        if any(kw in geo for kw in keywords):
            return True
    return False


def _volume_ratio(int_sig: dict[str, Any]) -> float:
    """Pair the highest-cardinality crud action count with its matching baseline."""
    for window in ("10m", "1h", "2h", "24h"):
        cur = int_sig.get(f"crud_action_count_{window}")
        base = int_sig.get(f"baseline_crud_{window}")
        if isinstance(cur, (int, float)) and isinstance(base, (int, float)) and base > 0:
            return round(cur / base, 3)
    return 1.0


def _is_high_volume(int_sig: dict[str, Any]) -> bool:
    v = (int_sig.get("data_volume_indicator") or "").lower()
    return "high" in v or "elevated" in v or "spike" in v


# ---------------------------------------------------------------------------
# Feature extraction
# ---------------------------------------------------------------------------


def extract_features(scenario: dict[str, Any]) -> dict[str, Any]:
    events = scenario.get("events", []) or []
    agent = scenario.get("agent_profile", {}) or {}
    cac = scenario.get("cross_app_context", {}) or {}
    int_sig = scenario.get("integration_signals") or {}

    scopes = _all_scopes(events)
    apps_in_events = {
        (e.get("target_app") or {}).get("app_name")
        for e in events
        if (e.get("target_app") or {}).get("app_name")
    }
    geos = {
        (e.get("session_metadata") or {}).get("geolocation")
        for e in events
        if (e.get("session_metadata") or {}).get("geolocation")
    }
    ips = {
        (e.get("session_metadata") or {}).get("ip_address")
        for e in events
        if (e.get("session_metadata") or {}).get("ip_address")
    }

    has_scope_delta = any(
        (e.get("auth_details") or {}).get("scope_delta") is True for e in events
    )

    event_type_counts = {
        "failed_auth": 0,
        "scope_request": 0,
        "privilege_escalation": 0,
        "token_refresh": 0,
    }
    for e in events:
        et = e.get("event_type")
        if et in event_type_counts:
            event_type_counts[et] += 1

    reg_date = _parse_date(agent.get("registration_date"))
    agent_age_days = (TODAY - reg_date).days if reg_date else -1

    auth_method = agent.get("auth_method", "")

    apps_24h = cac.get("apps_accessed_last_24h") or []

    features: dict[str, Any] = {
        # traceability (not for training — strip before AutoML)
        "scenario_id": scenario["id"],
        "category": scenario.get("category", ""),
        # label
        "label": derive_label(scenario),
        # event-shape features
        "event_count": len(events),
        "unique_apps_in_events": len(apps_in_events),
        "unique_event_types": len({e.get("event_type") for e in events if e.get("event_type")}),
        "failed_auth_count": event_type_counts["failed_auth"],
        "scope_request_count": event_type_counts["scope_request"],
        "privilege_escalation_count": event_type_counts["privilege_escalation"],
        "token_refresh_count": event_type_counts["token_refresh"],
        # scope features
        "has_scope_delta": has_scope_delta,
        "total_scopes_seen": len(scopes),
        "unique_scopes": len(set(scopes)),
        "has_admin_scope": any(s.startswith("admin:") or "admin" in s.lower() for s in scopes),
        "has_write_scope": any("write" in s.lower() for s in scopes),
        # geo/session features
        "unique_geos": len(geos),
        "unique_ips": len(ips),
        "max_concurrent_sessions": _max_concurrent_sessions(events),
        "has_anonymizer_geo": _has_anonymizer(events),
        # cross-app context
        "apps_accessed_last_24h_count": len(apps_24h),
        "total_auth_events_24h": int(cac.get("total_auth_events_24h") or 0),
        "scope_escalation_attempts_7d": int(cac.get("scope_escalation_attempts_7d") or 0),
        "new_app_connections_7d": int(cac.get("new_app_connections_7d") or 0),
        # agent profile
        "agent_age_days": agent_age_days,
        "auth_method_service_account": auth_method == "service_account",
        "auth_method_oauth_client_credentials": auth_method == "oauth2_client_credentials",
        # integration signals
        "integration_signals_present": bool(scenario.get("integration_signals")),
        "crud_volume_ratio": _volume_ratio(int_sig) if int_sig else 1.0,
        "data_volume_high": _is_high_volume(int_sig) if int_sig else False,
    }
    return features


# Feature column order — used for CSV header consistency.
FEATURE_COLUMNS = [
    "scenario_id",
    "category",
    "label",
    "event_count",
    "unique_apps_in_events",
    "unique_event_types",
    "failed_auth_count",
    "scope_request_count",
    "privilege_escalation_count",
    "token_refresh_count",
    "has_scope_delta",
    "total_scopes_seen",
    "unique_scopes",
    "has_admin_scope",
    "has_write_scope",
    "unique_geos",
    "unique_ips",
    "max_concurrent_sessions",
    "has_anonymizer_geo",
    "apps_accessed_last_24h_count",
    "total_auth_events_24h",
    "scope_escalation_attempts_7d",
    "new_app_connections_7d",
    "agent_age_days",
    "auth_method_service_account",
    "auth_method_oauth_client_credentials",
    "integration_signals_present",
    "crud_volume_ratio",
    "data_volume_high",
]

TRAINABLE_FEATURE_COLUMNS = [
    c for c in FEATURE_COLUMNS if c not in ("scenario_id", "category", "label")
]


# ---------------------------------------------------------------------------
# CSV writers
# ---------------------------------------------------------------------------


def _load_set(paths: list[Path]) -> list[dict[str, Any]]:
    scenarios: list[dict[str, Any]] = []
    for path in paths:
        if not path.exists():
            continue
        with path.open() as f:
            raw = json.load(f)
        scenarios.extend(raw["scenarios"])
    return scenarios


def write_csv(scenarios: list[dict[str, Any]], out_path: Path) -> None:
    """Write the full CSV (traceability + features + label).

    All numeric columns are written as floats so AutoML schema inference is
    identical across train and eval (avoids the 0/1-only-in-eval -> Boolean
    inference trap).
    """
    out_path.parent.mkdir(exist_ok=True, parents=True)
    string_cols = {"scenario_id", "category", "label"}
    with out_path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FEATURE_COLUMNS)
        w.writeheader()
        for s in scenarios:
            row = extract_features(s)
            for k, v in list(row.items()):
                if k in string_cols:
                    continue
                if isinstance(v, bool):
                    row[k] = float(int(v))
                elif isinstance(v, (int, float)):
                    row[k] = float(v)
            w.writerow(row)


ML_READY_COLUMNS = ["label"] + TRAINABLE_FEATURE_COLUMNS


def write_ml_csv(scenarios: list[dict[str, Any]], out_path: Path) -> None:
    """Write the ML-ready CSV: label + numeric features only.

    Strips `scenario_id` and `category` so AutoML can't accidentally featurize
    label-leaking columns. Row order matches `write_csv`, so predictions can
    be rejoined to scenario_id by index.
    """
    out_path.parent.mkdir(exist_ok=True, parents=True)
    with out_path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=ML_READY_COLUMNS)
        w.writeheader()
        for s in scenarios:
            row = extract_features(s)
            ml_row = {"label": row["label"]}
            for k in TRAINABLE_FEATURE_COLUMNS:
                v = row[k]
                if isinstance(v, bool):
                    ml_row[k] = float(int(v))
                else:
                    ml_row[k] = float(v)
            w.writerow(ml_row)


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract ML features from scenarios.")
    parser.add_argument("--print-schema", action="store_true", help="Print feature names and exit.")
    parser.add_argument("--out-dir", type=Path, default=config.EVAL_ROOT / "features")
    args = parser.parse_args()

    if args.print_schema:
        print("Trainable features:")
        for c in TRAINABLE_FEATURE_COLUMNS:
            print(f"  - {c}")
        print(f"\nLabel column: label (Normal / T1 / T2 / T3)")
        print(f"Traceability (drop before training): scenario_id, category")
        return 0

    train = _load_set(config.TRAIN_SCENARIO_FILES)
    evalset = _load_set(config.SCENARIO_FILES)

    train_path = args.out_dir / "features_train.csv"
    eval_path = args.out_dir / "features_eval.csv"
    write_csv(train, train_path)
    write_csv(evalset, eval_path)

    ml_train_path = args.out_dir / "mltable_train_ml" / "features_train_ml.csv"
    ml_eval_path = args.out_dir / "mltable_eval_ml" / "features_eval_ml.csv"
    write_ml_csv(train, ml_train_path)
    write_ml_csv(evalset, ml_eval_path)

    for mt_dir, csv_name in (
        (ml_train_path.parent, "features_train_ml.csv"),
        (ml_eval_path.parent, "features_eval_ml.csv"),
    ):
        (mt_dir / "MLTable").write_text(
            "$schema: https://azuremlschemas.azureedge.net/latest/MLTable.schema.json\n"
            "type: mltable\n\n"
            "paths:\n"
            f"  - file: ./{csv_name}\n\n"
            "transformations:\n"
            "  - read_delimited:\n"
            "      delimiter: ','\n"
            "      encoding: utf8\n"
            "      header: all_files_same_headers\n"
            "      empty_as_string: false\n"
        )

    print(f"Wrote {len(train)} rows -> {train_path}")
    print(f"Wrote {len(evalset)} rows -> {eval_path}")
    print(f"Wrote {len(train)} rows -> {ml_train_path} (ML-ready, no scenario_id/category)")
    print(f"Wrote {len(evalset)} rows -> {ml_eval_path} (ML-ready, no scenario_id/category)")
    print(f"Trainable feature count: {len(TRAINABLE_FEATURE_COLUMNS)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
