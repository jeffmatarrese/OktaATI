import { create } from 'zustand';
import type { ClassifierResult, MLResult, NanoResult } from '@/services/classifier';
import { classifier } from '@/services/classifier';
import { useAlertsStore } from './alertsStore';
import { buildAlertFromScenario } from '@/lib/buildAlertFromScenario';

export type LabPhase = 'idle' | 'classifying' | 'revealed';

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
}

const isNano = (r: ClassifierResult): r is NanoResult => r.model === 'nano';
const isML = (r: ClassifierResult): r is MLResult => r.model === 'bold_beard';

export const useLabStore = create<LabState>((set) => ({
  isOpen: true,          // first-load behavior: drawer is open
  phase: 'idle',
  lastResult: null,

  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),

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
    const alert = buildAlertFromScenario(scenarioId, mlRes);
    if (alert) {
      useAlertsStore.getState().appendAlert(alert);
    }
  },
}));
