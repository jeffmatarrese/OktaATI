"""Generate additional training scenarios via gpt-5.4 in parallel.

Used to scale the training set beyond the hand-authored 200. Each scenario is
generated in its own LLM call with 2-3 in-context examples from the existing
training set (NEVER eval). Outputs are validated against the `Scenario`
Pydantic schema and de-leaked against the eval set before being appended to
scenarios/train/*.json.

Usage:
    # Default: scale all categories to bring total to ~500
    python -m src.generate_scenarios

    # Generate a specific number per category
    python -m src.generate_scenarios --normal 30 --tier1 25 --tier2 20 --tier3 10 --adversarial 15

    # Dry-run pipeline without API calls
    python -m src.generate_scenarios --dry-run --normal 3 --tier1 2 --tier2 2 --tier3 1 --adversarial 2

    # Tighter concurrency if Azure rate-limits
    python -m src.generate_scenarios --concurrency 6
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from . import config
from .cross_check import _jaccard, _shingles, load_eval, load_train
from .llm_client import LLMClient
from .schema import Scenario


CATEGORIES = ["normal", "tier1", "tier2", "tier3", "adversarial"]

# Map category -> training file
CATEGORY_FILES: dict[str, Path] = {
    "normal": config.TRAIN_SCENARIOS_DIR / "normal.json",
    "tier1": config.TRAIN_SCENARIOS_DIR / "tier1_stall.json",
    "tier2": config.TRAIN_SCENARIOS_DIR / "tier2_scope_restriction.json",
    "tier3": config.TRAIN_SCENARIOS_DIR / "tier3_session_kill.json",
    "adversarial": config.TRAIN_SCENARIOS_DIR / "adversarial.json",
}

# Map category -> id prefix used in the existing train/eval sets
ID_PREFIX: dict[str, str] = {
    "normal": "N-T",
    "tier1": "T1-T",
    "tier2": "T2-T",
    "tier3": "T3-T",
    "adversarial": "ADV-T",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _next_ids(category: str, existing_ids: set[str], n: int) -> list[str]:
    """Allocate the next N unused sequential ids for a category."""
    prefix = ID_PREFIX[category]
    pat = re.compile(rf"^{re.escape(prefix)}-(\d+)$")
    used = {int(m.group(1)) for sid in existing_ids if (m := pat.match(sid))}
    out: list[str] = []
    candidate = 1
    while len(out) < n:
        if candidate not in used:
            out.append(f"{prefix}-{candidate:02d}")
            used.add(candidate)
        candidate += 1
    return out


def _pick_examples(
    train: list[dict[str, Any]], category: str, n: int = 2, rng: random.Random | None = None
) -> list[dict[str, Any]]:
    """Pick a few existing scenarios from the same category as in-context anchors."""
    rng = rng or random.Random()
    pool = [s for s in train if s.get("category") == category]
    if not pool:
        return []
    return rng.sample(pool, min(n, len(pool)))


def _build_user_prompt(
    target_id: str, category: str, examples: list[dict[str, Any]], forbidden_agent_ids: set[str]
) -> str:
    """Compose the per-call user message."""
    example_blob = "\n\n".join(
        f"# Example {i + 1} (id={e['id']}, category={e['category']}):\n"
        + json.dumps(e, indent=2)
        for i, e in enumerate(examples)
    )
    # Include a sample of forbidden agent_ids to help the LLM diversify
    forbid_sample = sorted(forbidden_agent_ids)[:30]
    forbid_text = (
        "\nDo NOT use any of these existing agent_ids: " + ", ".join(forbid_sample)
        if forbid_sample
        else ""
    )
    return (
        f"Generate one new training scenario.\n\n"
        f"Assigned id: {target_id}\n"
        f"Assigned category: {category}\n"
        f"{forbid_text}\n\n"
        f"Reference scenarios for style/structure (do NOT copy their agent_id or narrative):\n\n"
        f"{example_blob}\n\n"
        f"Output the new scenario JSON only."
    )


def _validate_and_check(
    raw: dict[str, Any],
    target_id: str,
    category: str,
    eval_agent_ids: set[str],
    eval_shingles: list[tuple[str, set[str]]],
    existing_agent_ids: set[str],
    narrative_threshold: float,
) -> tuple[Scenario | None, str | None]:
    """Validate + de-leak. Returns (Scenario, None) on success, (None, reason) on fail."""
    # Force the assigned id and category onto the output before validation —
    # the LLM occasionally rewrites these.
    raw["id"] = target_id
    raw["category"] = category

    try:
        scenario = Scenario.model_validate(raw)
    except ValidationError as e:
        return None, f"schema: {str(e).splitlines()[0]}"

    agent_id = scenario.agent_profile.get("agent_id", "")
    if not agent_id:
        return None, "missing agent_id"
    if agent_id in eval_agent_ids:
        return None, f"agent_id collides with eval set ({agent_id})"
    if agent_id in existing_agent_ids:
        return None, f"agent_id collides with existing train set ({agent_id})"

    shingles = _shingles(scenario.narrative)
    for eid, esh in eval_shingles:
        sim = _jaccard(shingles, esh)
        if sim >= narrative_threshold:
            return None, f"narrative too similar to eval {eid} (j={sim:.2f})"

    return scenario, None


def _generate_one(
    client: LLMClient,
    system_prompt: str,
    target_id: str,
    category: str,
    train_for_examples: list[dict[str, Any]],
    eval_agent_ids: set[str],
    eval_shingles: list[tuple[str, set[str]]],
    existing_agent_ids: set[str],
    narrative_threshold: float,
    max_retries: int,
    seed: int,
) -> tuple[str, dict[str, Any] | None, str | None]:
    """Generate one scenario with retries. Returns (target_id, scenario_dict | None, error | None)."""
    rng = random.Random(seed)
    last_err: str | None = None
    for attempt in range(1, max_retries + 1):
        examples = _pick_examples(train_for_examples, category, n=2, rng=rng)
        # On retries, include the forbidden agent_id list from the failed attempts too
        forbidden = set(existing_agent_ids) | eval_agent_ids
        user_prompt = _build_user_prompt(target_id, category, examples, forbidden)
        try:
            raw = client.generate(system_prompt, user_prompt)
        except Exception as exc:  # noqa: BLE001
            last_err = f"api: {exc}"
            time.sleep(min(2 ** attempt, 8))
            continue

        scenario, reason = _validate_and_check(
            raw,
            target_id,
            category,
            eval_agent_ids,
            eval_shingles,
            existing_agent_ids,
            narrative_threshold,
        )
        if scenario is not None:
            return target_id, scenario.model_dump(), None
        last_err = reason
        # On de-leak failure, retry with a different example pick
    return target_id, None, last_err


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--normal", type=int, default=90)
    parser.add_argument("--tier1", type=int, default=75)
    parser.add_argument("--tier2", type=int, default=60)
    parser.add_argument("--tier3", type=int, default=30)
    parser.add_argument("--adversarial", type=int, default=45)
    parser.add_argument(
        "--concurrency", type=int, default=10, help="Max parallel API calls"
    )
    parser.add_argument(
        "--max-retries", type=int, default=3, help="Retries per scenario on validation/leak failure"
    )
    parser.add_argument(
        "--narrative-threshold",
        type=float,
        default=0.45,
        help="Jaccard threshold for narrative-similarity de-leak vs eval set",
    )
    parser.add_argument("--dry-run", action="store_true", help="Stub LLM responses.")
    parser.add_argument(
        "--no-append",
        action="store_true",
        help="Skip writing to scenarios/train/*.json (preview only).",
    )
    args = parser.parse_args()

    targets = {
        "normal": args.normal,
        "tier1": args.tier1,
        "tier2": args.tier2,
        "tier3": args.tier3,
        "adversarial": args.adversarial,
    }
    total_target = sum(targets.values())
    print(f"Generation plan: {targets}  (total {total_target})")

    print("Loading existing scenarios...")
    train = load_train()
    evalset = load_eval()
    print(f"  train={len(train)}  eval={len(evalset)}")

    existing_ids = {s["id"] for s in train} | {s["id"] for s in evalset}
    existing_agent_ids = {s["agent_profile"]["agent_id"] for s in train}
    eval_agent_ids = {s["agent_profile"]["agent_id"] for s in evalset}
    eval_shingles = [(s["id"], _shingles(s.get("narrative", ""))) for s in evalset]

    # Build the per-scenario work list
    work: list[tuple[str, str]] = []
    for cat, n in targets.items():
        ids = _next_ids(cat, existing_ids, n)
        for sid in ids:
            work.append((sid, cat))
            existing_ids.add(sid)
    print(f"Allocated {len(work)} new ids.\n")

    system_prompt = (config.PROMPTS_DIR / "generator_system_prompt.md").read_text()
    client = LLMClient(dry_run=args.dry_run)

    # Track agent_ids generated in-flight so retries don't collide with each other
    inflight_agent_ids: set[str] = set()

    results: list[dict[str, Any]] = []
    errors: list[tuple[str, str]] = []

    mode = "DRY-RUN" if args.dry_run else "LIVE"
    print(f"Generating in {mode} mode (judge={config.JUDGE_DEPLOYMENT}, concurrency={args.concurrency})...\n")

    completed = 0
    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = {
            pool.submit(
                _generate_one,
                client,
                system_prompt,
                sid,
                cat,
                train,
                eval_agent_ids,
                eval_shingles,
                existing_agent_ids | inflight_agent_ids,
                args.narrative_threshold,
                args.max_retries,
                seed=hash((sid, cat)) & 0xFFFFFFFF,
            ): (sid, cat)
            for sid, cat in work
        }
        for fut in as_completed(futures):
            sid, cat = futures[fut]
            completed += 1
            try:
                _, scenario, err = fut.result()
            except Exception as exc:  # noqa: BLE001
                scenario, err = None, f"exec: {exc}"
            if scenario:
                # claim this agent_id for the in-memory cohort to keep retries unique
                inflight_agent_ids.add(scenario["agent_profile"]["agent_id"])
                results.append(scenario)
                tag = "OK"
            else:
                errors.append((sid, err or "unknown"))
                tag = f"FAIL ({err})"
            print(f"[{completed:>3}/{len(work)}] {sid} ({cat}) ... {tag}")

    print()
    print(f"Generated {len(results)} scenarios; {len(errors)} failed.")
    if errors:
        print("Failures:")
        for sid, err in errors[:20]:
            print(f"  - {sid}: {err}")
        if len(errors) > 20:
            print(f"  ... and {len(errors) - 20} more")

    # Group by category and append to train files
    by_cat: dict[str, list[dict[str, Any]]] = {c: [] for c in CATEGORIES}
    for s in results:
        by_cat[s["category"]].append(s)

    if args.no_append:
        preview_path = config.RESULTS_DIR / "generator_preview.json"
        preview_path.parent.mkdir(exist_ok=True)
        preview_path.write_text(json.dumps({"scenarios": results}, indent=2))
        print(f"\n--no-append: preview written to {preview_path}")
        return 0

    print("\nAppending to train files...")
    for cat, scenarios in by_cat.items():
        if not scenarios:
            continue
        path = CATEGORY_FILES[cat]
        data = json.loads(path.read_text())
        data["scenarios"].extend(scenarios)
        path.write_text(json.dumps(data, indent=2))
        print(f"  {path.name}: +{len(scenarios)}  ({len(data['scenarios'])} total)")

    print("\nDone. Next: re-run cross_check on the new scenarios to filter junk.")
    print("  python -m src.cross_check --only-ids " + ",".join(s["id"] for s in results[:5]) + ",...")
    return 0


if __name__ == "__main__":
    sys.exit(main())
