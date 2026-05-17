export type AgentStatus = 'registered' | 'shadow';
export type RiskLabel = 'Low' | 'Medium' | 'High';
export type AgentType = 'LLM Agent' | 'Copilot' | 'RPA Bot' | 'Integration Agent' | 'CI/CD Agent' | 'Autonomous Agent';

export interface AgentBaseline {
  typicalScopes: string[];
  typicalApps: string[];
  typicalGeos: string[];
  typicalHoursUtc: string;
}

export interface Agent {
  id: string;
  name: string;
  identity: string;
  type: AgentType;
  ownerTeam: string;
  status: AgentStatus;
  risk: RiskLabel;
  lastSeen: string;
  openAlertCount: number;
  baseline: AgentBaseline;
}

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const hoursAgo = (h: number) => minsAgo(h * 60);

const handAuthored: Agent[] = [
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
  {
    id: 'agent-support-copilot',
    name: 'Customer Support Copilot',
    identity: 'svc-support-copilot@acme.okta.com',
    type: 'Copilot',
    ownerTeam: 'Customer Experience',
    status: 'registered',
    risk: 'Medium',
    lastSeen: minsAgo(22),
    openAlertCount: 1,
    baseline: {
      typicalScopes: ['zendesk.tickets.read', 'zendesk.tickets.write', 'slack.messages.write'],
      typicalApps: ['Zendesk', 'Slack'],
      typicalGeos: ['US-West', 'EU-West', 'APAC'],
      typicalHoursUtc: '00:00 – 23:59',
    },
  },
  {
    id: 'agent-marketing-indexer',
    name: 'Marketing Asset Indexer',
    identity: 'svc-marketing-indexer@acme.okta.com',
    type: 'Integration Agent',
    ownerTeam: 'Marketing Ops',
    status: 'registered',
    risk: 'Low',
    lastSeen: minsAgo(38),
    openAlertCount: 1,
    baseline: {
      typicalScopes: ['gdrive.read', 'gdrive.metadata'],
      typicalApps: ['Google Drive', 'Contentful'],
      typicalGeos: ['US-East'],
      typicalHoursUtc: '08:00 – 18:00',
    },
  },
];

// Synthetic agents to populate the directory for the demo. Names + teams are
// plausible-but-fictional; distribution is tuned so the KPI tiles read well.
const TEAMS = [
  'Revenue Ops', 'Security', 'Data Platform', 'Engineering', 'Customer Support',
  'Marketing', 'Finance', 'IT', 'SRE', 'Product', 'People Ops', 'Legal',
];

const TYPED_NAMES: Record<AgentType, string[]> = {
  'LLM Agent': [
    'Knowledge Base Assistant', 'Email Drafter', 'Meeting Summarizer',
    'Documentation Bot', 'Customer Email Triage', 'Standup Notes Bot',
    'Release Notes Drafter',
  ],
  'Copilot': [
    'Sales Copilot', 'Engineering Copilot', 'Marketing Copilot',
    'Support Copilot', 'Finance Copilot',
  ],
  'RPA Bot': [
    'Invoice Processor', 'Expense Auditor', 'License Reconciler',
    'Onboarding Provisioner', 'Offboarding Sweeper',
  ],
  'Integration Agent': [
    'HubSpot Sync', 'Jira → Linear Bridge', 'Zendesk Connector',
    'Notion Sync', 'Snowflake Loader', 'Looker Refresher', 'Stripe Reconciler',
  ],
  'CI/CD Agent': [
    'Staging Deploy Runner', 'Prod Deploy Gatekeeper', 'Migration Runner',
    'Cron Scheduler', 'Backup Verifier',
  ],
  'Autonomous Agent': [
    'Account Health Monitor', 'Outage Responder', 'Lead Qualifier',
    'Threat Hunter', 'Cost Optimizer',
  ],
};

const SCOPES_BY_TYPE: Record<AgentType, string[]> = {
  'LLM Agent':         ['gdrive.read', 'gmail.read', 'confluence.read'],
  'Copilot':           ['github.read', 'jira.read', 'slack.read'],
  'RPA Bot':           ['workday.read', 'netsuite.read', 'okta.users.read'],
  'Integration Agent': ['salesforce.read', 'snowflake.write', 'stripe.read'],
  'CI/CD Agent':       ['aws.s3.write', 'github.repo.write', 'aws.ecr.read'],
  'Autonomous Agent':  ['datadog.read', 'pagerduty.write', 'slack.write'],
};

const APPS_BY_TYPE: Record<AgentType, string[]> = {
  'LLM Agent':         ['Google Drive', 'Confluence'],
  'Copilot':           ['GitHub', 'Jira'],
  'RPA Bot':           ['Workday', 'NetSuite'],
  'Integration Agent': ['Salesforce', 'Snowflake'],
  'CI/CD Agent':       ['AWS', 'GitHub'],
  'Autonomous Agent':  ['Datadog', 'PagerDuty'],
};

const RISKS: RiskLabel[] = ['Low', 'Medium', 'High'];
const LAST_SEEN_BUCKETS_MIN = [2, 5, 9, 14, 22, 31, 47, 78, 142, 360, 1440, 4320];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generateAgents(): Agent[] {
  const out: Agent[] = [];
  let i = 0;
  for (const [type, names] of Object.entries(TYPED_NAMES) as [AgentType, string[]][]) {
    for (const name of names) {
      i++;
      // ~10% shadow, weighted Low/Medium/High = 60/30/10.
      const riskRoll = (i * 37) % 100;
      const risk: RiskLabel = riskRoll < 10 ? 'High' : riskRoll < 40 ? 'Medium' : 'Low';
      const status: AgentStatus = (i * 13) % 100 < 10 ? 'shadow' : 'registered';
      const lastSeen = minsAgo(LAST_SEEN_BUCKETS_MIN[i % LAST_SEEN_BUCKETS_MIN.length]);
      const openAlertCount = (i * 7) % 13 === 0 ? 1 : 0;
      out.push({
        id: `agent-syn-${i}`,
        name,
        identity: `svc-${slugify(name)}@acme.okta.com`,
        type,
        ownerTeam: TEAMS[(i * 11) % TEAMS.length],
        status,
        risk,
        lastSeen,
        openAlertCount,
        baseline: {
          typicalScopes: SCOPES_BY_TYPE[type],
          typicalApps: APPS_BY_TYPE[type],
          typicalGeos: [(i % 2 ? 'US-East' : 'US-West')],
          typicalHoursUtc: '08:00 – 22:00',
        },
      });
    }
  }
  return out;
}

export const seedAgents: Agent[] = [...handAuthored, ...generateAgents()];

// Used by Agents page KPIs — gives the "X / TOTAL_FLEET" framing a realistic
// denominator without requiring 400 literal rows.
export const TOTAL_FLEET = 384;
export const ACTIVE_WINDOW_MIN = 30;
