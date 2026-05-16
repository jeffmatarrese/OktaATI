import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLabStore } from './labStore';
import { useAlertsStore } from './alertsStore';

vi.mock('@/services/classifier', () => ({
  classifier: {
    classify: vi.fn(async (scenarioId: string, model: 'nano' | 'bold_beard') => {
      if (model === 'bold_beard') {
        return {
          model: 'bold_beard', scenarioId, predicted: 'T2',
          probs: { Normal: 0.05, T1: 0.1, T2: 0.7, T3: 0.15 },
        };
      }
      return {
        model: 'nano', scenarioId, predicted: 'T1',
        confidence: 0.71, reasoning: 'because reasons',
      };
    }),
  },
}));

describe('labStore', () => {
  beforeEach(() => {
    useLabStore.setState({ isOpen: true, phase: 'idle', lastResult: null });
    useAlertsStore.setState(useAlertsStore.getState().reset());
  });

  it('open/close toggle the drawer', () => {
    useLabStore.getState().closeDrawer();
    expect(useLabStore.getState().isOpen).toBe(false);
    useLabStore.getState().openDrawer();
    expect(useLabStore.getState().isOpen).toBe(true);
  });

  it('sendScenario classifies both models, appends an alert, and ends in revealed', async () => {
    const before = useAlertsStore.getState().alerts.length;
    await useLabStore.getState().sendScenario('T2-04');
    const state = useLabStore.getState();
    expect(state.phase).toBe('revealed');
    expect(state.lastResult?.ml.predicted).toBe('T2');
    expect(state.lastResult?.nano.predicted).toBe('T1');
    expect(useAlertsStore.getState().alerts.length).toBe(before + 1);
    expect(useAlertsStore.getState().alerts[0].tier).toBe('T2');
  });

  it('sendScenario does NOT append an alert when ML predicts Normal', async () => {
    const { classifier } = await import('@/services/classifier');
    (classifier.classify as ReturnType<typeof vi.fn>).mockImplementationOnce(async (sid: string) => ({
      model: 'bold_beard', scenarioId: sid, predicted: 'Normal',
      probs: { Normal: 0.9, T1: 0.05, T2: 0.03, T3: 0.02 },
    }));
    const before = useAlertsStore.getState().alerts.length;
    await useLabStore.getState().sendScenario('N-01');
    expect(useAlertsStore.getState().alerts.length).toBe(before);
  });
});
