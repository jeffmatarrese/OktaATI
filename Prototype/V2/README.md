# ATI Prototype V2

Vite + React + TypeScript dashboard for Okta Identity Threat Protection — Agentic Threat Intelligence.

This is **V2**, the active prototype. `Prototype/V1/` holds the frozen original Lovable-generated version for reference.

- **Design spec:** `docs/superpowers/specs/2026-05-16-prototype-v2-design.md`
- **Implementation plan:** `docs/superpowers/plans/2026-05-16-prototype-v2.md`

## Run

```bash
bun install
bun run dev
```

## Test

```bash
bun run test
```

## Regenerating replay data

The Scenario Lab plays back saved classifier outputs. To rebuild:

```bash
python3 ../../Eval/src/build_replay_data.py
```
