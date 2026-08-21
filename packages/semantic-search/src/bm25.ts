// ============================================================// Semantic Search Widget — BM25 Keyword Scoring// ============================================================

import { tokenizeToTerms } from './tokenizer';
import { EmbeddedChunk } from './types';

/**
 * Compute BM25 score for a query against a single document.
 *
 * BM25 formula:
 *   score(D, Q) = Σ IDF(qi) × (f(qi,D) × (k1 + 1)) / (f(qi,D) + k1 × (1 - b + b × |D| / avgdl))
 *
 * Where:
 *   f(qi,D) = term frequency of qi in document D
 *   |D|     = document length (in tokens)
 *   avgdl   = average document length across corpus
 *   IDF(qi) = log((N - n(qi) + 0.5) / (n(qi) + 0.5) + 1)
 *   N       = total number of documents
 *   n(qi)   = number of documents containing qi
 */
export function bm25Score(
  query: string,
  chunk: EmbeddedChunk,
  idf: Record<string, number>,
  avgDocLength: number,
  totalDocs: number,
  k1: number = 1.2,
  b: number = 0.75,
): number {
  const queryTerms = tokenizeToTerms(query);
  if (queryTerms.length === 0) return 0;

  const docTerms = tokenizeToTerms(chunk.text);
  const docLength = docTerms.length;
  if (docLength === 0) return 0;

  // Count term frequencies in the document
  const tf: Record<string, number> = {};
  for (const term of docTerms) {
    tf[term] = (tf[term] || 0) + 1;
  }

  let score = 0;

  for (const term of queryTerms) {
    const f = tf[term] || 0;
    if (f === 0) continue;

    const termIdf = idf[term] ?? Math.log((totalDocs + 1) / 1);
    const numerator = f * (k1 + 1);
    const denominator = f + k1 * (1 - b + b * (docLength / avgDocLength));
    score += termIdf * (numerator / denominator);
  }

  return score;
}

/**
 * Compute IDF values for all terms in the corpus.
 * IDF(qi) = log((N - n(qi) + 0.5) / (n(qi) + 0.5) + 1)
 */
export function computeIdf(
  chunks: EmbeddedChunk[],
): { idf: Record<string, number>; avgDocLength: number; vocabulary: Record<string, number> } {
  const N = chunks.length;
  const docFreqs: Record<string, number> = {};
  const vocabulary: Record<string, number> = {};
  let totalLength = 0;
  let vocabIndex = 0;

  for (const chunk of chunks) {
    const terms = tokenizeToTerms(chunk.text);
    totalLength += terms.length;

    const uniqueTerms = new Set(terms);
    for (const term of uniqueTerms) {
      docFreqs[term] = (docFreqs[term] || 0) + 1;
      if (!(term in vocabulary)) {
        vocabulary[term] = vocabIndex++;
      }
    }
  }

  const idf: Record<string, number> = {};
  for (const [term, df] of Object.entries(docFreqs)) {
    idf[term] = Math.log((N - df + 0.5) / (df + 0.5) + 1);
  }

  return {
    idf,
    avgDocLength: N > 0 ? totalLength / N : 1,
    vocabulary,
  };
}

/**
 * Compute BM25 scores for a query against all chunks, returned as a map of chunkId → score.
 */
export function bm25Batch(
  query: string,
  chunks: EmbeddedChunk[],
  idf: Record<string, number>,
  avgDocLength: number,
  k1: number = 1.2,
  b: number = 0.75,
): Map<string, number> {
  const scores = new Map<string, number>();
  const totalDocs = chunks.length;

  for (const chunk of chunks) {
    const score = bm25Score(query, chunk, idf, avgDocLength, totalDocs, k1, b);
    scores.set(chunk.id, score);
  }

  return scores;
}
