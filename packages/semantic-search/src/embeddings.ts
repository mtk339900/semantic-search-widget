// ============================================================
// Semantic Search Widget — Transformer-Based Embeddings
// ============================================================
//
// Uses @huggingface/transformers with a pre-trained sentence-
// transformer model (all-MiniLM-L6-v2) for REAL semantic encoding.
//
// Why this works:
//   - Trained on 1B+ sentence pairs (not 141 chunks)
//   - Understands synonyms, paraphrases, and intent
//   - Produces meaningful cosine similarity scores
//   - No vector collapse — vectors are well-separated
//
// Trade-off:
//   - First load downloads ~22MB model (cached afterward)
//   - Worth it: actual semantic understanding vs fake confidence
//

import { pipeline, type PipelineType } from '@huggingface/transformers';
import { normalize } from './similarity';

export const DEFAULT_MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
export const DEFAULT_DIMENSIONS = 384;

let featureExtractor: Awaited<ReturnType<typeof pipeline>> | null = null;
let loadedModelId: string | null = null;

/**
 * Lazy-load the sentence embedding pipeline.
 * Returns a singleton — the model is loaded at most once per session.
 */
export async function getEncoder(modelId: string = DEFAULT_MODEL_ID) {
  if (featureExtractor && loadedModelId === modelId) {
    return featureExtractor;
  }
  featureExtractor = await pipeline('feature-extraction', modelId, {
    // Use ONNX Runtime (works in both Node.js and browser)
    dtype: 'fp32',
    progress_callback: undefined,
  });
  loadedModelId = modelId;
  return featureExtractor;
}

/**
 * Encode a single text string into a normalized embedding vector.
 * Uses mean pooling over token embeddings, then L2 normalization.
 */
export async function encodeText(
  text: string,
  modelId: string = DEFAULT_MODEL_ID,
): Promise<number[]> {
  const encoder = await getEncoder(modelId);
  const output = await encoder(text, { pooling: 'mean', normalize: true });

  // The output shape is [1, dim] — extract the flat array
  const tensor = output as unknown as { data: Float32Array | number[]; dims: number[] };
  const data = Array.from(tensor.data);

  // If dims indicate [batch, seq_len, hidden], take mean over seq_len
  if (tensor.dims.length === 3) {
    const [_, seqLen, hiddenDim] = tensor.dims;
    const pooled = new Array<number>(hiddenDim).fill(0);
    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < hiddenDim; j++) {
        pooled[j] += data[i * hiddenDim + j];
      }
    }
    for (let j = 0; j < hiddenDim; j++) {
      pooled[j] /= seqLen;
    }
    return normalize(pooled);
  }

  // If dims indicate [batch, hidden], already pooled
  if (tensor.dims.length === 2) {
    return normalize(data);
  }

  // Fallback: flat array, treat as already pooled
  return normalize(data);
}

/**
 * Encode multiple texts in a single batch call (faster than one-by-one).
 * Returns an array of normalized vectors.
 */
export async function encodeBatch(
  texts: string[],
  modelId: string = DEFAULT_MODEL_ID,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const encoder = await getEncoder(modelId);

  // Process in batches of 32 to avoid memory issues
  const BATCH_SIZE = 32;
  const allVectors: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const output = await encoder(batch, { pooling: 'mean', normalize: true });

    const tensor = output as unknown as { data: Float32Array | number[]; dims: number[] };
    const data = Array.from(tensor.data);

    if (tensor.dims.length === 3) {
      const [batchSize, seqLen, hiddenDim] = tensor.dims;
      for (let b = 0; b < batchSize; b++) {
        const pooled = new Array<number>(hiddenDim).fill(0);
        for (let s = 0; s < seqLen; s++) {
          for (let d = 0; d < hiddenDim; d++) {
            pooled[d] += data[b * seqLen * hiddenDim + s * hiddenDim + d];
          }
        }
        for (let d = 0; d < hiddenDim; d++) {
          pooled[d] /= seqLen;
        }
        allVectors.push(normalize(pooled));
      }
    } else if (tensor.dims.length === 2) {
      const [batchSize, hiddenDim] = tensor.dims;
      for (let b = 0; b < batchSize; b++) {
        const vec = data.slice(b * hiddenDim, (b + 1) * hiddenDim);
        allVectors.push(normalize(vec));
      }
    } else {
      // Flat array — single item
      allVectors.push(normalize(data));
    }
  }

  return allVectors;
}

/**
 * Reset the cached encoder (useful for testing or model switching).
 */
export function resetEncoder(): void {
  featureExtractor = null;
  loadedModelId = null;
}
