import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProbabilityBar } from './ProbabilityBar';

describe('ProbabilityBar', () => {
  it('renders one segment per tier with percentage labels', () => {
    render(
      <ProbabilityBar probs={{ Normal: 0.1, T1: 0.2, T2: 0.5, T3: 0.2 }} />,
    );
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    expect(screen.getByText(/T2/i)).toBeInTheDocument();
  });

  it('highlights the highest-probability tier', () => {
    render(<ProbabilityBar probs={{ Normal: 0.1, T1: 0.7, T2: 0.1, T3: 0.1 }} />);
    const t1Segments = screen.getAllByTestId('prob-segment-T1');
    expect(t1Segments.some((el) => /font-semibold/.test(el.className))).toBe(true);
  });
});
