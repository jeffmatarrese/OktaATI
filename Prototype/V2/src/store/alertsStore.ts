import { create } from 'zustand';
import { seedAlerts, type Alert } from '@/data/alerts';
import type { Enforcement } from '@/lib/tiers';

export interface PendingDetection {
  scenarioId: string;
  title: string;
  agentName: string;
  startedAt: string;
}

interface AlertsState {
  alerts: Alert[];
  pending: PendingDetection | null;
  appendAlert: (a: Alert) => void;
  clearFlash: (id: string) => void;
  applyAction: (id: string, enforcement: Exclude<Enforcement, 'None'>) => void;
  dismissAlert: (id: string) => void;
  setPending: (p: PendingDetection | null) => void;
  reset: () => Partial<AlertsState>;
}

const actionVerb: Record<Exclude<Enforcement, 'None'>, string> = {
  'Stall': 'Stalled by analyst',
  'Restrict Scope': 'Scope restricted by analyst',
  'Session Kill': 'Session killed by analyst',
};

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [...seedAlerts],
  pending: null,
  appendAlert: (a) =>
    set((s) => ({ alerts: [{ ...a, flash: true }, ...s.alerts] })),
  setPending: (p) => set({ pending: p }),
  clearFlash: (id) =>
    set((s) => ({
      alerts: s.alerts.map((x) => (x.id === id ? { ...x, flash: false } : x)),
    })),
  applyAction: (id, enforcement) =>
    set((s) => ({
      alerts: s.alerts.map((x) => {
        if (x.id !== id) return x;
        const takenAt = new Date().toISOString();
        return {
          ...x,
          actionTaken: { enforcement, takenAt },
          timeline: [
            ...x.timeline,
            { ts: takenAt, event: 'enforcement.applied', detail: actionVerb[enforcement], app: 'ATI' },
          ],
        };
      }),
    })),
  dismissAlert: (id) =>
    set((s) => ({
      alerts: s.alerts.map((x) => {
        if (x.id !== id) return x;
        const dismissedAt = new Date().toISOString();
        return {
          ...x,
          dismissedAt,
          timeline: [
            ...x.timeline,
            { ts: dismissedAt, event: 'alert.dismissed', detail: 'Dismissed by analyst (false positive)', app: 'ATI' },
          ],
        };
      }),
    })),
  reset: () => ({ alerts: [...seedAlerts], pending: null }),
}));
