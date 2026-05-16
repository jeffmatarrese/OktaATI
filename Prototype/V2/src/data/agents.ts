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
