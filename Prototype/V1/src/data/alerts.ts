export type Severity = "low" | "medium" | "high" | "critical";
export type ActionType = "stall" | "restrict" | "terminate";

export interface Alert {
  id: string;
  agent: string;
  agentType: string;
  severity: Severity;
  confidence: number;
  title: string;
  explanation: string;
  reasons: string[];
  timestamp: string;
  apps: string[];
  recommendedAction: ActionType;
  recommendationReason: string;
  verified: boolean;
  telemetry: { ts: string; event: string; detail: string }[];
}

const now = Date.now();
const ago = (m: number) => new Date(now - m * 60_000).toISOString();

export const alerts: Alert[] = [
  {
    id: "AGT-1042",
    agent: "Salesforce Data Sync Agent",
    agentType: "Integration Agent",
    severity: "critical",
    confidence: 96,
    title: "Mass export of CRM records to unknown endpoint",
    explanation:
      "Agent initiated a bulk export of 42,318 contact records and attempted to POST them to an external endpoint not on the approved data egress list.",
    reasons: [
      "Volume is 38× the agent's 30-day baseline",
      "Destination domain registered 6 days ago",
      "Behavior occurred outside the agent's approved data flow policy",
    ],
    timestamp: ago(2),
    apps: ["Salesforce", "AWS S3"],
    recommendedAction: "terminate",
    recommendationReason:
      "High-volume exfiltration to an unverified destination meets the threshold for immediate session containment.",
    verified: true,
    telemetry: [
      { ts: ago(2), event: "data.export.bulk", detail: "42,318 records, object=Contact" },
      { ts: ago(2), event: "http.post", detail: "endpoint=api.unverified-host.io/ingest" },
      { ts: ago(3), event: "auth.token.refresh", detail: "scope=read:all" },
    ],
  },
  {
    id: "AGT-1041",
    agent: "Slack Triage Bot",
    agentType: "Workflow Agent",
    severity: "high",
    confidence: 88,
    title: "Cross-app access anomaly: 3 new apps in 2 minutes",
    explanation:
      "Agent acquired tokens for three applications outside its declared scope within a short window, including a financial system it has never accessed.",
    reasons: [
      "Accessed Snowflake, NetSuite, and Workday — none in approved scope",
      "Token requests issued in rapid sequence (< 90s apart)",
      "No corresponding user-driven trigger in upstream workflow",
    ],
    timestamp: ago(7),
    apps: ["Slack", "Snowflake", "Workday", "NetSuite"],
    recommendedAction: "restrict",
    recommendationReason:
      "Scope drift is significant but the agent supports active business workflows. Restrict to declared scope while preserving uptime.",
    verified: true,
    telemetry: [
      { ts: ago(7), event: "oauth.token.grant", detail: "app=Snowflake" },
      { ts: ago(8), event: "oauth.token.grant", detail: "app=Workday" },
      { ts: ago(8), event: "oauth.token.grant", detail: "app=NetSuite" },
    ],
  },
  {
    id: "AGT-1040",
    agent: "Finance Reconciliation Agent",
    agentType: "Autonomous Agent",
    severity: "high",
    confidence: 81,
    title: "Off-hours access to restricted GL accounts",
    explanation:
      "Agent queried general-ledger tables flagged as restricted at 03:14 UTC — well outside its operating window of 09:00–18:00 local.",
    reasons: [
      "Activity occurred 9 hours outside approved operating window",
      "Queried 4 tables tagged 'restricted-financial'",
      "No paired ticket or change request found",
    ],
    timestamp: ago(14),
    apps: ["Snowflake", "NetSuite"],
    recommendedAction: "restrict",
    recommendationReason:
      "Off-hours access to restricted data warrants scope reduction pending analyst review.",
    verified: true,
    telemetry: [
      { ts: ago(14), event: "sql.query", detail: "SELECT * FROM gl_journal_restricted" },
      { ts: ago(15), event: "session.start", detail: "ip=10.42.x.x, ua=agent-runtime/1.4" },
    ],
  },
  {
    id: "AGT-1039",
    agent: "Customer Support Copilot",
    agentType: "LLM Agent",
    severity: "medium",
    confidence: 72,
    title: "Unusual spike in API call volume",
    explanation:
      "Outbound API calls are at 14× baseline over the last 5 minutes. Pattern is consistent with retry storm but warrants verification.",
    reasons: [
      "Call rate exceeded 14× rolling baseline",
      "85% of calls returned 4xx — possible misconfigured prompt loop",
      "No correlated incident in upstream services",
    ],
    timestamp: ago(22),
    apps: ["Zendesk", "Slack"],
    recommendedAction: "stall",
    recommendationReason:
      "Pattern may be benign (retry loop). Stall pending quick analyst confirmation before scope changes.",
    verified: true,
    telemetry: [
      { ts: ago(22), event: "api.rate", detail: "1,420 req/min (baseline 100/min)" },
      { ts: ago(23), event: "api.error.4xx", detail: "85% error rate, ep=/tickets/search" },
    ],
  },
  {
    id: "AGT-1038",
    agent: "Marketing Asset Indexer",
    agentType: "Integration Agent",
    severity: "medium",
    confidence: 68,
    title: "Read access to engineering Drive folders",
    explanation:
      "Agent traversed three Google Drive folders owned by Engineering, including one labeled 'roadmap-confidential'.",
    reasons: [
      "Folders not in agent's content allow-list",
      "First-time access for these resources",
      "Agent has read-only scope — no writes observed",
    ],
    timestamp: ago(38),
    apps: ["Google Drive"],
    recommendedAction: "restrict",
    recommendationReason:
      "Restrict folder scope. Read-only nature means no immediate exfiltration risk.",
    verified: true,
    telemetry: [
      { ts: ago(38), event: "drive.file.list", detail: "folder=roadmap-confidential" },
      { ts: ago(39), event: "drive.file.read", detail: "file=Q3-plan.gdoc" },
    ],
  },
  {
    id: "AGT-1037",
    agent: "DevOps Build Agent",
    agentType: "CI/CD Agent",
    severity: "critical",
    confidence: 91,
    title: "Privileged role assumed in production AWS account",
    explanation:
      "Agent assumed a role with PowerUser permissions in the production AWS account. Its standard role is read-only in staging.",
    reasons: [
      "AssumeRole call to prod-poweruser is not in approved policy",
      "Source IP differs from declared CI runner range",
      "No active deploy ticket in change-management system",
    ],
    timestamp: ago(45),
    apps: ["AWS", "GitHub"],
    recommendedAction: "terminate",
    recommendationReason:
      "Privilege escalation to production with no change-record correlation. Immediate termination recommended.",
    verified: true,
    telemetry: [
      { ts: ago(45), event: "aws.sts.assumeRole", detail: "arn:aws:iam::prod:role/PowerUser" },
      { ts: ago(46), event: "session.ip", detail: "203.0.113.42 (outside CI range)" },
    ],
  },
  {
    id: "AGT-1036",
    agent: "Calendar Scheduling Agent",
    agentType: "Workflow Agent",
    severity: "low",
    confidence: 54,
    title: "Slightly elevated meeting-creation rate",
    explanation:
      "Agent is creating events at ~2× its 7-day baseline. Pattern aligns with quarter-end planning cadence.",
    reasons: [
      "2× baseline (well below alerting threshold)",
      "Pattern matches historical quarter-end activity",
      "No scope or access changes detected",
    ],
    timestamp: ago(63),
    apps: ["Google Calendar"],
    recommendedAction: "stall",
    recommendationReason:
      "Low confidence — likely benign seasonal behavior. Surface for awareness; analyst review before any action.",
    verified: false,
    telemetry: [
      { ts: ago(63), event: "calendar.event.create", detail: "rate=18/hr (baseline 9/hr)" },
    ],
  },
  {
    id: "AGT-1035",
    agent: "HR Onboarding Agent",
    agentType: "Autonomous Agent",
    severity: "high",
    confidence: 84,
    title: "Bulk provisioning attempt outside change window",
    explanation:
      "Agent attempted to provision 28 user accounts across 6 SaaS apps in a 4-minute window, outside the approved Tuesday/Thursday change windows.",
    reasons: [
      "Provisioning volume 6× normal batch size",
      "Activity outside approved change window",
      "Includes admin-tier role assignments in 2 apps",
    ],
    timestamp: ago(78),
    apps: ["Okta", "Salesforce", "Slack", "Google Workspace"],
    recommendedAction: "restrict",
    recommendationReason:
      "Restrict admin-tier provisioning capability while allowing standard onboarding to continue.",
    verified: true,
    telemetry: [
      { ts: ago(78), event: "scim.user.create", detail: "count=28, batch=onboard-2027-04" },
      { ts: ago(79), event: "role.assign", detail: "role=app-admin, app=Salesforce" },
    ],
  },
  {
    id: "AGT-1034",
    agent: "Data Lake ETL Agent",
    agentType: "Integration Agent",
    severity: "medium",
    confidence: 76,
    title: "New external destination in data pipeline",
    explanation:
      "ETL job added a new sink targeting a third-party analytics vendor not present in the data-sharing registry.",
    reasons: [
      "Destination domain not in approved vendor list",
      "Pipeline modification not associated with change ticket",
      "Data classification includes PII fields",
    ],
    timestamp: ago(102),
    apps: ["Snowflake", "AWS S3"],
    recommendedAction: "stall",
    recommendationReason:
      "Pause the pipeline pending vendor verification. No need to terminate the agent itself.",
    verified: true,
    telemetry: [
      { ts: ago(102), event: "pipeline.sink.add", detail: "dest=analytics.thirdparty.com" },
      { ts: ago(103), event: "schema.field", detail: "fields include email, phone (PII)" },
    ],
  },
  {
    id: "AGT-1033",
    agent: "Security Scanning Agent",
    agentType: "Autonomous Agent",
    severity: "low",
    confidence: 48,
    title: "Minor latency anomaly in scan job",
    explanation:
      "Scan completion time drifted upward by ~15% over the last 6 runs. Possibly related to target inventory growth.",
    reasons: [
      "Latency increase is small and trending, not spiking",
      "Target inventory grew 12% in same period",
      "No errors or failed checks detected",
    ],
    timestamp: ago(140),
    apps: ["AWS", "GitHub"],
    recommendedAction: "stall",
    recommendationReason:
      "Confidence is low — likely a benign capacity issue. Flag for review, no automated action.",
    verified: false,
    telemetry: [
      { ts: ago(140), event: "scan.complete", detail: "duration=14m12s (avg 12m18s)" },
    ],
  },
];
