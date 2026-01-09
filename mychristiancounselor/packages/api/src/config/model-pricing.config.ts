// Pricing as of January 2025 (AWS Bedrock pricing)
export const MODEL_PRICING = {
  'claude-sonnet-4-5-20250929': {
    inputTokensPer1M: 3.00,   // $3 per 1M input tokens
    outputTokensPer1M: 15.00, // $15 per 1M output tokens
  },
  'claude-opus-4-5-20251101': {
    inputTokensPer1M: 15.00,  // $15 per 1M input tokens
    outputTokensPer1M: 75.00, // $75 per 1M output tokens
  },
  'claude-haiku-4-5-20251001': {
    inputTokensPer1M: 0.80,   // $0.80 per 1M input tokens
    outputTokensPer1M: 4.00,  // $4 per 1M output tokens
  },
};

export function calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) {
    console.warn(`Unknown model: ${modelId}, returning 0 cost`);
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputTokensPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputTokensPer1M;

  return inputCost + outputCost;
}
