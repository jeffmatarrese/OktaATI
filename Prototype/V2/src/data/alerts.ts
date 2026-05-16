import type { Tier, Enforcement } from '@/lib/tiers';

export type CloudProvider = 'AWS' | 'GCP' | 'Azure';

export interface EvidenceStep {
  statement: string;
  signal: string;
  policy: string;
  eventId: string;
}

export interface TimelineEvent {
  ts: string;
  event: string;
  detail: string;
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
  lastMfa: string;
  authMethod: string;
}

export interface ChangeManagement {
  status: 'approved' | 'none';
  ticket?: string;
}

export interface Alert {
  id: string;
  agentId: string;
  agentName: string;
  agentType: string;
  tier: Exclude<Tier, 'Normal'>;
  enforcement: Enforcement;
  title: string;
  summary: string;
  detectedAt: string;
  mttc: string;
  appsTouched: string[];
  cloudPresence: CloudProvider[];
  changeManagement: ChangeManagement;
  evidenceChain: EvidenceStep[];
  timeline: TimelineEvent[];
  crossAppContext: CrossAppEvent[];
  identity: IdentityCard;
  recommendationRationale: string;
  modelRunId: string;
  flash?: boolean;
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
      { ts: ago(11), event: 'auth.session.start',  detail: 'svc-sfdc-sync from 10.42.4.18',       app: 'Okta' },
      { ts: ago(9),  event: 'oauth.token.refresh', detail: 'scope=salesforce.read.bulk',          app: 'Salesforce' },
      { ts: ago(6),  event: 'sql.query',           detail: 'SELECT Id, Email, Phone FROM Contact', app: 'Salesforce' },
      { ts: ago(3),  event: 'data.export.bulk',    detail: '42,318 Contact records',              app: 'Salesforce' },
      { ts: ago(2),  event: 'http.post',           detail: 'api.unverified-host.io/ingest',       app: 'egress' },
    ],
    crossAppContext: [
      {
        app: 'AWS S3',
        cloud: 'AWS',
        event: 's3.bucket.list',
        detail: 'No matching staging bucket — direct external POST',
        ts: ago(2),
      },
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

  {
    id: 'ATI-2027-0041',
    agentId: 'agent-slack-triage',
    agentName: 'Slack Triage Bot',
    agentType: 'Workflow Agent',
    tier: 'T2',
    enforcement: 'Restrict Scope',
    title: 'Scope drift: 3 out-of-scope apps accessed in under 2 minutes',
    summary: 'Agent acquired OAuth tokens for Snowflake, Workday, and NetSuite — none in its declared scope.',
    detectedAt: ago(7),
    mttc: '2m 11s',
    appsTouched: ['Slack', 'Snowflake', 'Workday', 'NetSuite'],
    cloudPresence: ['GCP'],
    changeManagement: { status: 'none' },
    evidenceChain: [
      {
        statement: 'Agent requested OAuth tokens for three applications outside its declared integration scope.',
        signal: 'Token grants issued for Snowflake, Workday, NetSuite in a 90-second window; approved scope is Slack only.',
        policy: 'policy://ati/oauth-scope-boundary/v2',
        eventId: 'evt-8b01',
      },
      {
        statement: 'Rapid sequential token acquisition pattern matches lateral-movement playbook.',
        signal: '3 cross-app token grants in 88 seconds — inter-grant interval well below the 300-second baseline.',
        policy: 'policy://ati/token-acquisition-rate/v1',
        eventId: 'evt-8b02',
      },
    ],
    timeline: [
      { ts: ago(9),  event: 'auth.session.start',  detail: 'svc-slack-triage from 10.11.2.5',  app: 'Okta' },
      { ts: ago(8),  event: 'oauth.token.grant',   detail: 'app=Snowflake scope=data.read',    app: 'Okta' },
      { ts: ago(8),  event: 'oauth.token.grant',   detail: 'app=Workday scope=hcm.read',       app: 'Okta' },
      { ts: ago(7),  event: 'oauth.token.grant',   detail: 'app=NetSuite scope=financials.read', app: 'Okta' },
      { ts: ago(7),  event: 'api.call',            detail: 'GET /api/v2/reports — Snowflake',  app: 'Snowflake' },
    ],
    crossAppContext: [
      {
        app: 'BigQuery',
        cloud: 'GCP',
        event: 'bigquery.jobs.create',
        detail: 'SELECT query targeting employee_compensation table — no prior activity from this agent',
        ts: ago(7),
      },
    ],
    identity: {
      serviceAccount: 'svc-slack-triage@acme.okta.com',
      tokenIssuer: 'Okta',
      idp: 'Okta Workforce',
      lastMfa: 'n/a (workload identity)',
      authMethod: 'OAuth client credentials',
    },
    recommendationRationale:
      'Significant scope drift across financial and HR systems. Restricting to declared Slack scope preserves workflow uptime while eliminating unauthorized cross-app access.',
    modelRunId: 'bold_beard-2026-05-15-run-37',
  },

  {
    id: 'ATI-2027-0040',
    agentId: 'agent-fin-recon',
    agentName: 'Finance Reconciliation Agent',
    agentType: 'Autonomous Agent',
    tier: 'T2',
    enforcement: 'Restrict Scope',
    title: 'Off-hours query of restricted GL tables at 03:14 UTC',
    summary: 'Agent queried 4 restricted general-ledger tables 9 hours outside its approved operating window.',
    detectedAt: ago(14),
    mttc: '3m 05s',
    appsTouched: ['NetSuite', 'Azure Synapse'],
    cloudPresence: ['Azure'],
    changeManagement: { status: 'none' },
    evidenceChain: [
      {
        statement: 'Activity occurred outside the approved operating window of 09:00–18:00 local (UTC-8).',
        signal: 'Session initiated at 03:14 UTC — 9 hours before the earliest approved start time.',
        policy: 'policy://ati/operating-window/v1',
        eventId: 'evt-7a01',
      },
      {
        statement: 'Queries targeted tables classified as restricted-financial with elevated sensitivity.',
        signal: 'SELECT executed on gl_journal_restricted, payroll_accruals, exec_comp_summary, and board_approvals — all tagged sensitivity=high.',
        policy: 'policy://ati/data-classification-access/v2',
        eventId: 'evt-7a02',
      },
    ],
    timeline: [
      { ts: ago(17), event: 'auth.session.start',  detail: 'svc-fin-recon from 10.55.1.22 at 03:11 UTC',     app: 'Okta' },
      { ts: ago(16), event: 'oauth.token.grant',   detail: 'scope=netsuite.financials.read',                  app: 'Okta' },
      { ts: ago(15), event: 'sql.query',           detail: 'SELECT * FROM gl_journal_restricted',             app: 'NetSuite' },
      { ts: ago(15), event: 'sql.query',           detail: 'SELECT * FROM exec_comp_summary',                app: 'NetSuite' },
      { ts: ago(14), event: 'data.transfer',       detail: '14,892 rows → Azure Synapse workspace fin-analytics-prod', app: 'Azure Synapse' },
    ],
    crossAppContext: [
      {
        app: 'Azure Synapse',
        cloud: 'Azure',
        event: 'synapse.pipeline.run',
        detail: 'Pipeline fin-recon-nightly triggered outside scheduled window — no corresponding trigger config change',
        ts: ago(14),
      },
    ],
    identity: {
      serviceAccount: 'svc-fin-recon@acme.okta.com',
      tokenIssuer: 'Okta',
      idp: 'Okta Workforce',
      lastMfa: 'n/a (workload identity)',
      authMethod: 'OAuth client credentials',
    },
    recommendationRationale:
      'Off-hours access to restricted financial data with no associated change ticket warrants immediate scope restriction. The agent should be limited to read-only access on non-restricted tables pending analyst review.',
    modelRunId: 'bold_beard-2026-05-15-run-37',
  },

  {
    id: 'ATI-2027-0039',
    agentId: 'agent-support-copilot',
    agentName: 'Customer Support Copilot',
    agentType: 'LLM Agent',
    tier: 'T1',
    enforcement: 'Stall',
    title: 'API call spike at 14× baseline with 85% 4xx error rate',
    summary: 'Outbound API volume surged to 1,420 req/min during approved CHG-7781 maintenance window.',
    detectedAt: ago(22),
    mttc: '4m 33s',
    appsTouched: ['Zendesk', 'Slack', 'AWS Lambda', 'GCP Pub/Sub'],
    cloudPresence: ['AWS', 'GCP'],
    changeManagement: { status: 'approved', ticket: 'CHG-7781' },
    evidenceChain: [
      {
        statement: 'Outbound API call rate is 14× the 30-day rolling baseline.',
        signal: '1,420 req/min observed; 30-day baseline is 100 req/min. Spike sustained for 6 minutes.',
        policy: 'policy://ati/api-call-rate/v2',
        eventId: 'evt-6f01',
      },
      {
        statement: '85% of calls returned 4xx errors, consistent with a misconfigured prompt loop.',
        signal: '1,207 of 1,420 requests in the measurement window returned HTTP 4xx on endpoint /tickets/search.',
        policy: 'policy://ati/error-rate-anomaly/v1',
        eventId: 'evt-6f02',
      },
    ],
    timeline: [
      { ts: ago(28), event: 'change.window.open',  detail: 'CHG-7781 maintenance window started',          app: 'ServiceNow' },
      { ts: ago(25), event: 'auth.session.start',  detail: 'svc-support-copilot from 10.33.7.99',         app: 'Okta' },
      { ts: ago(24), event: 'api.call.rate.spike', detail: '1,420 req/min — 14× baseline (100/min)',       app: 'Zendesk' },
      { ts: ago(23), event: 'api.error.4xx',       detail: '85% error rate on /tickets/search',           app: 'Zendesk' },
      { ts: ago(22), event: 'alert.triggered',     detail: 'ATI anomaly detector flagged call rate + error rate compound', app: 'Okta ATI' },
    ],
    crossAppContext: [
      {
        app: 'GCP Pub/Sub',
        cloud: 'GCP',
        event: 'pubsub.message.publish',
        detail: 'Retry queue backlog grew to 18,440 messages during spike — downstream consumers stalled',
        ts: ago(22),
      },
    ],
    identity: {
      serviceAccount: 'svc-support-copilot@acme.okta.com',
      tokenIssuer: 'Okta',
      idp: 'Okta Workforce',
      lastMfa: 'n/a (workload identity)',
      authMethod: 'OAuth client credentials',
    },
    recommendationRationale:
      'Spike correlates with CHG-7781 maintenance window — likely a misconfigured retry loop introduced during the change, not a security incident. Recommend Stall pending analyst confirmation before escalating scope changes.',
    modelRunId: 'bold_beard-2026-05-15-run-37',
  },

  {
    id: 'ATI-2027-0038',
    agentId: 'agent-marketing-indexer',
    agentName: 'Marketing Asset Indexer',
    agentType: 'Integration Agent',
    tier: 'T2',
    enforcement: 'Restrict Scope',
    title: 'Cross-department Drive traversal into roadmap-confidential folder',
    summary: 'Agent indexed Engineering\'s Google Drive including the \'roadmap-confidential\' folder — outside its declared content scope.',
    detectedAt: ago(38),
    mttc: '2m 48s',
    appsTouched: ['Google Drive', 'Azure AD'],
    cloudPresence: ['Azure'],
    changeManagement: { status: 'none' },
    evidenceChain: [
      {
        statement: 'Agent accessed Google Drive folders not in its approved content allow-list.',
        signal: 'drive.file.list and drive.file.read events recorded for 3 Engineering-owned folders, including roadmap-confidential — absent from the agent\'s content-scope policy.',
        policy: 'policy://ati/content-scope-boundary/v2',
        eventId: 'evt-5e01',
      },
      {
        statement: 'First-ever access to Engineering Drive resources by this agent identity.',
        signal: '0 prior events against Engineering folder hierarchy in 180-day audit window.',
        policy: 'policy://ati/resource-novelty/v1',
        eventId: 'evt-5e02',
      },
    ],
    timeline: [
      { ts: ago(42), event: 'auth.session.start',  detail: 'svc-marketing-indexer from 10.20.3.14',            app: 'Okta' },
      { ts: ago(41), event: 'oauth.token.grant',   detail: 'scope=drive.readonly — Marketing folder baseline',  app: 'Okta' },
      { ts: ago(40), event: 'drive.file.list',     detail: 'folder=roadmap-confidential (Engineering/Q3)',      app: 'Google Drive' },
      { ts: ago(39), event: 'drive.file.read',     detail: 'file=Q3-plan.gdoc (sensitivity=confidential)',      app: 'Google Drive' },
      { ts: ago(38), event: 'drive.file.read',     detail: 'file=competitive-analysis-2027.gdoc',              app: 'Google Drive' },
    ],
    crossAppContext: [
      {
        app: 'Azure AD',
        cloud: 'Azure',
        event: 'auditLogs.directoryAudits',
        detail: 'No group-membership change grants Engineering Drive access to svc-marketing-indexer — access path is unexplained',
        ts: ago(38),
      },
    ],
    identity: {
      serviceAccount: 'svc-marketing-indexer@acme.okta.com',
      tokenIssuer: 'Okta',
      idp: 'Okta Workforce',
      lastMfa: 'n/a (workload identity)',
      authMethod: 'OAuth client credentials',
    },
    recommendationRationale:
      'Read-only access means no immediate exfiltration of writes, but the agent ingested confidential roadmap data outside its declared scope with no change record. Restrict folder scope to approved Marketing paths and initiate DLP review of indexed content.',
    modelRunId: 'bold_beard-2026-05-15-run-37',
  },
];
