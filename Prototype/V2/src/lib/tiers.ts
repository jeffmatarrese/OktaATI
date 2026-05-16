export type Tier = 'Normal' | 'T1' | 'T2' | 'T3';
export const TIERS: readonly Tier[] = ['Normal', 'T1', 'T2', 'T3'] as const;

export type Enforcement = 'None' | 'Stall' | 'Restrict Scope' | 'Session Kill';

const LABELS: Record<Tier, string> = {
  Normal: 'Normal',
  T1: 'Tier 1 · Stall',
  T2: 'Tier 2 · Restrict Scope',
  T3: 'Tier 3 · Session Kill',
};

const COLORS: Record<Tier, string> = {
  Normal: 'bg-slate-100 text-slate-700 border-slate-300',
  T1: 'bg-amber-50 text-amber-800 border-amber-300',
  T2: 'bg-orange-50 text-orange-800 border-orange-300',
  T3: 'bg-red-50 text-red-800 border-red-300',
};

const ENFORCEMENT: Record<Tier, Enforcement> = {
  Normal: 'None',
  T1: 'Stall',
  T2: 'Restrict Scope',
  T3: 'Session Kill',
};

export function tierLabel(t: Tier): string { return LABELS[t]; }
export function tierColorClass(t: Tier): string { return COLORS[t]; }
export function enforcementForTier(t: Tier): Enforcement { return ENFORCEMENT[t]; }

export type ModelName = 'nano' | 'bold_beard';

export function modelDisplay(m: ModelName): { name: string; subtitle: string } {
  if (m === 'nano') {
    return { name: 'LLM Classifier', subtitle: 'gpt-5.4-nano (Phase 1)' };
  }
  return { name: 'Identity Threat Model', subtitle: 'bold_beard ML (Phase 2)' };
}
