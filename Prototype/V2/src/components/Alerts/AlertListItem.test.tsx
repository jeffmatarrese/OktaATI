import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertListItem } from './AlertListItem';
import { seedAlerts } from '@/data/alerts';

describe('AlertListItem', () => {
  const a = seedAlerts[0];

  it('shows agent, summary, tier badge, and cloud chips', () => {
    render(<AlertListItem alert={a} selected={false} onSelect={() => {}} />);
    expect(screen.getByText(a.agentName)).toBeInTheDocument();
    expect(screen.getByText(a.summary)).toBeInTheDocument();
    expect(screen.getByText(/Tier 3/)).toBeInTheDocument();
    a.cloudPresence.forEach((c) => expect(screen.getByText(c)).toBeInTheDocument());
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<AlertListItem alert={a} selected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId(`alert-row-${a.id}`));
    expect(onSelect).toHaveBeenCalledWith(a.id);
  });

  it('renders a flash style when alert.flash is true', () => {
    render(<AlertListItem alert={{ ...a, flash: true }} selected={false} onSelect={() => {}} />);
    expect(screen.getByTestId(`alert-row-${a.id}`).className).toMatch(/ring/);
  });
});
