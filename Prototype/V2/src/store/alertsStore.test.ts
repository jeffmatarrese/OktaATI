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
