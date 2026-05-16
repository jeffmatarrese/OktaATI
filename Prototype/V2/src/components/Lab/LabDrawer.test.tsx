import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    useLabStore.setState({ isOpen: true, phase: 'idle', lastResult: null });
    useAlertsStore.setState(useAlertsStore.getState().reset());
  });

  it('sending a scenario classifies → reveals → appends alert → closes drawer', async () => {
    render(<MemoryRouter><LabDrawer /></MemoryRouter>);

    const firstScenario = labScenarios[0];
    const card = screen.getByTestId(`lab-scenario-${firstScenario.id}`);
    // grab the Send button specifically — it's the last button inside the card
    const buttons = card.querySelectorAll('button');
    const send = buttons[buttons.length - 1] as HTMLButtonElement;
    fireEvent.click(send);

    await waitFor(() => expect(useLabStore.getState().phase).toBe('revealed'));

    // alert was appended at the front
    expect(useAlertsStore.getState().alerts[0].id).toMatch(/^ATI-LAB-/);

    // drawer auto-closes after 1500ms — wait for the real setTimeout to fire
    await waitFor(
      () => expect(useLabStore.getState().isOpen).toBe(false),
      { timeout: 2500 },
    );
  });
});
