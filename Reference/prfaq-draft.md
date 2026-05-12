# PR-FAQ: Okta Agentic Threat Intelligence

Matarrese, O'Quinn | May 2026

---

## Press Release

**Okta wants to be the reason your company stops blocking AI agents**

*The Verge · May 2026*

Rachel Torres spent the first three months of 2026 saying no. As Director of Security Operations at Meridian Capital Group, a mid-sized investment firm running infrastructure across AWS, Azure, and Google Cloud, Torres was the person who had to decide whether the company's growing fleet of AI agents — tools that could draft compliance reports, pull portfolio data, and automate client onboarding — were safe to let loose.

She kept saying no. "We had engineers spinning up agents on three different platforms. Salesforce agents talking to our CRM, Copilot agents pulling data from SharePoint, custom agents built on Anthropic hitting our internal APIs," Torres said. "I had no way to know which agents existed, what data they were touching, or whether any of them were overprivileged. So I shut it all down."

Torres isn't alone. As AI agents flood the enterprise, security teams are facing an impossible binary: let agents run ungoverned, creating shadow IT risks and compliance exposure, or block them entirely and watch competitors pull ahead. A recent industry survey found that 70% of knowledge workers are bringing their own AI tools into the workplace regardless of policy, and non-human identities now outnumber human ones 144 to 1 across the average enterprise.

Okta thinks it has a fix. The company, best known for the login screen that gates access to your company's apps, is launching Agentic Threat Intelligence — a real-time monitoring and response layer that gives security teams continuous visibility into what AI agents are doing across every application they touch. It's the centerpiece of Okta's broader push to become the identity and governance platform for the agentic era, not just for human employees, but for the autonomous software that increasingly works alongside them.

"The pitch to the CISO is simple," said Arnab Bose, Okta's Chief Product Officer. "You don't have to choose between security and productivity anymore. You can see every agent, understand what it's doing, and enforce policy in real time — across every cloud and every AI platform your organization uses."

The product works like this: Okta's integration network, which already connects to over 8,200 enterprise applications, now extends to AI agent platforms including Anthropic, Google Vertex, Salesforce Agentforce, and Microsoft Copilot Studio. When an agent is registered (or discovered running unregistered), Okta monitors its authorization requests, data access patterns, and cross-application behavior. If an agent starts behaving anomalously — say, a compliance-reporting agent suddenly starts accessing client PII it's never touched before, or an onboarding agent makes an unusual volume of API calls at 2 AM — the system flags it, assigns a risk score, and recommends an action: monitor, throttle, restrict scope, or kill the session.

What makes this more than another alert dashboard, Okta argues, is the data underneath it. Because Okta sits between agents and applications as the authorization broker, it sees behavioral patterns across its entire customer base — millions of agent-to-app interactions across thousands of enterprises. The anomaly detection models are trained on that aggregate dataset, meaning a threat pattern identified at one company improves detection for every Okta customer. It's a flywheel: more agents monitored means better models, which means fewer false positives, which means more customers trust the system enough to register more agents.

"This is the play," said Maya Chandra, a security infrastructure analyst at Forrester. "Whoever owns the identity layer for AI agents owns the richest behavioral dataset in enterprise security. Okta is betting that being vendor-neutral — sitting across all the AI platforms rather than being locked into one — gives them a data advantage nobody else can replicate. It's a bold bet, but the logic is sound."

For Torres at Meridian, the product changed the conversation. Within six weeks of deploying Agentic Threat Intelligence, her team had catalogued 247 agents running across the firm's infrastructure — 80 more than anyone in IT knew about. Fourteen were flagged as overprivileged. Three were accessing data they had no business touching.

"The one that got me was a portfolio analysis agent that had been granted write access to our client records database," Torres said. "Nobody had approved that. It was a permissions error during setup that nobody caught because nobody was watching. Okta caught it on day two."

Torres has since approved 193 agents for production use, up from zero. Her team reviews the threat intelligence dashboard every morning, the same way they review their SIEM alerts. "I went from being the person who blocked AI to the person who enabled it," she said. "That's a much better job."

---

## Frequently Asked Questions

### Customer-Facing

**Q1: How is Agentic Threat Intelligence different from our existing SIEM or XDR?**

SIEM and XDR tools monitor infrastructure events — network traffic, endpoint behavior, log anomalies. They see *what happened* at the system level. Agentic Threat Intelligence monitors at the identity layer — it sees *who* (which agent) did *what* (which actions) across *which applications* (cross-app behavioral context). A SIEM might flag unusual API traffic. Okta can tell you that the traffic came from a specific Salesforce agent that was provisioned by an engineer in the London office, that the agent was accessing resources outside its approved scope, and that the same behavioral pattern was flagged as malicious across three other Okta customers last week. The two systems are complementary, not competitive — Okta feeds enriched identity context into your existing SIEM.

**Q2: Which AI agent platforms are supported?**

At launch, Agentic Threat Intelligence supports agents built on Anthropic (Claude), Google Vertex AI, Salesforce Agentforce, Microsoft Copilot Studio, and custom agents using the Cross App Access (XAA) protocol. Support for additional platforms is driven by Okta Integration Network (OIN) partnerships, with new integrations shipping quarterly. The XAA protocol is open source, meaning any agent platform can implement native Okta governance without waiting for a bespoke integration.

**Q3: Does this require agents to be pre-registered with Okta?**

No. The system has two modes: governed agents that are registered and assigned identity policies, and discovered agents that Okta detects operating in the environment without formal registration. Discovered agents are automatically flagged for IT review and can be retroactively registered or blocked. This is critical for addressing shadow AI — the 70% of knowledge workers who bring their own AI tools without IT's knowledge.

**Q4: What happens when the system flags an agent? Does it automatically shut it down?**

By default, the system recommends actions but does not auto-enforce. Security teams see the alert, the risk score, the behavioral evidence, and a recommended response (monitor, throttle, restrict scope, or terminate session). Organizations can configure auto-enforcement policies for high-severity detections — for example, automatically restricting scope for any agent that accesses data outside its approved permissions — but the default is human-in-the-loop triage. We believe security teams should build trust with the system before enabling full automation.

**Q5: How does Okta handle data privacy if the anomaly detection models are trained on cross-customer data?**

The models are trained on anonymized, aggregate behavioral patterns — not on raw customer data. Okta never exposes one customer's agent activity to another. The training data consists of abstracted pattern signatures: "an agent of type X accessing resource category Y at frequency Z is anomalous." Individual customer data, agent identities, application names, and user information are never included in the training set. This approach is consistent with how Okta's existing Identity Threat Protection processes signals across its customer base today.

**Q6: How long does implementation take, and what does it require from our team?**

For organizations already on Okta Workforce Identity, Agentic Threat Intelligence is activated as a module within the existing admin console. Agent discovery begins immediately — the system starts identifying agents operating across connected applications without requiring any agent-side configuration. Full deployment, including custom policy configuration, alert routing to existing SIEM/SOAR workflows, and team onboarding, typically takes 2-4 weeks. There is no requirement to modify existing agents or applications. The product reads authorization telemetry that Okta already processes; it layers intelligence on top of data flows that are already in place.

**Q7: What compliance and audit capabilities does this provide?**

Every agent action, anomaly detection, triage decision, and enforcement action is logged with full attribution and timestamp. The audit trail is exportable and structured to support SOC 2, ISO 27001, HIPAA, and financial services regulatory frameworks (SEC, FINRA, OCC). For regulated industries, the ability to demonstrate continuous monitoring and governance of autonomous AI systems is increasingly becoming a compliance requirement, not a nice-to-have. The system also maintains a complete inventory of all discovered and registered agents, their permission scopes, and their behavioral history — which is rapidly becoming a standard ask from auditors evaluating AI risk.

**Q8: What's the detection latency? How quickly does the system flag anomalous behavior?**

Detection operates in near-real-time on the authorization event stream. When an agent makes an authorization request through Okta, the system evaluates it against the agent's behavioral baseline and cross-customer pattern library before the session completes. P50 detection latency is under 500ms; P95 is under 2 seconds. For pre-configured auto-enforcement policies (e.g., automatically restricting scope on out-of-bounds access), the enforcement action executes inline with the authorization flow. For human-in-the-loop triage, the alert surfaces in the dashboard within seconds of detection.

**Q9: Can we customize detection rules, or are we locked into Okta's models?**

Both. The system ships with Okta's baseline detection models trained on the cross-customer behavioral dataset, which cover the most common anomaly patterns (scope violations, unusual access frequency, off-hours activity, cross-app lateral movement). On top of that, security teams can define custom detection rules specific to their environment — for example, flagging any agent that accesses a particular database, or any agent provisioned by a specific team that operates outside business hours. Custom rules and Okta's models run in parallel; alerts from either source surface in the same dashboard and triage workflow.

### Strategic / Internal

**Q10: Why build this as a new product rather than extending Identity Threat Protection (ITP)?**

ITP was architected for human identity threats — credential compromise, session hijacking, phishing-driven account takeover. Agent threats are structurally different: agents don't have passwords to steal, they don't get phished, and their behavioral baselines look nothing like human users. An agent making 500 API calls in an hour might be perfectly normal; a human doing the same thing is a red flag. The detection models, the risk scoring framework, and the response actions all need to be purpose-built for non-human identity patterns. Extending ITP would mean retrofitting human-centric assumptions onto a fundamentally different problem space.

**Q11: What if Microsoft builds this into Entra?**

Microsoft will likely build strong agent governance for Microsoft-native agents — Copilot Studio agents interacting with M365 and Azure resources. That's a natural extension of Entra Agent ID. The gap Microsoft cannot close is cross-platform visibility. A company running Salesforce agents, Anthropic agents, and Copilot agents doesn't get a unified behavioral picture from Entra — they get Microsoft's slice. Okta's value is the full picture. As long as enterprises remain multi-cloud and multi-vendor for AI (and 92% currently run multi-cloud strategies), there is a structural need for a vendor-neutral governance layer. Microsoft's incentive is to keep customers in the Microsoft ecosystem. Okta's incentive is to work everywhere.

**Q12: What's the risk if XAA adoption stalls?**

XAA is the protocol that makes cross-platform agent governance scalable, but Agentic Threat Intelligence doesn't require universal XAA adoption to deliver value. Agents on platforms with existing OIN integrations (Salesforce, Google Vertex, etc.) are monitored through those integrations today. XAA expands the addressable surface to any platform that implements the protocol, which accelerates the data flywheel. If XAA adoption is slower than projected, the product still works — it just works across fewer platforms, and the behavioral models train on a narrower dataset. The risk is not product failure; it's slower compounding of the data advantage.

**Q13: How do you handle false positives without burning out the SOC team?**

This is the hardest problem in security tooling and the primary reason we're investing in the cross-customer behavioral dataset. The more agents Okta monitors across its customer base, the better the models get at distinguishing genuinely anomalous behavior from normal agent activity patterns. Early deployments will inevitably produce more noise. Our approach is to ship with conservative default thresholds (minimizing false positives at the cost of potentially missing some true positives), let customers tune sensitivity based on their risk tolerance, and continuously improve the models as the aggregate dataset grows. The target is a false positive rate below 2% for stall-and-escalate actions and below 0.1% for automated enforcement actions within the first year of GA.

**Q14: What are the SMART metrics for this product?**

Primary success metric: 25% of Okta Workforce Identity enterprise customers (5,000+ employee orgs) have activated Agentic Threat Intelligence within 12 months of GA launch. Secondary metrics: median time from agent anomaly detection to initial containment action (stall/restrict) under 5 minutes, representing a 50% reduction versus manual investigation workflows; net promoter score among security operations users above 40 within the first two quarters; false positive rate on stall-and-escalate actions below 2% by month 6. Guardrail metrics: Okta platform latency does not increase by more than 50ms at P95 for standard authentication flows; customer support ticket volume related to false positives does not exceed 3% of active ATI deployments per month.

**Q15: What's the growth model? How does adoption compound?**

The growth model has three layers. First, land: sell ATI as an add-on to existing Workforce Identity enterprise customers through the existing sales motion. The buyer is the same CISO/security leadership team. Second, expand: as customers deploy more agents (which is inevitable — agent adoption is accelerating across every enterprise), per-agent pricing means revenue grows without additional sales effort. Third, flywheel: every new customer's agent telemetry improves the detection models, which reduces false positives, which makes the product more compelling for the next customer. The North Star metric is total agents monitored across the platform, because that number drives both revenue (usage pricing) and product quality (model accuracy). Growth hacking lever: offering a free 30-day agent discovery scan (no detection, just inventory) that shows CISOs how many ungoverned agents are already operating. This is the "247 agents, 80 unknown" moment that converts prospects.

**Q16: What does this mean for Okta's business model?**

Agentic Threat Intelligence is a premium add-on to Okta Workforce Identity, priced per monitored agent. This creates a usage-based revenue stream that scales with AI adoption — as customers deploy more agents, they pay more for governance. It also deepens platform stickiness: once a customer's security workflows depend on Okta's behavioral models and cross-app visibility, switching costs are substantial. The feature targets the same buyer (CISO / security leadership) but shifts the conversation from "access management cost" to "AI enablement investment," which changes procurement dynamics and budget allocation.

**Q17: What engineering investment is required, and what's the team structure?**

The core team is approximately 15-20 engineers across three workstreams: the agent telemetry pipeline (ingestion, normalization, and storage of cross-platform agent behavioral data), the detection engine (ML models, rule evaluation, risk scoring), and the product surface (dashboard, alert workflow, triage UX, SIEM integrations). The telemetry pipeline leverages existing Okta infrastructure for identity event processing — this is not a greenfield data platform build. The detection engine is the primary new investment and requires ML engineering talent with security domain expertise. Estimated time to GA from project kickoff is 9-12 months, with a limited beta at month 6 targeting 20-30 design partners.

**Q18: Does this cannibalize existing Okta products?**

No. Agentic Threat Intelligence is additive to the Workforce Identity platform. It requires Workforce Identity as a prerequisite (agents must authenticate through Okta for the system to monitor them), so it reinforces rather than displaces the core platform. There is potential overlap with Identity Threat Protection in edge cases where an agent's behavior triggers both human-identity and agent-identity detection rules, but the products are architecturally distinct and target different threat models. If anything, ATI increases the strategic value of the Workforce Identity platform by adding a reason for customers to consolidate agent governance through Okta rather than adopting point solutions.

**Q19: How do you handle the cold start problem? The models need data, but early customers have the least data.**

Early customers get value from two sources before the cross-customer models mature. First, rule-based detections work from day one — scope violations, unauthorized access patterns, and permission anomalies don't require ML models. They're deterministic checks against the agent's registered permissions and policies. Second, Okta's existing Identity Threat Protection already processes billions of identity events across its customer base. The behavioral baselines for "normal" application access patterns (even for human users) provide a meaningful starting point for agent anomaly detection. The ML models improve the system over time, but the product is useful without them.

**Q20: What's the biggest risk to this strategy?**

Trust. Okta is asking enterprises to route their most sensitive AI governance decisions through a platform that suffered a significant security breach in 2023. The product strategy is sound, but execution has to be flawless — any incident involving the Agentic Threat Intelligence infrastructure would confirm the market's worst fears. This is why we're launching with human-in-the-loop as the default and building toward automation gradually. We need to earn trust before we ask for it.

**Q21: Why launch now instead of waiting for the agentic market to mature?**

The data flywheel advantage compounds over time. Every month of agent behavioral data Okta collects that competitors don't is a month of model training they can't replicate. If we wait for the market to consolidate around standards and platforms, we lose the first-mover advantage on the dataset that makes this product defensible. The market for agent governance is forming right now — enterprises are making buy decisions in 2026 that will lock in for years. Being early with a good product beats being late with a perfect one.

**Q22: What's the go-to-market strategy?**

Three motions. First, existing enterprise accounts: the sales team already has relationships with CISOs and security leadership at Okta's largest customers. ATI is a natural upsell conversation in quarterly business reviews, especially for customers who have already expressed concern about AI governance. Second, design partner program: 20-30 customers in the beta program get early access in exchange for feedback, case studies, and co-development of detection rules for their industry verticals. These become the reference customers for GA launch. Third, category creation: Okta needs to establish "Agentic Threat Intelligence" as a recognized product category through analyst briefings (Gartner, Forrester), conference keynotes (RSA, Oktane), and thought leadership. The goal is to be the defining vendor in this space before competitors frame the category on their terms.

**Q23: What are we intentionally not building in v1, and why?**

V1 does not include: automated agent provisioning or lifecycle management (that's a separate product motion and adds complexity that distracts from the core monitoring value prop); integration with non-Okta identity providers (customers must use Okta Workforce Identity as their agent identity layer); predictive threat modeling (v1 is reactive/detective — identifying anomalies as they occur rather than predicting them before they happen); or multi-tenant management for MSPs and MSSPs. Each of these is a plausible v2 or v3 feature, but shipping them in v1 would delay launch by 6+ months and dilute the core value proposition: see your agents, understand the risks, act fast.
