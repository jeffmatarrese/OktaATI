# Prototype V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `Prototype/V2/` into an Okta-styled ATI dashboard with an agent directory, an evidence-chain alert detail (no probabilities surfaced to operators), and a Scenario Lab drawer that replays real `bold_beard` ML + `gpt-5.4-nano` LLM classifier outputs to inject new alerts into the dashboard.

**Architecture:**
- Single Vite + React + TS + Tailwind + shadcn SPA in `Prototype/V2/`. V1 is frozen as the "before" artifact.
- Two Zustand stores: `alertsStore` (runtime alert list, supports append + flash) and `labStore` (drawer state, scenario send flow).
- A `ClassifierService` interface with a `ReplayClassifier` impl reading pre-built JSON from `src/data/replay/`. The JSONs are produced by a one-shot Python script `Eval/src/build_replay_data.py` from the existing `Eval/AzureML/bold_beard/predictions.csv`, `Eval/features/features_eval.csv`, and `Eval/results/eval_run_20260510_225418.json`. A future `LiveClassifier` swap is a one-line constructor change.

**Tech Stack:** Vite 5 · React 18 · TypeScript 5 · Tailwind 3 + shadcn/ui · React Router 6 · Zustand · Vitest + React Testing Library · Python 3 (for the one-shot replay-data build script).

**Spec:** `docs/superpowers/specs/2026-05-16-prototype-v2-design.md`

---

## Reference: shared types and naming

These are referenced across tasks — define them as written so later tasks compile.

**Tier type (used everywhere):**
```ts
export type Tier = 'Normal' | 'T1' | 'T2' | 'T3';
```

**Enforcement action (used in alerts + UI):**
```ts
export type Enforcement = 'Stall' | 'Restrict Scope' | 'Session Kill' | 'None';
```

**Classifier result discriminated union (used by `ClassifierService`):**
```ts
export interface NanoResult {
  model: 'nano';
  scenarioId: string;
  predicted: Tier;
  confidence: number;     // 0..1, the LLM's self-reported confidence on its picked class
  reasoning: string;
}
export interface MLResult {
  model: 'bold_beard';
  scenarioId: string;
  predicted: Tier;
  probs: Record<Tier, number>;  // sums to ~1
}
export type ClassifierResult = NanoResult | MLResult;
```

**Display labels (single source of truth, defined in `src/lib/tiers.ts`):**
| Tier | Label | Color token | Enforcement |
|---|---|---|---|
| `Normal` | "Normal" | slate-500 | `None` |
| `T1` | "Tier 1 · Stall" | amber-500 | `Stall` |
| `T2` | "Tier 2 · Restrict Scope" | orange-500 | `Restrict Scope` |
| `T3` | "Tier 3 · Session Kill" | red-600 (Okta `#D93934`) | `Session Kill` |

**Model display names (single source of truth, defined in `src/lib/tiers.ts`):**
- `nano` → `{ name: 'LLM Classifier', subtitle: 'gpt-5.4-nano (Phase 1)' }`
- `bold_beard` → `{ name: 'Identity Threat Model', subtitle: 'bold_beard ML (Phase 2)' }`

---

## Phase A — Foundations

### Task 1: Install zustand and verify V2 boots from the V1 clone

**Files:**
- Modify: `Prototype/V2/package.json`
- Modify: `Prototype/V2/src/test/example.test.ts` (delete it at the end of this task)

- [ ] **Step 1: Install zustand**

```bash
cd Prototype/V2
bun add zustand@^4.5.0
```

Expected: `package.json` gains `"zustand": "^4.5.0"` under `dependencies`.

- [ ] **Step 2: Verify dev server starts**

```bash
cd Prototype/V2
bun run dev
```

Expected: Vite prints `Local: http://localhost:8080/` (or similar) with no errors. Stop with Ctrl+C.

- [ ] **Step 3: Verify Vitest runs**

```bash
cd Prototype/V2
bun run test
```

Expected: 1 passing test from `src/test/example.test.ts`.

- [ ] **Step 4: Delete the example test**

```bash
rm Prototype/V2/src/test/example.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add Prototype/V2/package.json Prototype/V2/bun.lockb Prototype/V2/src/test/example.test.ts
git commit -m "V2: install zustand, drop placeholder test"
```

---

### Task 2: Apply Okta color tokens to `index.css`

**Files:**
- Modify: `Prototype/V2/src/index.css`

shadcn writes CSS variables in HSL space (no `hsl()` wrapper, just the numbers). Convert the spec colors:

- Okta blue `#007DC1` → `hsl(202, 100%, 38%)` → `202 100% 38%`
- Okta red `#D93934` → `hsl(1, 70%, 53%)` → `1 70% 53%`
- Okta dark rail `#1B1B1B` → `hsl(0, 0%, 11%)` → `0 0% 11%`

- [ ] **Step 1: Read current `:root` block**

```bash
sed -n '1,80p' Prototype/V2/src/index.css
```

Note the current `--background`, `--foreground`, `--primary`, `--sidebar-*`, `--destructive` lines so you replace them in place.

- [ ] **Step 2: Replace the light-theme tokens with Okta tokens**

In `Prototype/V2/src/index.css`, inside the `:root { ... }` block, replace the existing values for these tokens with:

```css
    --background: 0 0% 100%;
    --foreground: 0 0% 13%;

    --card: 0 0% 100%;
    --card-foreground: 0 0% 13%;

    --primary: 202 100% 38%;             /* Okta blue #007DC1 */
    --primary-foreground: 0 0% 100%;

    --secondary: 0 0% 96%;
    --secondary-foreground: 0 0% 13%;

    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 35%;

    --accent: 202 100% 38%;
    --accent-foreground: 0 0% 100%;

    --destructive: 1 70% 53%;            /* Okta red #D93934 */
    --destructive-foreground: 0 0% 100%;

    --border: 0 0% 90%;
    --input: 0 0% 90%;
    --ring: 202 100% 38%;

    --sidebar-background: 0 0% 11%;      /* Okta dark rail #1B1B1B */
    --sidebar-foreground: 0 0% 85%;
    --sidebar-primary: 202 100% 38%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 0 0% 16%;
    --sidebar-accent-foreground: 0 0% 100%;
    --sidebar-border: 0 0% 20%;
    --sidebar-ring: 202 100% 38%;
```

Leave the rest of `index.css` (the `.dark` block, `@layer base`) untouched.

- [ ] **Step 3: Boot the dev server and eyeball it**

```bash
cd Prototype/V2 && bun run dev
```

Open the printed URL. The sidebar should be dark (#1B1B1B), primary CTAs should be Okta blue. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add Prototype/V2/src/index.css
git commit -m "V2: apply Okta color tokens (dark rail, Okta blue, Okta red)"
```

---

## Phase B — Replay data + classifier service

### Task 3: Curate the 5 lab scenarios

**Files:**
- Create: `Prototype/V2/src/data/scenarios.ts`

The lab picker offers 5 curated scenarios from `Eval/scenarios/eval/`. Pick concrete IDs by reading the scenarios. The id field on each scenario is `id` (e.g. `N-04`, `T1-03`, `T2-02`, `T3-01`, `A-05`).

- [ ] **Step 1: List scenario IDs and pick five**

```bash
python3 -c "
import json
for f in ['normal','tier1_stall','tier2_scope_restriction','tier3_session_kill','adversarial']:
    arr = json.load(open(f'Eval/scenarios/eval/{f}.json'))['scenarios']
    for s in arr:
        gt = s['ground_truth']
        print(f, s['id'], gt['classification'], gt.get('tier'), '-', s['narrative'][:80])
"
```

Pick one scenario id per file. Goal: each has a clear, demoable narrative. If unsure, default to the first id in each file (`N-01`, `T1-01`, `T2-01`, `T3-01`, `A-01`).

- [ ] **Step 2: Write `src/data/scenarios.ts`**

Create `Prototype/V2/src/data/scenarios.ts`. Use the five ids you picked. Replace `<id-…>` and `<one-line narrative…>` with the actual values; copy the `narrative` field verbatim if it's short, otherwise paraphrase to one sentence.

```ts
import type { Tier } from '@/lib/tiers';

export interface LabScenario {
  id: string;                  // matches scenario id in Eval/scenarios/eval/
  difficulty: 'Benign' | 'Easy' | 'Medium' | 'Hard' | 'Adversarial';
  title: string;
  description: string;         // one line, shown on the picker card
  groundTruthTier: Tier;       // for the ✅/❌ check against classifier outputs
  groundTruthRationale: string; // copied from scenario.ground_truth.answer_rationale
}

export const labScenarios: LabScenario[] = [
  {
    id: '<id-from-normal.json>',
    difficulty: 'Benign',
    title: 'Noisy but normal',
    description: '<one-line narrative from the scenario>',
    groundTruthTier: 'Normal',
    groundTruthRationale: '<answer_rationale from the scenario>',
  },
  {
    id: '<id-from-tier1_stall.json>',
    difficulty: 'Medium',
    title: 'Subtle scope drift',
    description: '<one-line narrative>',
    groundTruthTier: 'T1',
    groundTruthRationale: '<answer_rationale>',
  },
  {
    id: '<id-from-tier2_scope_restriction.json>',
    difficulty: 'Hard',
    title: 'Slow-burn lateral movement',
    description: '<one-line narrative>',
    groundTruthTier: 'T2',
    groundTruthRationale: '<answer_rationale>',
  },
  {
    id: '<id-from-tier3_session_kill.json>',
    difficulty: 'Easy',
    title: 'Obvious data exfiltration',
    description: '<one-line narrative>',
    groundTruthTier: 'T3',
    groundTruthRationale: '<answer_rationale>',
  },
  {
    id: '<id-from-adversarial.json>',
    difficulty: 'Adversarial',
    title: 'Prompt-injection attempt',
    description: '<one-line narrative>',
    groundTruthTier: 'T3',  // or whatever the file's ground truth says
    groundTruthRationale: '<answer_rationale>',
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add Prototype/V2/src/data/scenarios.ts
git commit -m "V2: curate 5 lab scenarios"
```

---

### Task 4: Build the replay-data Python script

**Files:**
- Create: `Eval/src/build_replay_data.py`
- Create: `Prototype/V2/src/data/replay/predictions_bold_beard.json` (generated)
- Create: `Prototype/V2/src/data/replay/predictions_gpt54nano.json` (generated)

Pulls predictions from `Eval/AzureML/bold_beard/predictions.csv` (joined to scenario IDs by row order against `Eval/features/features_eval.csv`) and from `Eval/results/eval_run_20260510_225418.json` (already keyed by `scenario_id`). Writes both to `Prototype/V2/src/data/replay/`.

- [ ] **Step 1: Create the script**

Create `Eval/src/build_replay_data.py`:

```python
"""Build replay-data JSONs for the V2 Prototype Scenario Lab.

Reads:
  - Eval/features/features_eval.csv          (for the canonical scenario_id ordering)
  - Eval/AzureML/bold_beard/predictions.csv  (per-row ML predictions; no scenario_id)
  - Eval/results/eval_run_20260510_225418.json (nano LLM eval; already keyed by scenario_id)

Writes:
  - Prototype/V2/src/data/replay/predictions_bold_beard.json
  - Prototype/V2/src/data/replay/predictions_gpt54nano.json

Run from repo root:
  python -m src.build_replay_data         # (from Eval/)
or
  python Eval/src/build_replay_data.py
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FEATURES_EVAL = REPO_ROOT / "Eval" / "features" / "features_eval.csv"
BB_PREDICTIONS = REPO_ROOT / "Eval" / "AzureML" / "bold_beard" / "predictions.csv"
NANO_RESULTS = REPO_ROOT / "Eval" / "results" / "eval_run_20260510_225418.json"
OUT_DIR = REPO_ROOT / "Prototype" / "V2" / "src" / "data" / "replay"

TIERS = ("Normal", "T1", "T2", "T3")


def map_nano_tier(classification: str, tier: int | None) -> str:
    """Map nano output (classification + tier) to our 4-bucket Tier."""
    if classification == "Normal":
        return "Normal"
    if tier in (1, 2, 3):
        return f"T{tier}"
    raise ValueError(f"unexpected nano output: {classification!r} tier={tier!r}")


def build_bold_beard() -> list[dict]:
    """Join predictions.csv to scenario IDs by row order against features_eval.csv."""
    with FEATURES_EVAL.open() as f:
        scenario_ids = [row["scenario_id"] for row in csv.DictReader(f)]
    with BB_PREDICTIONS.open() as f:
        rows = list(csv.DictReader(f))
    assert len(scenario_ids) == len(rows), (
        f"row count mismatch: features_eval={len(scenario_ids)} predictions={len(rows)}"
    )
    out = []
    for sid, row in zip(scenario_ids, rows):
        probs = {t: float(row[f"{t}_predicted_proba"]) for t in TIERS}
        out.append({
            "scenarioId": sid,
            "predicted": row["label_predicted"],
            "probs": probs,
        })
    return out


def build_nano() -> list[dict]:
    data = json.loads(NANO_RESULTS.read_text())
    out = []
    for s in data["scenarios"]:
        c = s["classifier"]
        out.append({
            "scenarioId": s["scenario_id"],
            "predicted": map_nano_tier(c["classification"], c.get("tier")),
            "confidence": float(c["confidence"]),
            "reasoning": c["reasoning"],
        })
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    bb = build_bold_beard()
    nano = build_nano()
    (OUT_DIR / "predictions_bold_beard.json").write_text(
        json.dumps(bb, indent=2) + "\n"
    )
    (OUT_DIR / "predictions_gpt54nano.json").write_text(
        json.dumps(nano, indent=2) + "\n"
    )
    print(f"Wrote {len(bb)} bold_beard rows and {len(nano)} nano rows to {OUT_DIR}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the script**

```bash
python3 Eval/src/build_replay_data.py
```

Expected: prints `Wrote 50 bold_beard rows and 50 nano rows to …/Prototype/V2/src/data/replay`.

- [ ] **Step 3: Spot-check the outputs**

```bash
python3 -c "
import json
bb = json.load(open('Prototype/V2/src/data/replay/predictions_bold_beard.json'))
nano = json.load(open('Prototype/V2/src/data/replay/predictions_gpt54nano.json'))
print('bb sample:', bb[0])
print('nano sample:', nano[0])
print('scenario id sets match:', {x['scenarioId'] for x in bb} == {x['scenarioId'] for x in nano})
"
```

Expected: both samples print, and `scenario id sets match: True`.

- [ ] **Step 4: Verify every lab scenario id has both predictions**

```bash
python3 -c "
import json, re
labs = open('Prototype/V2/src/data/scenarios.ts').read()
ids = re.findall(r\"id:\\s*'([^']+)'\", labs)
bb = {x['scenarioId'] for x in json.load(open('Prototype/V2/src/data/replay/predictions_bold_beard.json'))}
nano = {x['scenarioId'] for x in json.load(open('Prototype/V2/src/data/replay/predictions_gpt54nano.json'))}
missing = [i for i in ids if i not in bb or i not in nano]
print('lab ids:', ids)
print('missing:', missing or 'none')
"
```

Expected: `missing: none`. If any are missing, the lab id is wrong — go back to Task 3 and fix it.

- [ ] **Step 5: Commit**

```bash
git add Eval/src/build_replay_data.py Prototype/V2/src/data/replay/
git commit -m "V2: build replay-data script and generated JSON for lab"
```

---

### Task 5: ClassifierService interface + ReplayClassifier

**Files:**
- Create: `Prototype/V2/src/lib/tiers.ts` (types only — full helpers added in Task 6)
- Create: `Prototype/V2/src/services/classifier.ts`
- Create: `Prototype/V2/src/services/classifier.test.ts`

- [ ] **Step 1: Create the shared `Tier` type**

Create `Prototype/V2/src/lib/tiers.ts`:

```ts
export type Tier = 'Normal' | 'T1' | 'T2' | 'T3';
export const TIERS: readonly Tier[] = ['Normal', 'T1', 'T2', 'T3'] as const;
```

(Task 6 extends this file with label/color helpers.)

- [ ] **Step 2: Write the failing test**

Create `Prototype/V2/src/services/classifier.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ReplayClassifier } from './classifier';

describe('ReplayClassifier', () => {
  const svc = new ReplayClassifier();

  it('returns a bold_beard MLResult with 4-class probs that sum ~1', async () => {
    const r = await svc.classify('N-01', 'bold_beard');
    expect(r.model).toBe('bold_beard');
    expect(r.scenarioId).toBe('N-01');
    if (r.model !== 'bold_beard') throw new Error('discriminator broken');
    const sum = r.probs.Normal + r.probs.T1 + r.probs.T2 + r.probs.T3;
    expect(sum).toBeGreaterThan(0.98);
    expect(sum).toBeLessThan(1.02);
    expect(['Normal', 'T1', 'T2', 'T3']).toContain(r.predicted);
  });

  it('returns a nano NanoResult with confidence in [0,1] and reasoning text', async () => {
    const r = await svc.classify('N-01', 'nano');
    expect(r.model).toBe('nano');
    if (r.model !== 'nano') throw new Error('discriminator broken');
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(r.reasoning.length).toBeGreaterThan(10);
    expect(['Normal', 'T1', 'T2', 'T3']).toContain(r.predicted);
  });

  it('throws a clear error for an unknown scenario id', async () => {
    await expect(svc.classify('DOES-NOT-EXIST', 'bold_beard')).rejects.toThrow(/unknown scenario/i);
  });
});
```

- [ ] **Step 3: Run the test — expect failure**

```bash
cd Prototype/V2 && bun run test src/services/classifier.test.ts
```

Expected: FAIL — `Cannot find module './classifier'`.

- [ ] **Step 4: Implement the service**

Create `Prototype/V2/src/services/classifier.ts`:

```ts
import type { Tier } from '@/lib/tiers';
import bbData from '@/data/replay/predictions_bold_beard.json';
import nanoData from '@/data/replay/predictions_gpt54nano.json';

export interface NanoResult {
  model: 'nano';
  scenarioId: string;
  predicted: Tier;
  confidence: number;
  reasoning: string;
}

export interface MLResult {
  model: 'bold_beard';
  scenarioId: string;
  predicted: Tier;
  probs: Record<Tier, number>;
}

export type ClassifierResult = NanoResult | MLResult;

export type ModelName = 'nano' | 'bold_beard';

export interface ClassifierService {
  classify(scenarioId: string, model: ModelName): Promise<ClassifierResult>;
}

interface BBRow { scenarioId: string; predicted: Tier; probs: Record<Tier, number>; }
interface NanoRow { scenarioId: string; predicted: Tier; confidence: number; reasoning: string; }

const bbIndex: Map<string, BBRow> = new Map(
  (bbData as BBRow[]).map((r) => [r.scenarioId, r]),
);
const nanoIndex: Map<string, NanoRow> = new Map(
  (nanoData as NanoRow[]).map((r) => [r.scenarioId, r]),
);

export class ReplayClassifier implements ClassifierService {
  async classify(scenarioId: string, model: ModelName): Promise<ClassifierResult> {
    if (model === 'bold_beard') {
      const row = bbIndex.get(scenarioId);
      if (!row) throw new Error(`unknown scenario for bold_beard: ${scenarioId}`);
      return { model: 'bold_beard', ...row };
    }
    const row = nanoIndex.get(scenarioId);
    if (!row) throw new Error(`unknown scenario for nano: ${scenarioId}`);
    return { model: 'nano', ...row };
  }
}

export const classifier: ClassifierService = new ReplayClassifier();
```

- [ ] **Step 5: Run the tests — expect pass**

```bash
cd Prototype/V2 && bun run test src/services/classifier.test.ts
```

Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add Prototype/V2/src/lib/tiers.ts Prototype/V2/src/services/classifier.ts Prototype/V2/src/services/classifier.test.ts
git commit -m "V2: add ClassifierService interface + ReplayClassifier"
```

---

## Phase C — Tier helpers, schema, seed data

### Task 6: Tier label/color helpers in `src/lib/tiers.ts`

**Files:**
- Modify: `Prototype/V2/src/lib/tiers.ts`
- Create: `Prototype/V2/src/lib/tiers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `Prototype/V2/src/lib/tiers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tierLabel, tierColorClass, enforcementForTier, modelDisplay } from './tiers';

describe('tier helpers', () => {
  it('returns human labels', () => {
    expect(tierLabel('Normal')).toBe('Normal');
    expect(tierLabel('T1')).toBe('Tier 1 · Stall');
    expect(tierLabel('T2')).toBe('Tier 2 · Restrict Scope');
    expect(tierLabel('T3')).toBe('Tier 3 · Session Kill');
  });

  it('returns a tailwind text/bg color class per tier', () => {
    expect(tierColorClass('T1')).toContain('amber');
    expect(tierColorClass('T2')).toContain('orange');
    expect(tierColorClass('T3')).toContain('red');
    expect(tierColorClass('Normal')).toContain('slate');
  });

  it('maps tier to enforcement label', () => {
    expect(enforcementForTier('Normal')).toBe('None');
    expect(enforcementForTier('T1')).toBe('Stall');
    expect(enforcementForTier('T2')).toBe('Restrict Scope');
    expect(enforcementForTier('T3')).toBe('Session Kill');
  });

  it('returns display strings for models', () => {
    expect(modelDisplay('nano').name).toBe('LLM Classifier');
    expect(modelDisplay('nano').subtitle).toContain('gpt-5.4-nano');
    expect(modelDisplay('bold_beard').name).toBe('Identity Threat Model');
    expect(modelDisplay('bold_beard').subtitle).toContain('bold_beard');
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

```bash
cd Prototype/V2 && bun run test src/lib/tiers.test.ts
```

Expected: FAIL — exports don't exist.

- [ ] **Step 3: Implement the helpers**

Replace `Prototype/V2/src/lib/tiers.ts` entirely with:

```ts
export type Tier = 'Normal' | 'T1' | 'T2' | 'T3';
export const TIERS: readonly Tier[] = ['Normal', 'T1', 'T2', 'T3'] as const;

export type Enforcement = 'None' | 'Stall' | 'Restrict Scope' | 'Session Kill';

const LABELS: Record<Tier, string> = {
  Normal: 'Normal',
  T1: 'Tier 1 · Stall',
  T2: 'Tier 2 · Restrict Scope',
  T3: 'Tier 3 · Session Kill',
};

const COLORS: Record<Tier, string> = {
  Normal: 'bg-slate-100 text-slate-700 border-slate-300',
  T1: 'bg-amber-50 text-amber-800 border-amber-300',
  T2: 'bg-orange-50 text-orange-800 border-orange-300',
  T3: 'bg-red-50 text-red-800 border-red-300',
};

const ENFORCEMENT: Record<Tier, Enforcement> = {
  Normal: 'None',
  T1: 'Stall',
  T2: 'Restrict Scope',
  T3: 'Session Kill',
};

export function tierLabel(t: Tier): string { return LABELS[t]; }
export function tierColorClass(t: Tier): string { return COLORS[t]; }
export function enforcementForTier(t: Tier): Enforcement { return ENFORCEMENT[t]; }

export type ModelName = 'nano' | 'bold_beard';

export function modelDisplay(m: ModelName): { name: string; subtitle: string } {
  if (m === 'nano') {
    return { name: 'LLM Classifier', subtitle: 'gpt-5.4-nano (Phase 1)' };
  }
  return { name: 'Identity Threat Model', subtitle: 'bold_beard ML (Phase 2)' };
}
```

- [ ] **Step 4: Run the test — expect pass**

```bash
cd Prototype/V2 && bun run test src/lib/tiers.test.ts
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add Prototype/V2/src/lib/tiers.ts Prototype/V2/src/lib/tiers.test.ts
git commit -m "V2: tier/enforcement/model display helpers"
```

---

### Task 7: Rewrite `src/data/alerts.ts` with V2 schema + seed 5 alerts

**Files:**
- Modify: `Prototype/V2/src/data/alerts.ts` (full rewrite — V1 shape is replaced, not extended)

V1's alerts type is the wrong shape; we replace it. The new shape covers everything the V2 detail pane renders.

- [ ] **Step 1: Replace the file**

Overwrite `Prototype/V2/src/data/alerts.ts` with:

```ts
import type { Tier, Enforcement } from '@/lib/tiers';

export type CloudProvider = 'AWS' | 'GCP' | 'Azure';

export interface EvidenceStep {
  /** one-sentence policy-violation statement */
  statement: string;
  /** the exact signal */
  signal: string;
  /** zero-trust policy URI */
  policy: string;
  /** the source event id this evidence draws from */
  eventId: string;
}

export interface TimelineEvent {
  ts: string;            // ISO timestamp
  event: string;         // event type
  detail: string;        // one-line payload summary
  app?: string;
}

export interface CrossAppEvent {
  app: string;
  cloud?: CloudProvider;
  event: string;
  detail: string;
  ts: string;
}

export interface IdentityCard {
  serviceAccount: string;
  tokenIssuer: string;
  idp: string;
  lastMfa: string;        // ISO or "n/a"
  authMethod: string;     // e.g. "OAuth client credentials"
}

export interface ChangeManagement {
  status: 'approved' | 'none';
  ticket?: string;        // when status === 'approved'
}

export interface Alert {
  id: string;
  agentId: string;        // matches agents.ts
  agentName: string;
  agentType: string;      // "LLM Agent", "RPA Bot", "Copilot", ...
  tier: Exclude<Tier, 'Normal'>;   // alerts only exist for non-Normal
  enforcement: Enforcement;
  title: string;
  summary: string;        // one-line for the list card
  detectedAt: string;     // ISO
  mttc: string;           // human-readable e.g. "1m 42s"

  // list-card surface area
  appsTouched: string[];          // small stack of app names
  cloudPresence: CloudProvider[]; // chips on list card + cross-app section
  changeManagement: ChangeManagement;

  // detail-pane surface area
  evidenceChain: EvidenceStep[];
  timeline: TimelineEvent[];      // the 10-minute preceding events
  crossAppContext: CrossAppEvent[];
  identity: IdentityCard;
  recommendationRationale: string;
  modelRunId: string;             // displayed in audit footer
  flash?: boolean;                // UI-only: set when freshly injected from the lab
}

const now = Date.now();
const ago = (m: number) => new Date(now - m * 60_000).toISOString();

export const seedAlerts: Alert[] = [
  {
    id: 'ATI-2027-0042',
    agentId: 'agent-sfdc-sync',
    agentName: 'Salesforce Data Sync Agent',
    agentType: 'Integration Agent',
    tier: 'T3',
    enforcement: 'Session Kill',
    title: 'Mass export of CRM records to unverified endpoint',
    summary: 'Bulk export of 42,318 contacts → external host registered 6 days ago.',
    detectedAt: ago(2),
    mttc: '1m 42s',
    appsTouched: ['Salesforce', 'AWS S3'],
    cloudPresence: ['AWS'],
    changeManagement: { status: 'none' },
    evidenceChain: [
      {
        statement: 'Bulk export volume is 38× the agent baseline.',
        signal: 'Exported 42,318 Contact records (30-day baseline: ~1,100).',
        policy: 'policy://ati/data-egress-volume/v2',
        eventId: 'evt-9c01',
      },
      {
        statement: 'Destination domain is not in the approved data-egress allow-list.',
        signal: 'POST to api.unverified-host.io — domain registered 6 days ago.',
        policy: 'policy://ati/egress-allowlist/v3',
        eventId: 'evt-9c02',
      },
      {
        statement: 'No active change-management record covers this export.',
        signal: 'CR search for agent-sfdc-sync in the last 24h returned 0 records.',
        policy: 'policy://ati/change-correlation/v1',
        eventId: 'evt-9c03',
      },
    ],
    timeline: [
      { ts: ago(11), event: 'auth.session.start',  detail: 'svc-sfdc-sync from 10.42.4.18',    app: 'Okta' },
      { ts: ago(9),  event: 'oauth.token.refresh', detail: 'scope=salesforce.read.bulk',       app: 'Salesforce' },
      { ts: ago(6),  event: 'sql.query',           detail: 'SELECT Id, Email, Phone FROM Contact', app: 'Salesforce' },
      { ts: ago(3),  event: 'data.export.bulk',    detail: '42,318 Contact records',           app: 'Salesforce' },
      { ts: ago(2),  event: 'http.post',           detail: 'api.unverified-host.io/ingest',    app: 'egress' },
    ],
    crossAppContext: [
      { app: 'AWS S3', cloud: 'AWS', event: 's3.bucket.list', detail: 'No matching staging bucket — direct external POST', ts: ago(2) },
    ],
    identity: {
      serviceAccount: 'svc-sfdc-sync@acme.okta.com',
      tokenIssuer: 'Okta',
      idp: 'Okta Workforce',
      lastMfa: 'n/a (workload identity)',
      authMethod: 'OAuth client credentials',
    },
    recommendationRationale:
      'High-volume exfiltration to an unverified destination with no change-record correlation meets the threshold for immediate session containment.',
    modelRunId: 'bold_beard-2026-05-15-run-37',
  },
  // --- 4 more seed alerts ---
  // Use the same shape. Vary tier across T1/T2/T3, vary cloudPresence across
  // ['AWS'], ['GCP'], ['Azure'], ['AWS','GCP'] so the multi-cloud proof shows
  // up across the list. At least one alert should have
  // changeManagement.status === 'approved' (e.g. an off-hours scan that IS in
  // a change window) so the green chip appears too.
  //
  // Suggested set:
  // 1. ATI-2027-0041 — T2 Restrict Scope, GCP, scope drift to 3 apps in 2 min
  // 2. ATI-2027-0040 — T2 Restrict Scope, Azure, off-hours GL access
  // 3. ATI-2027-0039 — T1 Stall, GCP + AWS, 14× API spike (changeManagement: approved CHG-7781)
  // 4. ATI-2027-0038 — T2 Restrict Scope, Azure, Drive folder traversal
];
```

- [ ] **Step 2: Fill in the remaining 4 seed alerts**

Use the suggestion comment block as the contract. Each alert needs the full shape above — at least 2 evidence steps, at least 3 timeline events, at least 1 cross-app event, an identity card, a rationale, a runId. Be specific (real-sounding service-account names, app names, timestamps via `ago(...)`).

- [ ] **Step 3: Verify it compiles**

```bash
cd Prototype/V2 && bunx tsc --noEmit
```

Expected: no errors. (You'll see errors from V1 files that still import the old `Alert` shape — leave those for now; Tasks 19/21/22 rewrite the consumers.)

If `tsc` complains about V1's `AlertCard.tsx` / `AlertDetail.tsx` / `pages/Index.tsx`, that's expected. They get rewritten/deleted in Phase F+H. To unblock typecheck for this task only, you may temporarily replace those three files' bodies with `export default function Stub() { return null; }` — Tasks 13, 19, 21, 22 will fully rewrite them.

- [ ] **Step 4: Commit**

```bash
git add Prototype/V2/src/data/alerts.ts \
        Prototype/V2/src/components/AlertCard.tsx \
        Prototype/V2/src/components/AlertDetail.tsx \
        Prototype/V2/src/pages/Index.tsx
git commit -m "V2: replace Alert schema with V2 shape + 5 seed alerts"
```

---

### Task 8: Create `src/data/agents.ts` with ≥6 agents (≥1 shadow)

**Files:**
- Create: `Prototype/V2/src/data/agents.ts`

- [ ] **Step 1: Write the file**

Create `Prototype/V2/src/data/agents.ts`:

```ts
export type AgentStatus = 'registered' | 'shadow';
export type RiskLabel = 'Low' | 'Medium' | 'High';
export type AgentType = 'LLM Agent' | 'Copilot' | 'RPA Bot' | 'Integration Agent' | 'CI/CD Agent' | 'Autonomous Agent';

export interface AgentBaseline {
  typicalScopes: string[];
  typicalApps: string[];
  typicalGeos: string[];
  typicalHoursUtc: string;       // e.g. "13:00 – 22:00"
}

export interface Agent {
  id: string;
  name: string;
  identity: string;              // service account / OAuth client
  type: AgentType;
  ownerTeam: string;
  status: AgentStatus;
  risk: RiskLabel;
  lastSeen: string;              // ISO
  openAlertCount: number;
  baseline: AgentBaseline;
}

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const hoursAgo = (h: number) => minsAgo(h * 60);

export const seedAgents: Agent[] = [
  {
    id: 'agent-sfdc-sync',
    name: 'Salesforce Data Sync Agent',
    identity: 'svc-sfdc-sync@acme.okta.com',
    type: 'Integration Agent',
    ownerTeam: 'Revenue Ops',
    status: 'registered',
    risk: 'High',
    lastSeen: minsAgo(2),
    openAlertCount: 1,
    baseline: {
      typicalScopes: ['salesforce.read', 'salesforce.read.bulk'],
      typicalApps: ['Salesforce', 'AWS S3'],
      typicalGeos: ['US-West'],
      typicalHoursUtc: '13:00 – 22:00',
    },
  },
  {
    id: 'agent-slack-triage',
    name: 'Slack Triage Bot',
    identity: 'svc-slack-triage@acme.okta.com',
    type: 'Copilot',
    ownerTeam: 'IT Support',
    status: 'registered',
    risk: 'Medium',
    lastSeen: minsAgo(7),
    openAlertCount: 1,
    baseline: {
      typicalScopes: ['slack.channels.read', 'slack.messages.write'],
      typicalApps: ['Slack', 'Zendesk'],
      typicalGeos: ['US-West', 'EU-West'],
      typicalHoursUtc: '00:00 – 23:59',
    },
  },
  {
    id: 'agent-fin-recon',
    name: 'Finance Reconciliation Agent',
    identity: 'svc-finance-recon@acme.okta.com',
    type: 'Autonomous Agent',
    ownerTeam: 'Finance Eng',
    status: 'registered',
    risk: 'Medium',
    lastSeen: minsAgo(14),
    openAlertCount: 1,
    baseline: {
      typicalScopes: ['snowflake.warehouse.read', 'netsuite.gl.read'],
      typicalApps: ['Snowflake', 'NetSuite'],
      typicalGeos: ['US-East'],
      typicalHoursUtc: '09:00 – 18:00',
    },
  },
  {
    id: 'agent-devops-build',
    name: 'DevOps Build Agent',
    identity: 'oauth-client-devops-build',
    type: 'CI/CD Agent',
    ownerTeam: 'Platform',
    status: 'registered',
    risk: 'High',
    lastSeen: hoursAgo(1),
    openAlertCount: 0,
    baseline: {
      typicalScopes: ['aws.staging.poweruser', 'github.repo.read'],
      typicalApps: ['AWS', 'GitHub'],
      typicalGeos: ['US-West'],
      typicalHoursUtc: '00:00 – 23:59',
    },
  },
  {
    id: 'agent-unknown-llm-1',
    name: 'unregistered-langchain-runner',
    identity: 'svc-unknown-a4f1@acme.okta.com',
    type: 'LLM Agent',
    ownerTeam: '(unknown)',
    status: 'shadow',
    risk: 'High',
    lastSeen: minsAgo(22),
    openAlertCount: 0,
    baseline: {
      typicalScopes: ['openai.embeddings', 'gdrive.read'],
      typicalApps: ['Google Drive', 'OpenAI'],
      typicalGeos: ['US-East'],
      typicalHoursUtc: '14:00 – 19:00',
    },
  },
  {
    id: 'agent-rpa-onboard',
    name: 'HR Onboarding Agent',
    identity: 'svc-hr-onboard@acme.okta.com',
    type: 'RPA Bot',
    ownerTeam: 'People Ops',
    status: 'registered',
    risk: 'Low',
    lastSeen: hoursAgo(3),
    openAlertCount: 0,
    baseline: {
      typicalScopes: ['scim.user.create', 'okta.groups.write'],
      typicalApps: ['Okta', 'Google Workspace', 'Slack'],
      typicalGeos: ['US-East'],
      typicalHoursUtc: 'Tue/Thu change windows',
    },
  },
];
```

- [ ] **Step 2: Typecheck**

```bash
cd Prototype/V2 && bunx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add Prototype/V2/src/data/agents.ts
git commit -m "V2: seed agent directory (6 agents, 1 shadow AI)"
```

---

## Phase D — Zustand stores

### Task 9: `alertsStore` with append + flash + tests

**Files:**
- Create: `Prototype/V2/src/store/alertsStore.ts`
- Create: `Prototype/V2/src/store/alertsStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `Prototype/V2/src/store/alertsStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAlertsStore } from './alertsStore';
import type { Alert } from '@/data/alerts';

const mockAlert = (id: string): Alert => ({
  id, agentId: 'a', agentName: 'A', agentType: 'LLM Agent',
  tier: 'T3', enforcement: 'Session Kill',
  title: 't', summary: 's', detectedAt: new Date().toISOString(), mttc: '1s',
  appsTouched: [], cloudPresence: [], changeManagement: { status: 'none' },
  evidenceChain: [], timeline: [], crossAppContext: [],
  identity: { serviceAccount: '', tokenIssuer: '', idp: '', lastMfa: '', authMethod: '' },
  recommendationRationale: '', modelRunId: 'r',
});

describe('alertsStore', () => {
  beforeEach(() => { useAlertsStore.setState(useAlertsStore.getState().reset()); });

  it('seeds with the bundled seed alerts', () => {
    const alerts = useAlertsStore.getState().alerts;
    expect(alerts.length).toBeGreaterThanOrEqual(5);
  });

  it('appends new alerts to the FRONT with flash=true', () => {
    const before = useAlertsStore.getState().alerts.length;
    useAlertsStore.getState().appendAlert(mockAlert('X-1'));
    const after = useAlertsStore.getState().alerts;
    expect(after.length).toBe(before + 1);
    expect(after[0].id).toBe('X-1');
    expect(after[0].flash).toBe(true);
  });

  it('clearFlash removes the flash flag', () => {
    useAlertsStore.getState().appendAlert(mockAlert('X-2'));
    useAlertsStore.getState().clearFlash('X-2');
    expect(useAlertsStore.getState().alerts[0].flash).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd Prototype/V2 && bun run test src/store/alertsStore.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the store**

Create `Prototype/V2/src/store/alertsStore.ts`:

```ts
import { create } from 'zustand';
import { seedAlerts, type Alert } from '@/data/alerts';

interface AlertsState {
  alerts: Alert[];
  appendAlert: (a: Alert) => void;
  clearFlash: (id: string) => void;
  reset: () => Partial<AlertsState>;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [...seedAlerts],
  appendAlert: (a) =>
    set((s) => ({ alerts: [{ ...a, flash: true }, ...s.alerts] })),
  clearFlash: (id) =>
    set((s) => ({
      alerts: s.alerts.map((x) => (x.id === id ? { ...x, flash: false } : x)),
    })),
  reset: () => ({ alerts: [...seedAlerts] }),
}));
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd Prototype/V2 && bun run test src/store/alertsStore.test.ts
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add Prototype/V2/src/store/alertsStore.ts Prototype/V2/src/store/alertsStore.test.ts
git commit -m "V2: alertsStore (seed + append-front with flash)"
```

---

### Task 10: `labStore` with drawer + send-flow + tests

**Files:**
- Create: `Prototype/V2/src/store/labStore.ts`
- Create: `Prototype/V2/src/store/labStore.test.ts`

The `sendScenario` action: (1) sets `phase = 'classifying'`, (2) calls `classifier.classify` for both models in parallel, (3) sets `phase = 'revealed'` with the two results, (4) appends a generated `Alert` to `alertsStore` derived from the ML result, (5) after a delay closes the drawer. Tests mock the classifier and the alert-building helper.

- [ ] **Step 1: Write the failing test**

Create `Prototype/V2/src/store/labStore.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLabStore } from './labStore';
import { useAlertsStore } from './alertsStore';

vi.mock('@/services/classifier', () => ({
  classifier: {
    classify: vi.fn(async (scenarioId: string, model: 'nano' | 'bold_beard') => {
      if (model === 'bold_beard') {
        return {
          model: 'bold_beard', scenarioId, predicted: 'T2',
          probs: { Normal: 0.05, T1: 0.1, T2: 0.7, T3: 0.15 },
        };
      }
      return {
        model: 'nano', scenarioId, predicted: 'T1',
        confidence: 0.71, reasoning: 'because reasons',
      };
    }),
  },
}));

describe('labStore', () => {
  beforeEach(() => {
    useLabStore.setState({ isOpen: true, phase: 'idle', lastResult: null });
    useAlertsStore.setState(useAlertsStore.getState().reset());
  });

  it('open/close toggle the drawer', () => {
    useLabStore.getState().closeDrawer();
    expect(useLabStore.getState().isOpen).toBe(false);
    useLabStore.getState().openDrawer();
    expect(useLabStore.getState().isOpen).toBe(true);
  });

  it('sendScenario classifies both models, appends an alert, and ends in revealed', async () => {
    const before = useAlertsStore.getState().alerts.length;
    await useLabStore.getState().sendScenario('T2-01');
    const state = useLabStore.getState();
    expect(state.phase).toBe('revealed');
    expect(state.lastResult?.ml.predicted).toBe('T2');
    expect(state.lastResult?.nano.predicted).toBe('T1');
    expect(useAlertsStore.getState().alerts.length).toBe(before + 1);
    expect(useAlertsStore.getState().alerts[0].tier).toBe('T2');
  });

  it('sendScenario does NOT append an alert when ML predicts Normal', async () => {
    const { classifier } = await import('@/services/classifier');
    (classifier.classify as ReturnType<typeof vi.fn>).mockImplementationOnce(async (sid: string) => ({
      model: 'bold_beard', scenarioId: sid, predicted: 'Normal',
      probs: { Normal: 0.9, T1: 0.05, T2: 0.03, T3: 0.02 },
    }));
    const before = useAlertsStore.getState().alerts.length;
    await useLabStore.getState().sendScenario('N-01');
    expect(useAlertsStore.getState().alerts.length).toBe(before);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd Prototype/V2 && bun run test src/store/labStore.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Build the alert-from-scenario helper**

Create `Prototype/V2/src/lib/buildAlertFromScenario.ts`:

```ts
import type { Alert } from '@/data/alerts';
import type { MLResult } from '@/services/classifier';
import { enforcementForTier } from '@/lib/tiers';
import { labScenarios } from '@/data/scenarios';

/**
 * Build a runtime Alert from a lab scenario + the ML classifier result.
 * Returns null when the ML model predicts Normal (no alert worth surfacing).
 *
 * The seed fields (timeline / evidenceChain / etc) come from a small
 * per-scenario fixture map — but to keep this PR tight we synthesize
 * plausible-looking entries from the scenario metadata. Later we can
 * promote per-scenario rich fixtures.
 */
export function buildAlertFromScenario(scenarioId: string, ml: MLResult): Alert | null {
  if (ml.predicted === 'Normal') return null;
  const sc = labScenarios.find((s) => s.id === scenarioId);
  if (!sc) throw new Error(`unknown lab scenario: ${scenarioId}`);
  const now = new Date().toISOString();
  const id = `ATI-LAB-${Date.now().toString(36).toUpperCase()}`;
  return {
    id,
    agentId: `agent-lab-${scenarioId.toLowerCase()}`,
    agentName: `Lab Agent · ${scenarioId}`,
    agentType: 'LLM Agent',
    tier: ml.predicted,
    enforcement: enforcementForTier(ml.predicted) as Alert['enforcement'],
    title: sc.title,
    summary: sc.description,
    detectedAt: now,
    mttc: '0m 04s',
    appsTouched: ['Lab Source'],
    cloudPresence: ['AWS'],
    changeManagement: { status: 'none' },
    evidenceChain: [
      {
        statement: sc.groundTruthRationale,
        signal: `Classifier (bold_beard) assigned ${ml.predicted}.`,
        policy: `policy://ati/${ml.predicted.toLowerCase()}/v1`,
        eventId: 'lab-evt-1',
      },
    ],
    timeline: [
      { ts: now, event: 'lab.scenario.injected', detail: `scenario=${scenarioId}` },
    ],
    crossAppContext: [],
    identity: {
      serviceAccount: `svc-lab-${scenarioId.toLowerCase()}@acme.okta.com`,
      tokenIssuer: 'Okta', idp: 'Okta Workforce',
      lastMfa: 'n/a (workload identity)',
      authMethod: 'OAuth client credentials',
    },
    recommendationRationale: sc.groundTruthRationale,
    modelRunId: `bold_beard-lab-${id}`,
  };
}
```

- [ ] **Step 4: Implement the store**

Create `Prototype/V2/src/store/labStore.ts`:

```ts
import { create } from 'zustand';
import type { ClassifierResult, MLResult, NanoResult } from '@/services/classifier';
import { classifier } from '@/services/classifier';
import { useAlertsStore } from './alertsStore';
import { buildAlertFromScenario } from '@/lib/buildAlertFromScenario';

export type LabPhase = 'idle' | 'classifying' | 'revealed';

export interface LabResult {
  scenarioId: string;
  nano: NanoResult;
  ml: MLResult;
}

interface LabState {
  isOpen: boolean;
  phase: LabPhase;
  lastResult: LabResult | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  sendScenario: (scenarioId: string) => Promise<void>;
}

const isNano = (r: ClassifierResult): r is NanoResult => r.model === 'nano';
const isML = (r: ClassifierResult): r is MLResult => r.model === 'bold_beard';

export const useLabStore = create<LabState>((set) => ({
  isOpen: true,          // first-load behavior: drawer is open
  phase: 'idle',
  lastResult: null,

  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),

  sendScenario: async (scenarioId) => {
    set({ phase: 'classifying' });
    const [nanoRes, mlRes] = await Promise.all([
      classifier.classify(scenarioId, 'nano'),
      classifier.classify(scenarioId, 'bold_beard'),
    ]);
    if (!isNano(nanoRes) || !isML(mlRes)) throw new Error('classifier returned wrong model');
    set({
      phase: 'revealed',
      lastResult: { scenarioId, nano: nanoRes, ml: mlRes },
    });
    const alert = buildAlertFromScenario(scenarioId, mlRes);
    if (alert) {
      useAlertsStore.getState().appendAlert(alert);
    }
  },
}));
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd Prototype/V2 && bun run test src/store/labStore.test.ts
```

Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add Prototype/V2/src/store/labStore.ts Prototype/V2/src/store/labStore.test.ts Prototype/V2/src/lib/buildAlertFromScenario.ts
git commit -m "V2: labStore + buildAlertFromScenario helper"
```

---

## Phase E — Shell (Sidebar, Topbar, layout, routing)

### Task 11: Sidebar component (Okta-styled left rail)

**Files:**
- Create: `Prototype/V2/src/components/Shell/Sidebar.tsx`

- [ ] **Step 1: Write the component**

Create `Prototype/V2/src/components/Shell/Sidebar.tsx`:

```tsx
import { NavLink } from 'react-router-dom';
import { Bell, Shield, Users, FlaskConical, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/',          label: 'Alerts',        Icon: Bell },
  { to: '/agents',    label: 'Agents',        Icon: Users },
  { to: '/lab',       label: 'Scenario Lab',  Icon: FlaskConical },
  { to: '/settings',  label: 'Settings',      Icon: Settings },
] as const;

export function Sidebar() {
  return (
    <aside className="hidden w-60 flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-14 items-center gap-2 px-5 border-b border-sidebar-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
          <Shield className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-white">Okta</div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/70">
            Identity Threat Protection
          </div>
        </div>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Prototype/V2/src/components/Shell/Sidebar.tsx
git commit -m "V2: Okta-styled sidebar with 4 nav items"
```

---

### Task 12: Topbar component (breadcrumb, env chip, Lab button, avatar)

**Files:**
- Create: `Prototype/V2/src/components/Shell/Topbar.tsx`

- [ ] **Step 1: Write the component**

Create `Prototype/V2/src/components/Shell/Topbar.tsx`:

```tsx
import { Bell, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLabStore } from '@/store/labStore';

export function Topbar() {
  const openDrawer = useLabStore((s) => s.openDrawer);
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Identity Threat Protection</span>
        <span className="opacity-50">/</span>
        <span>Alerts</span>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="font-mono text-xs">
          Prod · acme.okta.com
        </Badge>
        <Button
          variant="default"
          size="sm"
          onClick={openDrawer}
          className="gap-1.5"
          data-testid="topbar-open-lab"
        >
          <FlaskConical className="h-4 w-4" /> Scenario Lab
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="h-7 w-7 rounded-full bg-muted" aria-label="User avatar" />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Prototype/V2/src/components/Shell/Topbar.tsx
git commit -m "V2: Topbar with env chip and Scenario Lab launcher"
```

---

### Task 13: Shell wrapper + rewire `App.tsx` for 4 routes

**Files:**
- Create: `Prototype/V2/src/components/Shell/Shell.tsx`
- Create: `Prototype/V2/src/pages/Alerts.tsx` (stub for now — full in Task 22)
- Create: `Prototype/V2/src/pages/Agents.tsx` (stub for now — full in Task 25)
- Create: `Prototype/V2/src/pages/ScenarioLabPage.tsx` (stub — full in Task 17)
- Create: `Prototype/V2/src/pages/Settings.tsx`
- Modify: `Prototype/V2/src/App.tsx`
- Delete: `Prototype/V2/src/pages/Index.tsx`
- Delete: `Prototype/V2/src/components/AlertCard.tsx` (V1 shape — replaced in Task 19)
- Delete: `Prototype/V2/src/components/AlertDetail.tsx` (V1 shape — replaced in Task 21)
- Delete: `Prototype/V2/src/components/SeverityBadge.tsx` (V1 shape — superseded by TierBadge in Task 18)
- Delete: `Prototype/V2/src/components/NavLink.tsx` (Sidebar handles its own nav)

- [ ] **Step 1: Create the Shell wrapper**

Create `Prototype/V2/src/components/Shell/Shell.tsx`:

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function Shell() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the four route stubs**

`Prototype/V2/src/pages/Alerts.tsx`:
```tsx
export default function Alerts() {
  return <div className="p-6 text-sm text-muted-foreground">Alerts (stub — Task 22)</div>;
}
```

`Prototype/V2/src/pages/Agents.tsx`:
```tsx
export default function Agents() {
  return <div className="p-6 text-sm text-muted-foreground">Agents (stub — Task 25)</div>;
}
```

`Prototype/V2/src/pages/ScenarioLabPage.tsx`:
```tsx
export default function ScenarioLabPage() {
  return <div className="p-6 text-sm text-muted-foreground">Scenario Lab (stub — Task 17)</div>;
}
```

`Prototype/V2/src/pages/Settings.tsx`:
```tsx
export default function Settings() {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      Settings — coming soon.
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `App.tsx`**

Replace `Prototype/V2/src/App.tsx` entirely with:

```tsx
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from '@/components/Shell/Shell';
import Alerts from '@/pages/Alerts';
import Agents from '@/pages/Agents';
import ScenarioLabPage from '@/pages/ScenarioLabPage';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Alerts />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/lab" element={<ScenarioLabPage />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
```

- [ ] **Step 4: Delete V1 components and the old Index page**

```bash
rm Prototype/V2/src/pages/Index.tsx \
   Prototype/V2/src/components/AlertCard.tsx \
   Prototype/V2/src/components/AlertDetail.tsx \
   Prototype/V2/src/components/SeverityBadge.tsx \
   Prototype/V2/src/components/NavLink.tsx
```

- [ ] **Step 5: Typecheck and boot**

```bash
cd Prototype/V2 && bunx tsc --noEmit && bun run dev
```

Expected: typecheck clean. Dev server boots; clicking each nav item works; all four routes show their stub text. Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add Prototype/V2/src/App.tsx \
        Prototype/V2/src/components/Shell/ \
        Prototype/V2/src/pages/ \
        Prototype/V2/src/components/
git commit -m "V2: shell, 4 routes, drop V1 components"
```

---

## Phase F — Lab UI

### Task 14: `ProbabilityBar` component + tests

**Files:**
- Create: `Prototype/V2/src/components/Lab/ProbabilityBar.tsx`
- Create: `Prototype/V2/src/components/Lab/ProbabilityBar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `Prototype/V2/src/components/Lab/ProbabilityBar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProbabilityBar } from './ProbabilityBar';

describe('ProbabilityBar', () => {
  it('renders one segment per tier with percentage labels', () => {
    render(
      <ProbabilityBar probs={{ Normal: 0.1, T1: 0.2, T2: 0.5, T3: 0.2 }} />,
    );
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    expect(screen.getByText(/T2/i)).toBeInTheDocument();
  });

  it('highlights the highest-probability tier', () => {
    render(
      <ProbabilityBar probs={{ Normal: 0.1, T1: 0.7, T2: 0.1, T3: 0.1 }} />,
    );
    const t1Segment = screen.getByTestId('prob-segment-T1');
    expect(t1Segment.className).toMatch(/font-semibold/);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd Prototype/V2 && bun run test src/components/Lab/ProbabilityBar.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `Prototype/V2/src/components/Lab/ProbabilityBar.tsx`:

```tsx
import { TIERS, type Tier, tierColorClass } from '@/lib/tiers';
import { cn } from '@/lib/utils';

interface Props { probs: Record<Tier, number>; }

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function ProbabilityBar({ probs }: Props) {
  const top = TIERS.reduce<Tier>(
    (acc, t) => (probs[t] > probs[acc] ? t : acc),
    'Normal',
  );
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded border">
        {TIERS.map((t) => (
          <div
            key={t}
            data-testid={`prob-segment-${t}`}
            className={cn('h-full', tierColorClass(t).split(' ')[0], t === top && 'font-semibold')}
            style={{ width: `${probs[t] * 100}%` }}
            title={`${t}: ${pct(probs[t])}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1 text-[11px]">
        {TIERS.map((t) => (
          <div
            key={t}
            data-testid={`prob-segment-${t}`}
            className={cn('flex items-center justify-between rounded px-1.5 py-0.5 border', tierColorClass(t), t === top && 'font-semibold')}
          >
            <span>{t}</span>
            <span className="tabular-nums">{pct(probs[t])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd Prototype/V2 && bun run test src/components/Lab/ProbabilityBar.test.tsx
```

Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add Prototype/V2/src/components/Lab/ProbabilityBar.tsx Prototype/V2/src/components/Lab/ProbabilityBar.test.tsx
git commit -m "V2: ProbabilityBar component"
```

---

### Task 15: `ClassifierResultPanel` (handles both nano and ML)

**Files:**
- Create: `Prototype/V2/src/components/Lab/ClassifierResultPanel.tsx`
- Create: `Prototype/V2/src/components/Lab/ClassifierResultPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `Prototype/V2/src/components/Lab/ClassifierResultPanel.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassifierResultPanel } from './ClassifierResultPanel';
import type { MLResult, NanoResult } from '@/services/classifier';

const ml: MLResult = {
  model: 'bold_beard', scenarioId: 'T2-01', predicted: 'T2',
  probs: { Normal: 0.05, T1: 0.1, T2: 0.7, T3: 0.15 },
};
const nano: NanoResult = {
  model: 'nano', scenarioId: 'T2-01', predicted: 'T1',
  confidence: 0.71, reasoning: 'because reasons',
};

describe('ClassifierResultPanel', () => {
  it('shows correct/incorrect check vs ground truth', () => {
    render(<ClassifierResultPanel result={ml} groundTruth="T2" />);
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
  });

  it('shows incorrect when prediction != ground truth', () => {
    render(<ClassifierResultPanel result={nano} groundTruth="T2" />);
    expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
  });

  it('renders 4-class probability bar for ML', () => {
    render(<ClassifierResultPanel result={ml} groundTruth="T2" />);
    expect(screen.getByTestId('prob-segment-T2')).toBeInTheDocument();
  });

  it('renders single confidence + reasoning for nano', () => {
    render(<ClassifierResultPanel result={nano} groundTruth="T2" />);
    expect(screen.getByText(/71%/)).toBeInTheDocument();
    expect(screen.getByText(/because reasons/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd Prototype/V2 && bun run test src/components/Lab/ClassifierResultPanel.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement the component**

Create `Prototype/V2/src/components/Lab/ClassifierResultPanel.tsx`:

```tsx
import type { ClassifierResult } from '@/services/classifier';
import type { Tier } from '@/lib/tiers';
import { tierLabel, tierColorClass, modelDisplay } from '@/lib/tiers';
import { ProbabilityBar } from './ProbabilityBar';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { result: ClassifierResult; groundTruth: Tier; }

export function ClassifierResultPanel({ result, groundTruth }: Props) {
  const display = modelDisplay(result.model);
  const correct = result.predicted === groundTruth;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <header>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{display.subtitle}</div>
        <div className="text-sm font-semibold">{display.name}</div>
      </header>

      <div className="flex items-center justify-between">
        <span className={cn('rounded-md border px-2 py-1 text-xs font-medium', tierColorClass(result.predicted))}>
          Predicted: {tierLabel(result.predicted)}
        </span>
        <span className={cn('flex items-center gap-1 text-xs', correct ? 'text-emerald-700' : 'text-red-700')}>
          {correct ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {correct ? 'Correct' : 'Incorrect'}
        </span>
      </div>

      {result.model === 'bold_beard' ? (
        <div>
          <div className="mb-1 text-[11px] uppercase text-muted-foreground">Class probabilities</div>
          <ProbabilityBar probs={result.probs} />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-xs">
            <span className="uppercase text-muted-foreground">Self-reported confidence</span>
            <span className="text-base font-semibold tabular-nums">{Math.round(result.confidence * 100)}%</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-4">{result.reasoning}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd Prototype/V2 && bun run test src/components/Lab/ClassifierResultPanel.test.tsx
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add Prototype/V2/src/components/Lab/ClassifierResultPanel.tsx Prototype/V2/src/components/Lab/ClassifierResultPanel.test.tsx
git commit -m "V2: ClassifierResultPanel (nano confidence + ML probs)"
```

---

### Task 16: `ScenarioPicker`

**Files:**
- Create: `Prototype/V2/src/components/Lab/ScenarioPicker.tsx`

- [ ] **Step 1: Write the component**

Create `Prototype/V2/src/components/Lab/ScenarioPicker.tsx`:

```tsx
import { useState } from 'react';
import { Eye, EyeOff, Send } from 'lucide-react';
import { labScenarios, type LabScenario } from '@/data/scenarios';
import { Button } from '@/components/ui/button';
import { tierLabel, tierColorClass } from '@/lib/tiers';
import { cn } from '@/lib/utils';

interface Props {
  onSend: (scenarioId: string) => void;
  disabled?: boolean;
}

export function ScenarioPicker({ onSend, disabled }: Props) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pick a scenario
      </h3>
      {labScenarios.map((s) => <Card key={s.id} s={s} revealed={revealed.has(s.id)} onToggle={() => toggle(s.id)} onSend={() => onSend(s.id)} disabled={disabled} />)}
    </div>
  );
}

function Card({ s, revealed, onToggle, onSend, disabled }: {
  s: LabScenario; revealed: boolean;
  onToggle: () => void; onSend: () => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3" data-testid={`lab-scenario-${s.id}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.difficulty} · {s.id}</div>
          <div className="truncate text-sm font-medium">{s.title}</div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label={revealed ? 'Hide ground truth' : 'Reveal ground truth'}
          className="text-muted-foreground hover:text-foreground"
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{s.description}</p>
      {revealed && (
        <div className={cn('rounded border px-2 py-1 text-[11px]', tierColorClass(s.groundTruthTier))}>
          Ground truth: {tierLabel(s.groundTruthTier)}
        </div>
      )}
      <Button size="sm" className="self-end gap-1" disabled={disabled} onClick={onSend}>
        <Send className="h-3.5 w-3.5" /> Send to ATI
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Prototype/V2/src/components/Lab/ScenarioPicker.tsx
git commit -m "V2: ScenarioPicker with spoiler toggle"
```

---

### Task 17: `LabDrawer` + page + auto-close-after-send + integration test

**Files:**
- Create: `Prototype/V2/src/components/Lab/LabDrawer.tsx`
- Modify: `Prototype/V2/src/components/Shell/Shell.tsx` (mount the drawer)
- Modify: `Prototype/V2/src/pages/ScenarioLabPage.tsx` (full-page version)
- Create: `Prototype/V2/src/components/Lab/LabDrawer.test.tsx`

The drawer uses shadcn `Sheet`. After `phase === 'revealed'`, wait 1500ms, then close the drawer.

- [ ] **Step 1: Implement the LabDrawer**

Create `Prototype/V2/src/components/Lab/LabDrawer.tsx`:

```tsx
import { useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScenarioPicker } from './ScenarioPicker';
import { ClassifierResultPanel } from './ClassifierResultPanel';
import { useLabStore } from '@/store/labStore';
import { labScenarios } from '@/data/scenarios';
import { Skeleton } from '@/components/ui/skeleton';

export function LabDrawer() {
  const { isOpen, phase, lastResult, openDrawer, closeDrawer, sendScenario } = useLabStore();

  // Auto-close after a successful reveal so the alert lands visibly in the dashboard.
  useEffect(() => {
    if (phase !== 'revealed') return;
    const t = setTimeout(() => closeDrawer(), 1500);
    return () => clearTimeout(t);
  }, [phase, closeDrawer]);

  return (
    <Sheet open={isOpen} onOpenChange={(v) => (v ? openDrawer() : closeDrawer())}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto" data-testid="lab-drawer">
        <SheetHeader>
          <SheetTitle>Scenario Lab</SheetTitle>
          <SheetDescription>
            Send a simulated agent telemetry payload through both classifiers. The ML model's decision drives the alert that lands in the dashboard.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ScenarioPicker onSend={(id) => void sendScenario(id)} disabled={phase === 'classifying'} />
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Classifier outputs
            </h3>
            {phase === 'idle' && (
              <p className="text-xs text-muted-foreground">
                Pick a scenario and click <em>Send to ATI</em> to see both classifiers score it.
              </p>
            )}
            {phase === 'classifying' && (
              <>
                <Skeleton className="h-44 w-full" />
                <Skeleton className="h-44 w-full" />
              </>
            )}
            {phase === 'revealed' && lastResult && (() => {
              const sc = labScenarios.find((s) => s.id === lastResult.scenarioId);
              if (!sc) return null;
              return (
                <>
                  <ClassifierResultPanel result={lastResult.nano} groundTruth={sc.groundTruthTier} />
                  <ClassifierResultPanel result={lastResult.ml}   groundTruth={sc.groundTruthTier} />
                  <div className="rounded-md border bg-muted/40 p-3 text-xs">
                    <div className="mb-1 font-semibold">Ground-truth rationale</div>
                    <p className="text-muted-foreground">{sc.groundTruthRationale}</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Mount the drawer in `Shell`**

Modify `Prototype/V2/src/components/Shell/Shell.tsx` to render `<LabDrawer />` once at the layout level:

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { LabDrawer } from '@/components/Lab/LabDrawer';

export function Shell() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <LabDrawer />
    </div>
  );
}
```

- [ ] **Step 3: Make the lab page a thin wrapper that opens the drawer**

Replace `Prototype/V2/src/pages/ScenarioLabPage.tsx`:

```tsx
import { useEffect } from 'react';
import { useLabStore } from '@/store/labStore';

export default function ScenarioLabPage() {
  const openDrawer = useLabStore((s) => s.openDrawer);
  useEffect(() => { openDrawer(); }, [openDrawer]);
  return (
    <div className="p-6 text-sm text-muted-foreground">
      The Scenario Lab is shown in the side drawer (opened automatically).
    </div>
  );
}
```

- [ ] **Step 4: Integration test the send flow**

Create `Prototype/V2/src/components/Lab/LabDrawer.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LabDrawer } from './LabDrawer';
import { useLabStore } from '@/store/labStore';
import { useAlertsStore } from '@/store/alertsStore';
import { labScenarios } from '@/data/scenarios';

vi.mock('@/services/classifier', () => ({
  classifier: {
    classify: vi.fn(async (scenarioId: string, model: 'nano' | 'bold_beard') =>
      model === 'bold_beard'
        ? { model: 'bold_beard', scenarioId, predicted: 'T2', probs: { Normal: 0.05, T1: 0.1, T2: 0.7, T3: 0.15 } }
        : { model: 'nano', scenarioId, predicted: 'T2', confidence: 0.8, reasoning: 'r' },
    ),
  },
}));

describe('LabDrawer send flow', () => {
  beforeEach(() => {
    useLabStore.setState({ isOpen: true, phase: 'idle', lastResult: null });
    useAlertsStore.setState(useAlertsStore.getState().reset());
  });

  it('sending a scenario classifies → reveals → appends alert → closes drawer', async () => {
    vi.useFakeTimers();
    render(<MemoryRouter><LabDrawer /></MemoryRouter>);

    const firstScenario = labScenarios[0];
    const card = screen.getByTestId(`lab-scenario-${firstScenario.id}`);
    const sendBtn = card.querySelector('button[disabled],button:not([disabled])') as HTMLButtonElement;
    // grab the Send button specifically — it's the last button inside the card
    const buttons = card.querySelectorAll('button');
    const send = buttons[buttons.length - 1] as HTMLButtonElement;
    fireEvent.click(send);

    await waitFor(() => expect(useLabStore.getState().phase).toBe('revealed'));

    // alert was appended at the front
    expect(useAlertsStore.getState().alerts[0].id).toMatch(/^ATI-LAB-/);

    // drawer auto-closes after 1500ms
    act(() => { vi.advanceTimersByTime(1600); });
    expect(useLabStore.getState().isOpen).toBe(false);

    vi.useRealTimers();
  });
});
```

- [ ] **Step 5: Run the integration test — expect pass**

```bash
cd Prototype/V2 && bun run test src/components/Lab/LabDrawer.test.tsx
```

Expected: 1 passing.

- [ ] **Step 6: Boot and eyeball**

```bash
cd Prototype/V2 && bun run dev
```

Expected: lands on `/` with the drawer open. Picking a scenario → spinners → both result panels appear → drawer slides shut. (The dashboard list is still stub-only — that's Task 22.) Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add Prototype/V2/src/components/Lab/ \
        Prototype/V2/src/components/Shell/Shell.tsx \
        Prototype/V2/src/pages/ScenarioLabPage.tsx
git commit -m "V2: LabDrawer with send-flow, auto-close, integration test"
```

---

## Phase G — Alerts page

### Task 18: Small chips — `TierBadge`, `ChangeManagementChip`, `CloudPresenceChips`

**Files:**
- Create: `Prototype/V2/src/components/Alerts/TierBadge.tsx`
- Create: `Prototype/V2/src/components/Alerts/ChangeManagementChip.tsx`
- Create: `Prototype/V2/src/components/Alerts/CloudPresenceChips.tsx`

These are small enough to batch in one task — no separate tests; they're rendered through higher-level tests.

- [ ] **Step 1: `TierBadge`**

Create `Prototype/V2/src/components/Alerts/TierBadge.tsx`:

```tsx
import type { Tier } from '@/lib/tiers';
import { tierColorClass, tierLabel } from '@/lib/tiers';
import { cn } from '@/lib/utils';

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <span className={cn('inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium', tierColorClass(tier), className)}>
      {tierLabel(tier)}
    </span>
  );
}
```

- [ ] **Step 2: `ChangeManagementChip`**

Create `Prototype/V2/src/components/Alerts/ChangeManagementChip.tsx`:

```tsx
import { CheckCircle2, ShieldOff } from 'lucide-react';
import type { ChangeManagement } from '@/data/alerts';
import { cn } from '@/lib/utils';

export function ChangeManagementChip({ cm, className }: { cm: ChangeManagement; className?: string }) {
  if (cm.status === 'approved') {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800', className)}>
        <CheckCircle2 className="h-3 w-3" />
        Approved · {cm.ticket ?? 'CR'}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] text-red-800', className)}>
      <ShieldOff className="h-3 w-3" />
      No active CR
    </span>
  );
}
```

- [ ] **Step 3: `CloudPresenceChips`**

Create `Prototype/V2/src/components/Alerts/CloudPresenceChips.tsx`:

```tsx
import type { CloudProvider } from '@/data/alerts';
import { cn } from '@/lib/utils';

const COLORS: Record<CloudProvider, string> = {
  AWS:   'border-orange-300 bg-orange-50 text-orange-800',
  GCP:   'border-blue-300 bg-blue-50 text-blue-800',
  Azure: 'border-sky-300 bg-sky-50 text-sky-800',
};

export function CloudPresenceChips({ clouds, className }: { clouds: CloudProvider[]; className?: string }) {
  if (clouds.length === 0) return null;
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {clouds.map((c) => (
        <span key={c} className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', COLORS[c])}>
          {c}
        </span>
      ))}
    </span>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add Prototype/V2/src/components/Alerts/
git commit -m "V2: tier/change-management/cloud-presence chips"
```

---

### Task 19: `AlertListItem` (rewrites V1's AlertCard)

**Files:**
- Create: `Prototype/V2/src/components/Alerts/AlertListItem.tsx`
- Create: `Prototype/V2/src/components/Alerts/AlertListItem.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `Prototype/V2/src/components/Alerts/AlertListItem.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertListItem } from './AlertListItem';
import { seedAlerts } from '@/data/alerts';

describe('AlertListItem', () => {
  const a = seedAlerts[0];

  it('shows agent, summary, tier badge, and cloud chips', () => {
    render(<AlertListItem alert={a} selected={false} onSelect={() => {}} />);
    expect(screen.getByText(a.agentName)).toBeInTheDocument();
    expect(screen.getByText(a.summary)).toBeInTheDocument();
    expect(screen.getByText(/Tier 3/)).toBeInTheDocument();
    a.cloudPresence.forEach((c) => expect(screen.getByText(c)).toBeInTheDocument());
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<AlertListItem alert={a} selected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId(`alert-row-${a.id}`));
    expect(onSelect).toHaveBeenCalledWith(a.id);
  });

  it('renders a flash style when alert.flash is true', () => {
    render(<AlertListItem alert={{ ...a, flash: true }} selected={false} onSelect={() => {}} />);
    expect(screen.getByTestId(`alert-row-${a.id}`).className).toMatch(/ring/);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd Prototype/V2 && bun run test src/components/Alerts/AlertListItem.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement the component**

Create `Prototype/V2/src/components/Alerts/AlertListItem.tsx`:

```tsx
import { formatDistanceToNow } from 'date-fns';
import { Timer } from 'lucide-react';
import type { Alert } from '@/data/alerts';
import { TierBadge } from './TierBadge';
import { ChangeManagementChip } from './ChangeManagementChip';
import { CloudPresenceChips } from './CloudPresenceChips';
import { cn } from '@/lib/utils';

interface Props {
  alert: Alert;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function AlertListItem({ alert, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      data-testid={`alert-row-${alert.id}`}
      onClick={() => onSelect(alert.id)}
      className={cn(
        'flex w-full flex-col gap-2 rounded-md border bg-card p-3 text-left transition-colors hover:bg-accent/30',
        selected && 'border-primary bg-primary/5',
        alert.flash && 'ring-2 ring-primary/60 animate-pulse',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{alert.agentName}</div>
          <div className="text-[11px] text-muted-foreground">{alert.agentType}</div>
        </div>
        <TierBadge tier={alert.tier} />
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{alert.summary}</p>
      <div className="flex flex-wrap items-center gap-2">
        <ChangeManagementChip cm={alert.changeManagement} />
        <CloudPresenceChips clouds={alert.cloudPresence} />
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Timer className="h-3 w-3" />
          MTTC {alert.mttc}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Detected {formatDistanceToNow(new Date(alert.detectedAt))} ago
      </div>
    </button>
  );
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd Prototype/V2 && bun run test src/components/Alerts/AlertListItem.test.tsx
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add Prototype/V2/src/components/Alerts/AlertListItem.tsx Prototype/V2/src/components/Alerts/AlertListItem.test.tsx
git commit -m "V2: AlertListItem with tier/change/cloud chips + flash"
```

---

### Task 20: Alert-detail sub-components

**Files:**
- Create: `Prototype/V2/src/components/Alerts/EvidenceChain.tsx`
- Create: `Prototype/V2/src/components/Alerts/Timeline10m.tsx`
- Create: `Prototype/V2/src/components/Alerts/CrossAppContext.tsx`
- Create: `Prototype/V2/src/components/Alerts/IdentityCard.tsx`
- Create: `Prototype/V2/src/components/Alerts/RecommendedEnforcement.tsx`
- Create: `Prototype/V2/src/components/Alerts/AuditFooter.tsx`

Batched — these are small presentational components.

- [ ] **Step 1: `EvidenceChain.tsx`**

```tsx
import type { EvidenceStep } from '@/data/alerts';

export function EvidenceChain({ steps }: { steps: EvidenceStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={s.eventId} className="flex gap-3">
          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {i + 1}
          </span>
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium">{s.statement}</div>
            <div className="text-xs text-muted-foreground"><span className="font-medium">Signal: </span>{s.signal}</div>
            <div className="text-[11px] text-muted-foreground">
              <span className="font-mono">{s.policy}</span> · event <span className="font-mono">{s.eventId}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: `Timeline10m.tsx`**

```tsx
import { formatDistanceToNow } from 'date-fns';
import type { TimelineEvent } from '@/data/alerts';

export function Timeline10m({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-3 border-l border-border pl-4">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[21px] mt-1.5 h-2 w-2 rounded-full bg-primary" />
          <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.ts))} ago{e.app ? ` · ${e.app}` : ''}</div>
          <div className="text-sm"><span className="font-mono text-xs">{e.event}</span> — {e.detail}</div>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 3: `CrossAppContext.tsx`**

```tsx
import type { CrossAppEvent } from '@/data/alerts';
import { CloudPresenceChips } from './CloudPresenceChips';

export function CrossAppContext({ events }: { events: CrossAppEvent[] }) {
  if (events.length === 0) return <p className="text-xs text-muted-foreground">No cross-app activity in window.</p>;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {events.map((e, i) => (
        <div key={i} className="rounded-md border bg-card p-3 text-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium">{e.app}</span>
            {e.cloud && <CloudPresenceChips clouds={[e.cloud]} />}
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">{e.event}</div>
          <div className="mt-1">{e.detail}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: `IdentityCard.tsx`**

```tsx
import type { IdentityCard as IC } from '@/data/alerts';

export function IdentityCard({ identity }: { identity: IC }) {
  const rows: Array<[string, string]> = [
    ['Service account', identity.serviceAccount],
    ['Token issuer', identity.tokenIssuer],
    ['IdP', identity.idp],
    ['Last MFA', identity.lastMfa],
    ['Auth method', identity.authMethod],
  ];
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-xs">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono break-all">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

- [ ] **Step 5: `RecommendedEnforcement.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { CircleStop, ShieldAlert, Pause } from 'lucide-react';
import type { Enforcement } from '@/lib/tiers';

const ICONS: Record<Exclude<Enforcement, 'None'>, JSX.Element> = {
  'Stall':          <Pause className="h-3.5 w-3.5" />,
  'Restrict Scope': <ShieldAlert className="h-3.5 w-3.5" />,
  'Session Kill':   <CircleStop className="h-3.5 w-3.5" />,
};

export function RecommendedEnforcement({ enforcement, rationale }: { enforcement: Enforcement; rationale: string }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(['Stall', 'Restrict Scope', 'Session Kill'] as const).map((e) => (
          <Button
            key={e}
            size="sm"
            variant={e === enforcement ? 'default' : 'outline'}
            className="gap-1.5"
          >
            {ICONS[e]} {e}
            {e === enforcement && <span className="ml-1 text-[10px] uppercase opacity-75">Recommended</span>}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{rationale}</p>
    </div>
  );
}
```

- [ ] **Step 6: `AuditFooter.tsx`**

```tsx
export function AuditFooter({ runId }: { runId: string }) {
  return (
    <div className="border-t pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
      Detected by ATI · Model run <span className="font-mono">{runId}</span>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add Prototype/V2/src/components/Alerts/
git commit -m "V2: alert-detail sub-components (evidence, timeline, cross-app, identity, enforcement, audit)"
```

---

### Task 21: `AlertDetail` composition

**Files:**
- Create: `Prototype/V2/src/components/Alerts/AlertDetail.tsx`

- [ ] **Step 1: Compose the detail pane**

Create `Prototype/V2/src/components/Alerts/AlertDetail.tsx`:

```tsx
import type { Alert } from '@/data/alerts';
import { TierBadge } from './TierBadge';
import { EvidenceChain } from './EvidenceChain';
import { Timeline10m } from './Timeline10m';
import { CrossAppContext } from './CrossAppContext';
import { IdentityCard } from './IdentityCard';
import { RecommendedEnforcement } from './RecommendedEnforcement';
import { AuditFooter } from './AuditFooter';
import { Timer } from 'lucide-react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function AlertDetail({ alert }: { alert: Alert }) {
  return (
    <article className="flex flex-col gap-6 p-6">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{alert.id}</div>
            <h2 className="text-lg font-semibold">{alert.title}</h2>
            <div className="mt-1 text-sm text-muted-foreground">{alert.agentName} · {alert.agentType}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <TierBadge tier={alert.tier} />
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Timer className="h-3 w-3" /> MTTC {alert.mttc}
            </span>
          </div>
        </div>
        <RecommendedEnforcement enforcement={alert.enforcement} rationale={alert.recommendationRationale} />
      </header>

      <Section title="Why this fired — deterministic evidence chain">
        <EvidenceChain steps={alert.evidenceChain} />
      </Section>

      <Section title="10-minute preceding timeline">
        <Timeline10m events={alert.timeline} />
      </Section>

      <Section title="Cross-app context">
        <CrossAppContext events={alert.crossAppContext} />
      </Section>

      <Section title="Identity & verification">
        <IdentityCard identity={alert.identity} />
      </Section>

      <AuditFooter runId={alert.modelRunId} />
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Prototype/V2/src/components/Alerts/AlertDetail.tsx
git commit -m "V2: AlertDetail composition (no probabilities in operator view)"
```

---

### Task 22: `Alerts` page wired to the store

**Files:**
- Modify: `Prototype/V2/src/pages/Alerts.tsx` (full rewrite of the stub)

- [ ] **Step 1: Implement the page**

Replace `Prototype/V2/src/pages/Alerts.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useAlertsStore } from '@/store/alertsStore';
import { AlertListItem } from '@/components/Alerts/AlertListItem';
import { AlertDetail } from '@/components/Alerts/AlertDetail';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function Alerts() {
  const alerts = useAlertsStore((s) => s.alerts);
  const clearFlash = useAlertsStore((s) => s.clearFlash);
  const [selectedId, setSelectedId] = useState<string | null>(alerts[0]?.id ?? null);
  const [query, setQuery] = useState('');

  // Whenever a flashed alert lands at the front, select it and clear the flash after 2s.
  useEffect(() => {
    const flashed = alerts.find((a) => a.flash);
    if (!flashed) return;
    setSelectedId(flashed.id);
    const t = setTimeout(() => clearFlash(flashed.id), 2000);
    return () => clearTimeout(t);
  }, [alerts, clearFlash]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return alerts;
    return alerts.filter((a) =>
      `${a.agentName} ${a.title} ${a.summary}`.toLowerCase().includes(q),
    );
  }, [alerts, query]);

  const selected = alerts.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="grid h-full grid-cols-1 gap-0 lg:grid-cols-[360px_1fr]">
      <section className="border-r bg-muted/20 p-3">
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search alerts…"
            className="pl-8 h-9"
          />
        </div>
        <div className="flex flex-col gap-2">
          {filtered.map((a) => (
            <AlertListItem
              key={a.id}
              alert={a}
              selected={a.id === selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      </section>

      <section className="overflow-auto bg-card">
        {selected
          ? <AlertDetail alert={selected} />
          : <div className="p-6 text-sm text-muted-foreground">No alert selected.</div>
        }
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Boot and try the full flow**

```bash
cd Prototype/V2 && bun run dev
```

Expected:
- Lands on `/` with Lab drawer open AND the alerts list visible behind it.
- Pick the T3 scenario → both classifier panels reveal → drawer closes after ~1.5s → a new `ATI-LAB-…` alert is selected at the top of the list with a pulsing ring → detail pane shows evidence chain, timeline, cross-app, identity, audit footer with no probability anywhere in the detail pane.
- Pick the Normal scenario → both panels reveal → drawer closes → no new alert is added.

Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add Prototype/V2/src/pages/Alerts.tsx
git commit -m "V2: Alerts page wired to alertsStore (search, flash-on-inject)"
```

---

## Phase H — Agents page

### Task 23: Agent directory components + Shadow AI toggle

**Files:**
- Create: `Prototype/V2/src/components/Agents/RiskBadge.tsx`
- Create: `Prototype/V2/src/components/Agents/StatusChip.tsx`
- Create: `Prototype/V2/src/components/Agents/ShadowAiToggle.tsx`
- Create: `Prototype/V2/src/components/Agents/AgentDirectory.tsx`

- [ ] **Step 1: `RiskBadge.tsx`** (text label only — Marcus rejected percentages)

```tsx
import type { RiskLabel } from '@/data/agents';
import { cn } from '@/lib/utils';

const C: Record<RiskLabel, string> = {
  Low:    'bg-slate-100 text-slate-700 border-slate-300',
  Medium: 'bg-amber-50  text-amber-800  border-amber-300',
  High:   'bg-red-50    text-red-800    border-red-300',
};

export function RiskBadge({ risk }: { risk: RiskLabel }) {
  return <span className={cn('rounded border px-1.5 py-0.5 text-[11px] font-medium', C[risk])}>{risk}</span>;
}
```

- [ ] **Step 2: `StatusChip.tsx`**

```tsx
import type { AgentStatus } from '@/data/agents';
import { ShieldCheck, EyeOff } from 'lucide-react';

export function StatusChip({ status }: { status: AgentStatus }) {
  if (status === 'registered') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-800">
        <ShieldCheck className="h-3 w-3" /> Registered
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-900">
      <EyeOff className="h-3 w-3" /> Shadow AI · Auto-discovered
    </span>
  );
}
```

- [ ] **Step 3: `ShadowAiToggle.tsx`**

```tsx
import { Switch } from '@/components/ui/switch';

interface Props { value: boolean; onChange: (v: boolean) => void; }

export function ShadowAiToggle({ value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <Switch checked={value} onCheckedChange={onChange} aria-label="Show shadow AI only" />
      Shadow AI only
    </label>
  );
}
```

- [ ] **Step 4: `AgentDirectory.tsx`**

```tsx
import { formatDistanceToNow } from 'date-fns';
import type { Agent } from '@/data/agents';
import { StatusChip } from './StatusChip';
import { RiskBadge } from './RiskBadge';

interface Props { agents: Agent[]; onOpen: (id: string) => void; }

export function AgentDirectory({ agents, onOpen }: Props) {
  return (
    <table className="w-full text-sm">
      <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
        <tr className="border-b">
          <th className="px-3 py-2 text-left">Agent</th>
          <th className="px-3 py-2 text-left">Identity</th>
          <th className="px-3 py-2 text-left">Type</th>
          <th className="px-3 py-2 text-left">Owner</th>
          <th className="px-3 py-2 text-left">Status</th>
          <th className="px-3 py-2 text-left">Risk</th>
          <th className="px-3 py-2 text-left">Last seen</th>
          <th className="px-3 py-2 text-left">Open alerts</th>
        </tr>
      </thead>
      <tbody>
        {agents.map((a) => (
          <tr
            key={a.id}
            className="cursor-pointer border-b hover:bg-accent/20"
            onClick={() => onOpen(a.id)}
            data-testid={`agent-row-${a.id}`}
          >
            <td className="px-3 py-2 font-medium">{a.name}</td>
            <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{a.identity}</td>
            <td className="px-3 py-2">{a.type}</td>
            <td className="px-3 py-2">{a.ownerTeam}</td>
            <td className="px-3 py-2"><StatusChip status={a.status} /></td>
            <td className="px-3 py-2"><RiskBadge risk={a.risk} /></td>
            <td className="px-3 py-2 text-muted-foreground">{formatDistanceToNow(new Date(a.lastSeen))} ago</td>
            <td className="px-3 py-2 tabular-nums">{a.openAlertCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add Prototype/V2/src/components/Agents/
git commit -m "V2: Agent directory + risk/status/shadow-toggle chips"
```

---

### Task 24: `AgentDetailDrawer`

**Files:**
- Create: `Prototype/V2/src/components/Agents/AgentDetailDrawer.tsx`

- [ ] **Step 1: Write the component**

Create `Prototype/V2/src/components/Agents/AgentDetailDrawer.tsx`:

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { Agent } from '@/data/agents';
import { StatusChip } from './StatusChip';
import { RiskBadge } from './RiskBadge';
import { useAlertsStore } from '@/store/alertsStore';
import { AlertListItem } from '@/components/Alerts/AlertListItem';

interface Props { agent: Agent | null; open: boolean; onOpenChange: (v: boolean) => void; }

export function AgentDetailDrawer({ agent, open, onOpenChange }: Props) {
  const alerts = useAlertsStore((s) => s.alerts);
  if (!agent) return null;
  const agentAlerts = alerts.filter((a) => a.agentId === agent.id);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{agent.name}</SheetTitle>
          <SheetDescription className="font-mono text-[11px]">{agent.identity}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 text-sm">
          <div className="flex gap-2"><StatusChip status={agent.status} /><RiskBadge risk={agent.risk} /></div>

          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Baseline behavior</h3>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Typical scopes</dt><dd>{agent.baseline.typicalScopes.join(', ')}</dd>
              <dt className="text-muted-foreground">Typical apps</dt><dd>{agent.baseline.typicalApps.join(', ')}</dd>
              <dt className="text-muted-foreground">Typical geos</dt><dd>{agent.baseline.typicalGeos.join(', ')}</dd>
              <dt className="text-muted-foreground">Typical hours</dt><dd>{agent.baseline.typicalHoursUtc}</dd>
            </dl>
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Recent alerts</h3>
            {agentAlerts.length === 0
              ? <p className="text-xs text-muted-foreground">No open alerts for this agent.</p>
              : <div className="flex flex-col gap-2">{agentAlerts.map((a) => <AlertListItem key={a.id} alert={a} selected={false} onSelect={() => {}} />)}</div>
            }
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Prototype/V2/src/components/Agents/AgentDetailDrawer.tsx
git commit -m "V2: AgentDetailDrawer with baseline + recent alerts"
```

---

### Task 25: `Agents` page wired together

**Files:**
- Modify: `Prototype/V2/src/pages/Agents.tsx` (full rewrite of the stub)

- [ ] **Step 1: Wire the page**

Replace `Prototype/V2/src/pages/Agents.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { seedAgents } from '@/data/agents';
import { AgentDirectory } from '@/components/Agents/AgentDirectory';
import { ShadowAiToggle } from '@/components/Agents/ShadowAiToggle';
import { AgentDetailDrawer } from '@/components/Agents/AgentDetailDrawer';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function Agents() {
  const [shadowOnly, setShadowOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return seedAgents.filter((a) => {
      if (shadowOnly && a.status !== 'shadow') return false;
      if (q && !`${a.name} ${a.identity} ${a.ownerTeam}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [shadowOnly, query]);

  const open = openId !== null;
  const agent = seedAgents.find((a) => a.id === openId) ?? null;

  return (
    <div className="p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Agents</h1>
        <div className="flex items-center gap-3">
          <ShadowAiToggle value={shadowOnly} onChange={setShadowOnly} />
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search agents…" className="pl-8 h-9 w-64" />
          </div>
        </div>
      </header>
      <div className="rounded-md border bg-card">
        <AgentDirectory agents={filtered} onOpen={setOpenId} />
      </div>
      <AgentDetailDrawer agent={agent} open={open} onOpenChange={(v) => !v && setOpenId(null)} />
    </div>
  );
}
```

- [ ] **Step 2: Boot and try it**

```bash
cd Prototype/V2 && bun run dev
```

Expected: `/agents` shows the directory. Toggling "Shadow AI only" filters down to the single shadow agent. Clicking a row opens the drawer with baseline + recent alerts. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add Prototype/V2/src/pages/Agents.tsx
git commit -m "V2: Agents page (directory + shadow filter + detail drawer)"
```

---

## Phase I — Final polish + acceptance

### Task 26: Clean up V1 demo cruft from V2

**Files:**
- Delete: `Prototype/V2/src/App.css` (Vite default — unused after our rewrite)
- Modify: `Prototype/V2/README.md` (note this is V2; point at the spec)

- [ ] **Step 1: Delete unused App.css if it's not imported**

```bash
grep -R "App.css" Prototype/V2/src
```

If no results, delete the file:

```bash
rm Prototype/V2/src/App.css
```

If `main.tsx` or `App.tsx` imports it, leave it alone.

- [ ] **Step 2: Update the V2 README**

Replace `Prototype/V2/README.md` body with a short note (keep any badge/title from the existing file at the top; only replace the body description):

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add Prototype/V2/README.md Prototype/V2/src/App.css 2>/dev/null
git commit -m "V2: clean up demo cruft + README pointers"
```

---

### Task 27: Acceptance run against spec §9 + final type/lint/test

**No files — verification only.**

Walk every acceptance criterion from the spec and confirm by hand. Then run the full type/test suite.

- [ ] **Step 1: Run typecheck, lint, tests**

```bash
cd Prototype/V2 && bunx tsc --noEmit && bun run lint && bun run test
```

Expected: all green. If lint complains about anything, fix it.

- [ ] **Step 2: Manual acceptance against spec §9**

Boot dev server and check each:

```bash
cd Prototype/V2 && bun run dev
```

Verify in the browser:

- [ ] V2 boots and is visually distinct from V1 (Okta colors, dark rail).
- [ ] Landing on `/` shows the Alerts dashboard with the Lab drawer open.
- [ ] Picking any of the 5 scenarios and clicking `Send to ATI` reveals both classifier outputs with probabilities (ML) / confidence (LLM) and ground-truth check, then closes the drawer and adds a new alert at the top of the list (except for the Normal scenario, which correctly adds no alert).
- [ ] Alert detail pane shows: deterministic evidence chain, 10-min timeline, cross-app context with AWS/GCP/Azure chips, identity card, recommended tier, audit footer with no probability shown.
- [ ] Agents page shows the directory with a Shadow AI filter; at least one agent is flagged as shadow.
- [ ] `ClassifierService` interface exists and `ReplayClassifier` is the only implementation; no Azure calls anywhere (`grep -R 'azure\\|openai\\|fetch(' Prototype/V2/src` → only matches in test-mock comments).
- [ ] `Prototype/V1/` is untouched (`git diff main -- Prototype/V1/` → empty).

Stop the dev server.

- [ ] **Step 3: Final commit if anything moved**

```bash
git status
# if clean, you're done; otherwise:
git add -p && git commit -m "V2: acceptance fixes"
```

---

## Self-review (planner notes — not for the engineer)

Spec coverage:
- §1 goals/non-goals — covered by Tasks 1–27.
- §2 app structure (4 routes + drawer-on-land) — Tasks 11–13, 17.
- §3 visual identity — Task 2 (tokens), Tasks 11/12 (shell), Task 18 (chips).
- §4 alerts page (list + detail with 7 sub-sections) — Tasks 18, 19, 20, 21, 22.
- §5 agents page (directory + shadow filter + detail) — Tasks 8, 23, 24, 25.
- §6 Scenario Lab (replay + drawer behavior) — Tasks 3, 4, 5, 10, 14, 15, 16, 17.
- §7 architecture (ClassifierService, file layout) — Tasks 5, 9, 10, plus structure across the plan.
- §8 out of scope — respected throughout (no proxy, no persistence, no real cloud).
- §9 acceptance criteria — Task 27.

Type consistency check: `Tier`, `Enforcement`, `ClassifierResult`/`NanoResult`/`MLResult`, `ModelName`, `Alert`, `Agent`, `LabScenario` — all defined once in the indicated tasks and re-imported consistently across later tasks.

No placeholder text left in the plan.
