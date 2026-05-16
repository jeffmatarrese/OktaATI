import { describe, it, expect } from 'vitest';
import { ReplayClassifier } from './classifier';

describe('ReplayClassifier', () => {
  const svc = new ReplayClassifier();

  it('returns a bold_beard MLResult with 4-class probs that sum ~1', async () => {
    const r = await svc.classify('N-01', 'bold_beard');
    expect(r.model).toBe('bold_beard');
    expect(r.scenarioId).toBe('N-01');
    if (r.model !== 'bold_beard') throw new Error('discriminator broken');
    const sum = r.probs.Normal + r.probs.T1 + r.probs.T2 + r.probs.T3;
    expect(sum).toBeGreaterThan(0.98);
    expect(sum).toBeLessThan(1.02);
    expect(['Normal', 'T1', 'T2', 'T3']).toContain(r.predicted);
  });

  it('returns a nano NanoResult with confidence in [0,1] and reasoning text', async () => {
    const r = await svc.classify('N-01', 'nano');
    expect(r.model).toBe('nano');
    if (r.model !== 'nano') throw new Error('discriminator broken');
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(r.reasoning.length).toBeGreaterThan(10);
    expect(['Normal', 'T1', 'T2', 'T3']).toContain(r.predicted);
  });

  it('throws a clear error for an unknown scenario id', async () => {
    await expect(svc.classify('DOES-NOT-EXIST', 'bold_beard')).rejects.toThrow(/unknown scenario/i);
  });
});
