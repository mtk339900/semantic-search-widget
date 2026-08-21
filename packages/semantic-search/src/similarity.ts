// ============================================================// Semantic Search Widget — Cosine Similarity// ============================================================

/**
 * Compute cosine similarity between two vectors.
 * If vectors are pre-normalised to unit length, this reduces
 * to a simple dot product (faster).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.length} vs ${b.length}`,
    );
  }
  if (a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Optimised dot product for pre-normalised vectors.
 * Use this when you know both vectors have unit length.
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.length} vs ${b.length}`,
    );
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Normalise a vector to unit length in-place.
 * Returns the same array reference.
 */
export function normalize(vector: number[]): number[] {
  let norm = 0;
  for (let i = 0; i < vector.length; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return vector;
  for (let i = 0; i < vector.length; i++) {
    vector[i] /= norm;
  }
  return vector;
}

/**
 * Compute cosine similarity of a query vector against all chunk vectors.
 * Returns a Map of chunkId → similarity score.
 */
export function batchCosineSimilarity(
  queryVector: number[],
  chunks: { id: string; vector: number[] }[],
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const chunk of chunks) {
    scores.set(chunk.id, dotProduct(queryVector, chunk.vector));
  }
  return scores;
}
