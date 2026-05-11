
Matarrese | April 27, 2026
## Pre-experiment Write-up

### 0.0 Overview

Okta's Agentic Threat Intelligence module monitors AI agent behavior across applications and surfaces anomaly detections to SOC analysts. Today, all enforcement requires manual analyst intervention. Agents operate as fast as the machine can process, while human response runs on a minutes-to-hours timescale. This experiment tests whether tiered automated enforcement reduces mean time to initial containment (MTTIC) without unacceptable disruption to legitimate production workflows.

### 1.1 Experiment Duration

**TOTAL DURATION: 60 days**, timed to span a fiscal quarter boundary with at least 20 days on each side (e.g., start June 10, end August 8). This ensures the experiment captures both quarter-end behavior (audit activity, compliance deadlines, elevated SOC workloads) and quarter-beginning behavior (new agent deployments, policy resets), preventing results from being skewed by a single operational frame. A 7-day baseline calibration window prior to experiment start establishes control-group MTTIC benchmarks so the 50% reduction target is measured against observed performance, not an assumption.

Only tenants with 50+ registered agents and 1,000+ daily agent actions are eligible, ensuring each tenant generates sufficient anomaly events for significance. Duration is set by expected event rate and the quarter-spanning requirement, not arbitrary selection.

### 1.2 What is Changing for the Customer?

**C (Control): Manual Triage.** The dashboard displays anomaly alerts with risk scores and recommended actions. All enforcement requires manual analyst intervention. This reflects the current SOC workflow and standard of care.

**T1 (Full Auto-Enforcement): System-Initiated Tiered Response.** The system automatically takes containment action when anomalies are detected, calibrated across three enforcement tiers. 
- **Tier 1 (Stall)** pauses the flagged action mid-execution pending analyst review, keeping the session alive; used for medium-confidence detections. 
- **Tier 2 (Scope Restriction)** dynamically narrows the agent's permissions, removing access to applications involved in the cross-app anomaly while allowing current work to complete; used for high-confidence, cross-app detections. 
- **Tier 3 (Session Kill)** terminates the session via Universal Logout; reserved for high-severity, high-confidence detections matching known attack signatures. Analysts review all automated actions after the fact and can override.

**T2 (Hybrid): Context-Sensitive Enforcement.** Defaults to Tier 1 (stall) on all detections above the confidence threshold. Auto-escalates to Tier 2 or 3 only on high-confidence, low-context detections (credential anomalies, explicit scope violations, known attack patterns). Detections requiring organizational context, such as unusual but potentially legitimate behavioral patterns, are held at stall with enriched context for the analyst. This design reflects the reality that automated systems are reliably strong at pattern-matched, context-independent detections but weaker at judgments requiring org-specific knowledge of what "normal" looks like for a given workflow. The hybrid model automates where the system is reliably correct and escalates where human judgment adds value.

### 1.3 Why is this better for the Customer?

Today, SOC teams face a binary choice when an agent is flagged: investigate manually (slow, but preserves workflow continuity) or kill the agent preemptively (fast, but disruptive). The stall mechanism introduces a third option. Instead of racing to investigate an active threat, the analyst reviews a frozen action with full cross-app context already assembled. The threat is contained but the agent isn't destroyed, so the analyst can release it if the detection was a false positive with zero production impact. This shifts the SOC team's posture from reactive firefighting to informed review, reducing alert fatigue and enabling faster, higher-quality decisions.

### 1.4 Key Metrics and Expected Changes

**MTTIC (Primary):** Time from detection to first enforcement action. Expect 50%+ reduction in T1 and T2 vs. C. The threshold is set at 50% rather than higher because MTTIC includes both instant automated stalls and events that route to human triage in T2; a 50% reduction represents cutting median containment from roughly 30 minutes (manual) to under 15 minutes (blended), the minimum improvement justifying the operational complexity of three enforcement tiers. T1 should show slightly lower MTTIC than T2 since it auto-escalates more aggressively.

**False Positive Enforcement Rate (by Tier):** Measured separately because a false positive stall is recoverable (analyst reviews, releases, work resumes) while a false positive kill disrupts production. Expect T1 to show higher Tier 2/3 false positive rates than T2 since T1 auto-escalates without org-context filtering.

**Operational Disruption Index:** Agent restart requests, workflow failure tickets, and SLA breaches caused by enforcement actions. Expect T1 to generate more disruption than T2; T2 should track close to C. Significant T2 elevation signals the hybrid model needs recalibration.

**Threat Escalation Rate:** Percentage of anomalies escalating to confirmed incidents before containment. Expect meaningful reduction in T1 and T2 vs. C.

### 1.5 Launch Criteria

**Main Objective:** T2 must achieve 50% MTTIC reduction vs. C.

**Guardrails:** False positive stall rate (Tier 1) below 2%. False positive kill rate (Tier 3) below 0.1%. Operational disruption must not increase more than 10% vs. C. No P0/P1 incidents caused by the enforcement mechanism itself.

### 1.6 Risks and Potential Impact

**Asymmetric risk exposure across groups.** Control group faces slower containment during the experiment. The control group will use a severity-based circuit breaker: high-severity threats detected without mitigating action within 5 minutes will escalate to Tier 3 regardless of group assignment to limit risk to the company. These events will be removed from the comparison data for the null hypothesis. However, if it fires frequently, it means manual triage can't keep up with high-severity events.

**Insufficient threat volume.** Real security incidents are sparse. The 60-day window and enrollment threshold are designed to ensure adequate volume, but the control group is especially vulnerable to low-N problems since containment timing depends on analyst availability. If volume is insufficient, we extend the window or supplement with red-team simulated attacks.

**False positive kills disrupting production.** Tier 3 against a legitimate agent could cause downstream failures and impact business operations. T2 mitigates by defaulting to stall; T1 carries this risk by design, which is part of what the experiment measures.

**Engineering investment.** Running three enforcement tiers in parallel requires building the stall and scope-restriction mechanisms (session kill already exists via Universal Logout), the circuit breaker override, and tier-level instrumentation. This is a significant engineering investment; exact timeline and cost depend on Okta's engineering velocity, team size, and codebase complexity, which would need to be assessed before committing to an experiment start date.

### 1.7 Randomization and Power Considerations

**Randomization unit:** Tenant-level. Agent permissions, security policies, and enforcement workflows are configured per-tenant; sub-tenant randomization would create cross-contamination. The tradeoff is a smaller effective sample size (N = number of eligible tenants, not agents or events).

**Enrollment criteria:** Only tenants with 50+ registered agents and 1,000+ daily actions are eligible. Results may not generalize to low-volume tenants, which is acceptable since those tenants are not the near-term target for automated enforcement.

**Power:** Statistical power depends on eligible tenant count, per-tenant event rate, and MTTIC variance. If the tenant pool is small (under 100 per group), the experiment may be underpowered for secondary metrics like tier-specific false positive rates. In that case, MTTIC remains the decision metric and tier-level analysis is treated as directional.

### 1.8 Pre-Registration Statement

This experiment tests a single primary hypothesis: tiered automated enforcement reduces MTTIC for agentic threats without net-negative operational impact. MTTIC is the sole decision metric. The 50% threshold and all guardrails are committed prior to data collection and will not be revised post-hoc. If the primary metric is met but a guardrail is breached, the result is a failure requiring recalibration. Tier-level breakdowns and off-hours vs. business-hours analyses are exploratory and will not influence the launch decision.