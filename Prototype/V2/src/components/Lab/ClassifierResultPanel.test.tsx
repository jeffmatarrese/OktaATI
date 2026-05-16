import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassifierResultPanel } from './ClassifierResultPanel';
import type { MLResult, NanoResult } from '@/services/classifier';

const ml: MLResult = {
  model: 'bold_beard', scenarioId: 'T2-04', predicted: 'T2',
  probs: { Normal: 0.05, T1: 0.1, T2: 0.7, T3: 0.15 },
};
const nano: NanoResult = {
  model: 'nano', scenarioId: 'T2-04', predicted: 'T1',
  confidence: 0.71, reasoning: 'because reasons',
};

describe('ClassifierResultPanel', () => {
  it('shows correct/incorrect check vs ground truth', () => {
    render(<ClassifierResultPanel result={ml} groundTruth="T2" />);
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
  });

  it('shows incorrect when prediction != ground truth', () => {
    render(<ClassifierResultPanel result={nano} groundTruth="T2" />);
    expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
  });

  it('renders 4-class probability bar for ML', () => {
    render(<ClassifierResultPanel result={ml} groundTruth="T2" />);
    // ProbabilityBar duplicates testid — use getAllByTestId
    expect(screen.getAllByTestId('prob-segment-T2').length).toBeGreaterThan(0);
  });

  it('renders single confidence + reasoning for nano', () => {
    render(<ClassifierResultPanel result={nano} groundTruth="T2" />);
    expect(screen.getByText(/71%/)).toBeInTheDocument();
    expect(screen.getByText(/because reasons/)).toBeInTheDocument();
  });
});
