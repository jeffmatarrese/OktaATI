import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LabDrawer } from './LabDrawer';
import { useLabStore } from '@/store/labStore';
import { useAlertsStore } from '@/store/alertsStore';
import { labScenarios } from '@/data/scenarios';

vi.mock('@/services/classifier', () => ({
  classifier: {
    classify: vi.fn(async (scenarioId: string, model: 'nano' | 'bold_beard') =>
      model === 'bold_beard'
        ? { model: 'bold_beard', scenarioId, predicted: 'T2', probs: { Normal: 0.05, T1: 0.1, T2: 0.7, T3: 0.15 } }
        : { model: 'nano', scenarioId, predicted: 'T2', confidence: 0.8, reasoning: 'r' },
    ),
  },
}));

describe('LabDrawer send flow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useLabStore.setState({ isOpen: true, phase: 'idle', lastResult: null });
    useAlertsStore.setState(useAlertsStore.getState().reset());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Send classifies into the drawer; the dashboard only populates after Go to alerts', async () => {
    render(<MemoryRouter><LabDrawer /></MemoryRouter>);

    const firstScenario = labScenarios[0];
    const card = screen.getByTestId(`lab-scenario-${firstScenario.id}`);
    const buttons = card.querySelectorAll('button');
    const send = buttons[buttons.length - 1] as HTMLButtonElement;
    const beforeAlertCount = useAlertsStore.getState().alerts.length;
    fireEvent.click(send);

    await waitFor(() => expect(useLabStore.getState().phase).toBe('revealed'));

    // Drawer shows results — but no pending row, no alert in the dashboard yet.
    expect(useAlertsStore.getState().pending).toBeNull();
    expect(useAlertsStore.getState().alerts.length).toBe(beforeAlertCount);
    expect(useLabStore.getState().isOpen).toBe(true);

    fireEvent.click(screen.getByTestId('lab-go-to-alerts'));
    // Drawer closes; pending row is set immediately.
    expect(useLabStore.getState().isOpen).toBe(false);
    expect(useAlertsStore.getState().pending?.scenarioId).toBe(firstScenario.id);

    // Advance past the commit delay; the alert lands in the dashboard.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(useAlertsStore.getState().pending).toBeNull();
    expect(useAlertsStore.getState().alerts[0].id).toMatch(/^ATI-LAB-/);
  });
});
