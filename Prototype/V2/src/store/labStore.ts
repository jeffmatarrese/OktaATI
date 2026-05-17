import { create } from 'zustand';
import { toast } from '@/components/ui/sonner';
import type { ClassifierResult, MLResult, NanoResult } from '@/services/classifier';
import { classifier } from '@/services/classifier';
import { useAlertsStore } from './alertsStore';
import { buildAlertFromScenario } from '@/lib/buildAlertFromScenario';
import { labScenarios } from '@/data/scenarios';

export type LabPhase = 'idle' | 'classifying' | 'revealed';

// Wall-clock between user clicking "Go to alerts" and the alert popping in.
// Short enough to feel snappy; long enough to see the pending row land.
export const COMMIT_DELAY_MS = 1500;

export interface LabResult {
  scenarioId: string;
  nano: NanoResult;
  ml: MLResult;
}

interface LabState {
  isOpen: boolean;
  phase: LabPhase;
  lastResult: LabResult | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  sendScenario: (scenarioId: string) => Promise<void>;
  commitLastResult: () => void;
}

const isNano = (r: ClassifierResult): r is NanoResult => r.model === 'nano';
const isML = (r: ClassifierResult): r is MLResult => r.model === 'bold_beard';

export const useLabStore = create<LabState>((set, get) => ({
  isOpen: false,
  phase: 'idle',
  lastResult: null,

  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),

  // sendScenario only classifies — the alert is not pushed to the dashboard
  // until the user explicitly clicks "Go to alerts" (commitLastResult).
  sendScenario: async (scenarioId) => {
    set({ phase: 'classifying' });
    const results = await Promise.all([
      classifier.classify(scenarioId, 'bold_beard'),
      classifier.classify(scenarioId, 'nano'),
    ]);
    const nanoRes = results.find(isNano);
    const mlRes = results.find(isML);
    if (!nanoRes || !mlRes) throw new Error('classifier returned wrong model');
    set({
      phase: 'revealed',
      lastResult: { scenarioId, nano: nanoRes, ml: mlRes },
    });
  },

  commitLastResult: () => {
    const { lastResult } = get();
    if (!lastResult) return;
    const sc = labScenarios.find((s) => s.id === lastResult.scenarioId);
    const alerts = useAlertsStore.getState();
    alerts.setPending({
      scenarioId: lastResult.scenarioId,
      title: sc?.title ?? 'Lab detection in progress',
      agentName: `Lab Agent · ${lastResult.scenarioId}`,
      startedAt: new Date().toISOString(),
    });
    setTimeout(() => {
      const alert = buildAlertFromScenario(lastResult.scenarioId, lastResult.ml);
      useAlertsStore.getState().setPending(null);
      if (alert) {
        useAlertsStore.getState().appendAlert(alert);
        toast(`New ${alert.tier} alert · ${alert.title}`, {
          description: `${alert.agentName} — recommended: ${alert.enforcement}`,
        });
      } else {
        toast(`Detection complete · ${sc?.title ?? lastResult.scenarioId}`, {
          description: 'Classified as Normal — no alert generated.',
        });
      }
    }, COMMIT_DELAY_MS);
  },
}));
