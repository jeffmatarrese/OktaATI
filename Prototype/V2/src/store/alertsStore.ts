import { create } from 'zustand';
import { seedAlerts, type Alert } from '@/data/alerts';

interface AlertsState {
  alerts: Alert[];
  appendAlert: (a: Alert) => void;
  clearFlash: (id: string) => void;
  reset: () => Partial<AlertsState>;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [...seedAlerts],
  appendAlert: (a) =>
    set((s) => ({ alerts: [{ ...a, flash: true }, ...s.alerts] })),
  clearFlash: (id) =>
    set((s) => ({
      alerts: s.alerts.map((x) => (x.id === id ? { ...x, flash: false } : x)),
    })),
  reset: () => ({ alerts: [...seedAlerts] }),
}));
