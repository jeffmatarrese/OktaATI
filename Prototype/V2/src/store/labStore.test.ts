import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    vi.useFakeTimers();
    useLabStore.setState({ isOpen: true, phase: 'idle', lastResult: null });
    useAlertsStore.setState(useAlertsStore.getState().reset());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('open/close toggle the drawer', () => {
    useLabStore.getState().closeDrawer();
    expect(useLabStore.getState().isOpen).toBe(false);
    useLabStore.getState().openDrawer();
    expect(useLabStore.getState().isOpen).toBe(true);
  });

  it('sendScenario classifies both models and ends in revealed WITHOUT touching the dashboard', async () => {
    const before = useAlertsStore.getState().alerts.length;
    const p = useLabStore.getState().sendScenario('T2-04');
    await vi.runAllTimersAsync();
    await p;
    const state = useLabStore.getState();
    expect(state.phase).toBe('revealed');
    expect(state.lastResult?.ml.predicted).toBe('T2');
    expect(state.lastResult?.nano.predicted).toBe('T1');
    // No pending row, no alert appended — that waits for commitLastResult.
    expect(useAlertsStore.getState().pending).toBeNull();
    expect(useAlertsStore.getState().alerts.length).toBe(before);
  });

  it('commitLastResult sets pending immediately and appends the alert after the commit delay', async () => {
    const before = useAlertsStore.getState().alerts.length;
    const p = useLabStore.getState().sendScenario('T2-04');
    await vi.runAllTimersAsync();
    await p;

    useLabStore.getState().commitLastResult();
    expect(useAlertsStore.getState().pending?.scenarioId).toBe('T2-04');
    expect(useAlertsStore.getState().alerts.length).toBe(before); // not yet appended

    await vi.runAllTimersAsync();
    expect(useAlertsStore.getState().pending).toBeNull();
    expect(useAlertsStore.getState().alerts.length).toBe(before + 1);
    expect(useAlertsStore.getState().alerts[0].tier).toBe('T2');
  });

  it('commitLastResult on a Normal prediction clears pending and appends nothing', async () => {
    const { classifier } = await import('@/services/classifier');
    (classifier.classify as ReturnType<typeof vi.fn>).mockImplementationOnce(async (sid: string) => ({
      model: 'bold_beard', scenarioId: sid, predicted: 'Normal',
      probs: { Normal: 0.9, T1: 0.05, T2: 0.03, T3: 0.02 },
    }));
    const before = useAlertsStore.getState().alerts.length;
    const p = useLabStore.getState().sendScenario('N-01');
    await vi.runAllTimersAsync();
    await p;

    useLabStore.getState().commitLastResult();
    await vi.runAllTimersAsync();
    expect(useAlertsStore.getState().alerts.length).toBe(before);
    expect(useAlertsStore.getState().pending).toBeNull();
  });
});
