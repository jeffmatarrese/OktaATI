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

  it('sending a scenario classifies → reveals → pending row → alert pops → drawer closes', async () => {
    render(<MemoryRouter><LabDrawer /></MemoryRouter>);

    const firstScenario = labScenarios[0];
    const card = screen.getByTestId(`lab-scenario-${firstScenario.id}`);
    // grab the Send button specifically — it's the last button inside the card
    const buttons = card.querySelectorAll('button');
    const send = buttons[buttons.length - 1] as HTMLButtonElement;
    fireEvent.click(send);

    await waitFor(() => expect(useLabStore.getState().phase).toBe('revealed'));

    // pending detection is set during the delay window
    expect(useAlertsStore.getState().pending?.scenarioId).toBe(firstScenario.id);

    // advance past both the detection delay (3.5s) and drawer auto-close (1.5s)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(useAlertsStore.getState().pending).toBeNull();
    expect(useAlertsStore.getState().alerts[0].id).toMatch(/^ATI-LAB-/);
    expect(useLabStore.getState().isOpen).toBe(false);
  });
});
