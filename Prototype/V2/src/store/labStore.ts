import { create } from 'zustand';
import { toast } from '@/components/ui/sonner';
import type { ClassifierResult, MLResult, NanoResult } from '@/services/classifier';
import { classifier } from '@/services/classifier';
import { useAlertsStore } from './alertsStore';
import { buildAlertFromScenario } from '@/lib/buildAlertFromScenario';
import { labScenarios } from '@/data/scenarios';

export type LabPhase = 'idle' | 'classifying' | 'revealed';

// Minimum wall-clock between Send and alert pop so the detection feels real-time.
export const DETECTION_DELAY_MS = 3500;

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
    const sc = labScenarios.find((s) => s.id === scenarioId);
    const alerts = useAlertsStore.getState();
    alerts.setPending({
      scenarioId,
      title: sc?.title ?? 'Lab detection in progress',
      agentName: `Lab Agent · ${scenarioId}`,
      startedAt: new Date().toISOString(),
    });

    const delay = new Promise<void>((resolve) => setTimeout(resolve, DETECTION_DELAY_MS));
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

    await delay;
    const alert = buildAlertFromScenario(scenarioId, mlRes);
    useAlertsStore.getState().setPending(null);
    if (alert) {
      useAlertsStore.getState().appendAlert(alert);
      toast(`New ${alert.tier} alert · ${alert.title}`, {
        description: `${alert.agentName} — recommended: ${alert.enforcement}`,
      });
    } else {
      toast(`Detection complete · ${sc?.title ?? scenarioId}`, {
        description: 'Classified as Normal — no alert generated.',
      });
    }
  },
}));
