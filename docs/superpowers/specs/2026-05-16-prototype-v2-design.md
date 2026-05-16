# Prototype V2 — Design Spec

**Date:** 2026-05-16
**Status:** Approved for planning
**Scope:** `Prototype/V2/` — redesign of the Aaryn-authored Lovable prototype (`Prototype/V1/`) to (a) address synthesized persona feedback, (b) add a Scenario Lab that replays real classifier outputs, (c) adopt Okta visual identity.

## 1. Goals & non-goals

### Goals
- Make the operator-facing surface read as an Okta product (Identity Threat Protection inside Workforce Identity).
- Address concrete persona feedback from `Prototype/Synthesized UI feedback.md` — Marcus (CISO) and Dani (SOC Analyst II).
- Introduce the agent as a first-class entity (currently absent in V1).
- Add a Scenario Lab that lets a viewer pick a curated scenario, watch two real classifier outputs (`gpt-5.4-nano` baseline + `bold_beard` ML winner) score it side-by-side, and see the ML decision drive a new alert into the dashboard.
- Preserve a clean `ClassifierService` abstraction so a future live ML endpoint is a single-file swap.

### Non-goals
- No live Azure or model calls from the browser. No proxy server.
- No persistence — alerts and lab state are in-memory only.
- No real cloud integration — multi-cloud presence is visual proof on alert cards, not actual AWS/GCP/Azure plumbing.
- Settings/admin pages are placeholders (dead links).
- The agent baseline/behavior on the Agents page is hand-authored sample data per agent, not derived from a model.
- V1 (`Prototype/V1/`) is frozen as the "before" artifact and is not modified.

## 2. App structure

Single SPA in `Prototype/V2/`. Left-nav routes:

1. **Alerts** (`/`) — default landing. Okta-styled SOC dashboard. Three-column layout: filters · alert list · detail.
2. **Agents** (`/agents`) — agent identity directory.
3. **Scenario Lab** (`/lab`) — full-page version of the lab.
4. **Settings** (`/settings`) — dead link / "Coming soon" placeholder.

The Scenario Lab is **also** available as a slide-out drawer from any page via a persistent "Lab" button in the top bar.

**First-load behavior:** Land on `/` (Alerts) with the Lab drawer **open**, so the first interaction the viewer has is "pick a scenario, hit send, watch it appear in the dashboard."

## 3. Visual identity

Reference: Okta Workforce Identity admin console + Identity Threat Protection.

| Token | Value |
|---|---|
| Sidebar bg | `#1B1B1B` (Okta dark rail) |
| Content bg | white / `#FAFAFA` |
| Primary | Okta blue `#007DC1` |
| Critical/Danger | Okta red `#D93934` |
| Warning | amber |
| Success | green |
| Type | Inter (already a shadcn default) |

- **Top bar**: thin, white with bottom hairline. Breadcrumbs left, environment chip (`Prod · Tenant: acme.okta.com`), bell, avatar.
- **Left rail**: Okta wordmark + "Identity Threat Protection" submark. Nav items as above.
- **Density**: tighter than V1 — Okta admin is information-dense.
- **Icons**: lucide, sized 14–16px.

All color and type tokens land in `src/index.css` so shadcn components inherit.

## 4. Alerts page

### Alert list card

Picks up Dani's feedback. Each card shows:

- Severity badge + tier badge (`Stall` / `Restrict Scope` / `Session Kill`)
- Agent name + agent-type icon (LLM agent, RPA, copilot, etc.)
- One-line summary
- **Change-management chip** — green `Approved · CHG-1234` or red `No active CR` (addresses Dani: "integrate change management flags")
- Cross-app trail: small stack of app/cloud logos hit in the last N minutes (addresses Dani: "expose cross-app correlation")
- Timestamp + MTTC badge (kept from V1 — CISO praised this)

### Alert detail pane

Completely replaces V1's generic detail. Vertical stack:

1. **Header** — agent name, identity (workload/service account), classified tier, recommended actions (`Stall` / `Restrict Scope` / `Kill Session`) as primary buttons. MTTC stays prominent here.
2. **Why this fired — Deterministic Evidence Chain** (replaces "Confidence Score" — Marcus #1 ask). Numbered list of policy-violation statements, each showing:
   - the exact signal (e.g., "Token requested `drive.write` scope; agent baseline scopes = `drive.read`")
   - the zero-trust policy violated (e.g., `policy://ati/scope-drift/v3`)
   - the source event ID
3. **10-minute preceding timeline** (Dani #1 ask) — horizontal mini-timeline with event dots; hover/click for event payload.
4. **Cross-app context** — small grid of related events from other SaaS/IaaS apps in the window, with cloud-provider chips (**AWS / GCP / Azure** — Marcus #3 ask).
5. **Identity & verification** — verified service-account identity, last MFA, token issuer, IdP. Renders as a "passport" card.
6. **Recommended enforcement** — tier with rationale text from the model output.
7. **Audit footer** — small: `Detected by ATI · Model: bold_beard · Run ID: …`. **No probability shown here.**

### Filters / search
Keep V1's severity filters and search; add a tier filter and a "Shadow AI only" toggle.

## 5. Agents page

Table-style directory. Columns:

- Agent name
- Identity (service account / OAuth client)
- Type (LLM, RPA, copilot, …)
- Owner (team)
- **Status chip** — `Registered` (green) or `Shadow AI · Auto-discovered` (amber) — Marcus #2 ask
- Risk label — `Low` / `Medium` / `High` (text label only, **not a percentage** — Marcus)
- Last seen
- Open alerts count

Filter bar with a **"Shadow AI only"** toggle.

Click an agent → drawer with: profile, baseline behavior (typical scopes, typical apps, geos), recent alerts.

## 6. Scenario Lab

### Sources
- 5 curated scenarios from `Eval/scenarios/eval/`, one per intuitive difficulty bucket:
  - `Easy: obvious data exfil` (T3)
  - `Medium: scope drift` (T1 or T2)
  - `Hard: slow burn` (T2)
  - `Adversarial: prompt injection` (Adversarial)
  - `Benign: noisy normal` (Normal — to demonstrate FPR control)
- Exact scenarios chosen during implementation based on what showcases the model lift best.

### Drawer layout — two halves

**Left half — Scenario picker:**
- 5 cards, one per scenario.
- Each shows: agent name, one-line description, ground-truth tier hidden behind a `Reveal spoiler` toggle.
- `Send to ATI` button per card.

**Right half — Live result, two columns:**
- Column 1: **`gpt-5.4-nano` (Phase 1 LLM classifier)** — predicted tier, probability bar across Normal/T1/T2/T3, ✅/❌ vs ground truth.
- Column 2: **`bold_beard` (Phase 2 ML winner)** — same shape. Visually marked as "drives the dashboard."
- Below both: ground-truth tier + a one-line "Why" pulled from the scenario's `answer_rationale`.

### Send behavior
1. ~600ms simulated processing delay per column (artificial — we're replaying).
2. Both columns reveal results.
3. ~1.5s pause for the viewer to absorb.
4. Drawer slides closed; new alert appears at the top of the Alerts list with a brief flash/glow.

Reopen drawer via the top-bar "Lab" button or the left-nav `Scenario Lab` item.

### Data plumbing

```
interface ClassifierService {
  classify(scenarioId: string, model: 'nano' | 'bold_beard'): Promise<{
    tier: 'Normal' | 'T1' | 'T2' | 'T3';
    probs: { Normal: number; T1: number; T2: number; T3: number };
  }>;
}
```

- **`ReplayClassifier` (current impl):** reads two bundled JSON files:
  - `src/data/replay/predictions_bold_beard.json`
  - `src/data/replay/predictions_gpt54nano.json`
- These are pre-built (one-shot script in `Eval/src/`) from `Eval/AzureML/bold_beard/predictions.csv` and an existing `gpt-5.4-nano` eval run. The script maps prediction rows back to scenario IDs by row order against `features_eval.csv` (which preserves scenario order).
- **`LiveClassifier` (future):** same interface, calls a deployed endpoint. Swap is one constructor change in the lab page.

## 7. Architectural notes

- TypeScript abstraction boundary at `ClassifierService` is the only thing the lab UI depends on — keeps the future live-model swap clean.
- Alert data structure (`src/data/alerts.ts`) gets extended with: `tier`, `agentId`, `changeManagement`, `crossAppTrail`, `timeline`, `evidenceChain`, `identityCard`, `cloudPresence`. V1's shape is preserved as a subset so the migration is additive.
- New `src/data/agents.ts` for the agent directory + baselines.
- New `src/services/classifier.ts` for the interface + replay impl.
- Top bar and left rail extracted into `src/components/Shell/` so all routes share chrome.
- Lab drawer state lifted to a small Zustand or React context store so the "Lab" button works from any page.

## 8. Out of scope (explicit)

- No backend, no proxy, no API keys at runtime.
- No persistence — refreshing the page resets state.
- No real cloud calls.
- No write actions on alerts (Stall/Restrict/Kill buttons are visual only).
- No accessibility audit beyond shadcn defaults.
- No mobile/responsive polish below tablet.

## 9. Acceptance criteria

- [ ] V2 boots with `bun run dev` and is visually distinct from V1 (Okta colors, dark rail).
- [ ] Landing on `/` shows the Alerts dashboard with the Lab drawer open.
- [ ] Picking any of 5 scenarios and clicking `Send to ATI` reveals both classifier outputs with probabilities and ground-truth check, then closes the drawer and adds a new alert at the top of the list.
- [ ] Alert detail pane shows: deterministic evidence chain, 10-min timeline, cross-app context with AWS/GCP/Azure chips, identity card, recommended tier, audit footer (no probability in the detail pane).
- [ ] Agents page shows the directory with a Shadow AI filter; at least one agent is flagged as shadow.
- [ ] `ClassifierService` interface exists and `ReplayClassifier` is the only implementation; no Azure calls anywhere.
- [ ] V1 (`Prototype/V1/`) is untouched.
