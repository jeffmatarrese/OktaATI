import type { Tier } from '@/lib/tiers';
import bbData from '@/data/replay/predictions_bold_beard.json';
import nanoData from '@/data/replay/predictions_gpt54nano.json';

export interface NanoResult {
  model: 'nano';
  scenarioId: string;
  predicted: Tier;
  confidence: number;
  reasoning: string;
}

export interface MLResult {
  model: 'bold_beard';
  scenarioId: string;
  predicted: Tier;
  probs: Record<Tier, number>;
}

export type ClassifierResult = NanoResult | MLResult;

export type ModelName = 'nano' | 'bold_beard';

export interface ClassifierService {
  classify(scenarioId: string, model: ModelName): Promise<ClassifierResult>;
}

interface BBRow { scenarioId: string; predicted: Tier; probs: Record<Tier, number>; }
interface NanoRow { scenarioId: string; predicted: Tier; confidence: number; reasoning: string; }

const bbIndex: Map<string, BBRow> = new Map(
  (bbData as BBRow[]).map((r) => [r.scenarioId, r]),
);
const nanoIndex: Map<string, NanoRow> = new Map(
  (nanoData as NanoRow[]).map((r) => [r.scenarioId, r]),
);

export class ReplayClassifier implements ClassifierService {
  async classify(scenarioId: string, model: ModelName): Promise<ClassifierResult> {
    if (model === 'bold_beard') {
      const row = bbIndex.get(scenarioId);
      if (!row) throw new Error(`unknown scenario for bold_beard: ${scenarioId}`);
      return { model: 'bold_beard', ...row };
    }
    const row = nanoIndex.get(scenarioId);
    if (!row) throw new Error(`unknown scenario for nano: ${scenarioId}`);
    return { model: 'nano', ...row };
  }
}

export const classifier: ClassifierService = new ReplayClassifier();
