## Company Context

Okta is the leading vendor-neutral identity platform, securing human, machine, and AI identities across 8,200+ app integrations. Workforce Identity handles authentication, authorization, lifecycle management, and governance for enterprises. The platform's core differentiator is its Universal Directory and integration network, which creates a single-source, multi-cloud, app-agnostic policy enforcement layer.

## The Problem

AI agents are proliferating across enterprises faster than security infrastructure can keep up. Non-human identities outnumber human identities 144:1, ~70% of knowledge workers bring unsanctioned AI tools into the workplace, and only 10% of companies have a strategy for governing agents. IT teams face a binary choice: let agents run ungoverned (shadow AI risk, compliance exposure) or block them entirely (productivity loss, competitive disadvantage). Neither is acceptable.

Security teams cannot answer three fundamental questions: which agents exist in their environment, what those agents can connect to, and what they are actually doing.

## Strategic Positioning

Okta is uniquely positioned as the vendor-agnostic broker mediating agent-to-app authorization across thousands of enterprises. Microsoft Entra governs agents within its own ecosystem but has limited cross-platform visibility; CrowdStrike and Cisco see endpoints and execution layers but not identity-layer agent behavior across apps; point solutions like Zenity lack Okta's integration network and aggregate data position. Okta governs agents across all ecosystems, giving it access to a proprietary dataset no competitor can replicate: agent authorization decisions, permission grants, scope usage, and behavioral patterns across applications, AI platforms, and its entire customer base.

The Cross App Access (XAA) protocol, Okta's open extension of OAuth for agent-to-app authorization, is the mechanism that drives agent traffic through the identity layer. Broader XAA adoption feeds more behavioral data into the platform, which improves threat detection, which increases platform value — a self-reinforcing flywheel.

## The Product: Agentic Threat Intelligence

A new feature within Identity Threat Protection that transforms Okta's unique data position into a predictive security product.
### Core Capabilities

- **Cross-application behavioral monitoring**: Continuous observation of registered AI agent activity across all connected applications — not siloed per-app, but correlated across the full environment.
- **Predictive anomaly detection**: Models trained on Okta's aggregate cross-customer dataset identify threats before they become incidents — agents gradually escalating scope, accessing data outside historical norms, or behaving inconsistently with their registered purpose.
- **Automated enforcement**: Throttle, restrict scope, or terminate agent sessions via Universal Logout when risk thresholds are breached. The system acts at machine speed to match agent speed.
- **Real-time dashboard**: Gives security teams visibility into agent activity, risk levels, recommended actions, and value-add outcomes (threats mediated, incidents prevented). Designed to surface the right signal at the right time — high-confidence, contextually rich detections, not alert noise.

### Why This Is Buildable

The underlying infrastructure already exists: ISPM (discovery), ITP (threat protection), Universal Logout (enforcement), Universal Directory (agent registry). The new investment is in behavioral pattern modeling for agent-specific activity and ML models trained on Okta's aggregate dataset.

## Target Customer

Mid-to-large enterprises (5,000+ employees) running multi-cloud environments with active or planned agentic AI deployments. Primary buyer is the CISO / IT decision-maker. Developer experience matters as an adoption accelerant for XAA integration, but the purchase decision is top-down.

Sharpest segment: regulated industries (financial services, healthcare, government) where security teams are most likely to block AI entirely without governance infrastructure.

## Value Proposition

Okta enables the CISO to say yes to AI adoption — not by removing risk, but by making risk visible, measurable, and enforceable across all agent platforms. The positioning shifts Okta from security cost center to productivity enabler.

## Success Signals

- Fortune 1000 market penetration among companies deploying agents
- Total agent identities under management on the platform
- Agent-related threat detections that demonstrate model quality improving with scale (proving the data flywheel)
- Regulated-industry customers citing Okta governance as the reason they greenlighted agent deployments
- XAA achieving broad ISV adoption

## Key Risks

- **Data flywheel dependency**: If XAA adoption and agent registration don't reach sufficient scale, behavioral models lack the training data to deliver high-confidence detections, and the product becomes another noisy alert tool.
- **Microsoft expansion**: XAA is open source — Microsoft could adopt it, expand Entra Agent ID to third-party agents, and undercut Okta's neutrality positioning.
- **Trust deficit**: The 2023 breach damaged credibility with the exact buyer persona this product targets. Okta must deliver in the AI identity space to rebuild trust.