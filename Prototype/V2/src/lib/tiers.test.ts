import { describe, it, expect } from 'vitest';
import { tierLabel, tierColorClass, enforcementForTier, modelDisplay } from './tiers';

describe('tier helpers', () => {
  it('returns human labels', () => {
    expect(tierLabel('Normal')).toBe('Normal');
    expect(tierLabel('T1')).toBe('Tier 1 · Stall');
    expect(tierLabel('T2')).toBe('Tier 2 · Restrict Scope');
    expect(tierLabel('T3')).toBe('Tier 3 · Session Kill');
  });

  it('returns a tailwind text/bg color class per tier', () => {
    expect(tierColorClass('T1')).toContain('yellow');
    expect(tierColorClass('T2')).toContain('orange');
    expect(tierColorClass('T3')).toContain('red');
    expect(tierColorClass('Normal')).toContain('slate');
  });

  it('maps tier to enforcement label', () => {
    expect(enforcementForTier('Normal')).toBe('None');
    expect(enforcementForTier('T1')).toBe('Stall');
    expect(enforcementForTier('T2')).toBe('Restrict Scope');
    expect(enforcementForTier('T3')).toBe('Session Kill');
  });

  it('returns display strings for models', () => {
    expect(modelDisplay('nano').name).toBe('LLM Classifier');
    expect(modelDisplay('nano').subtitle).toContain('gpt-5.4-nano');
    expect(modelDisplay('bold_beard').name).toBe('Identity Threat Model');
    expect(modelDisplay('bold_beard').subtitle).toContain('bold_beard');
  });
});
