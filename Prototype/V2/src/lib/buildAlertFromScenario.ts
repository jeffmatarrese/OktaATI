import type { Alert } from '@/data/alerts';
import type { MLResult } from '@/services/classifier';
import { enforcementForTier } from '@/lib/tiers';
import { labScenarios } from '@/data/scenarios';

/**
 * Build a runtime Alert from a lab scenario + the ML classifier result.
 * Returns null when the ML model predicts Normal (no alert worth surfacing).
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
