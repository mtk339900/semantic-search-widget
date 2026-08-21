// ============================================================
// Semantic Search Widget — Hybrid Search Engine
// ============================================================

import { SearchIndex, SearchResult, SemanticSearchConfig, DEFAULT_CONFIG, EmbeddedChunk } from './types';
import { bm25Batch } from './bm25';
import { encodeText } from './embeddings';
import { batchCosineSimilarity } from './similarity';

/**
 * The main search engine. Loads an index and performs hybrid search.
 *
 * V2: Uses a pre-trained sentence-transformer model for semantic
 * encoding. The model is loaded lazily on first search.
 */
export class SearchEngine {
  private index: SearchIndex | null = null;
  private config: Required<Omit<SemanticSearchConfig, 'indexUrl'>>;
  private modelLoaded = false;
  private modelLoading: Promise<void> | null = null;

  constructor(config?: Partial<SemanticSearchConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async loadIndex(indexData: SearchIndex): Promise<void> {
    this.index = indexData;
  }

  async loadIndexFromUrl(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch search index: ' + response.status + ' ' + response.statusText);
    }
    const data: SearchIndex = await response.json();
    await this.loadIndex(data);
  }

  /**
   * Ensure the transformer model is loaded. Called lazily on first search.
   */
  private async ensureModel(): Promise<void> {
    if (this.modelLoaded) return;
    if (this.modelLoading) {
      await this.modelLoading;
      return;
    }
    this.modelLoading = (async () => {
      // Importing encodeText triggers the model download
      const { getEncoder } = await import('./embeddings');
      await getEncoder(this.config.modelId);
      this.modelLoaded = true;
    })();
    await this.modelLoading;
  }

  /**
   * Perform hybrid search: semantic (transformer) + keyword (BM25).
   * Now async because query encoding requires the model.
   */
  async search(query: string): Promise<SearchResult[]> {
    if (!this.index) {
      throw new Error('Search index not loaded. Call loadIndex() first.');
    }

    const trimmed = query.trim();
    if (trimmed.length === 0) return [];

    // Load model lazily on first search
    await this.ensureModel();

    const { chunks, idf, avgDocLength } = this.index;
    const { semanticWeight, keywordWeight, maxResults, minScore, bm25K1, bm25B } = this.config;

    // --- Semantic scoring (real transformer embeddings) ---
    const queryVector = await encodeText(trimmed, this.config.modelId);
    const semanticScores = batchCosineSimilarity(queryVector, chunks);

    // --- Keyword scoring (BM25) ---
    const keywordScores = bm25Batch(trimmed, chunks, idf, avgDocLength, bm25K1, bm25B);

    // --- Normalize BM25 scores to [0,1] range ---
    let maxBM25 = 0;
    for (const s of keywordScores.values()) {
      if (s > maxBM25) maxBM25 = s;
    }
    const bm25Norm = maxBM25 > 0 ? 1 / maxBM25 : 0;

    // --- Combine scores ---
    // Semantic scores are already in [0,1] from cosine similarity
    const results: SearchResult[] = [];

    for (const chunk of chunks) {
      const semScore = semanticScores.get(chunk.id) ?? 0;
      const kwScore = (keywordScores.get(chunk.id) || 0) * bm25Norm;
      const finalScore = semanticWeight * semScore + keywordWeight * kwScore;

      if (finalScore < minScore) continue;

      results.push({
        chunk,
        score: finalScore,
        semanticScore: semScore,
        keywordScore: kwScore,
        highlightedSnippet: highlightSnippet(trimmed, chunk.text),
      });
    }

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, maxResults);
  }

  /** Check if the index is loaded (model loads lazily on first search). */
  get isReady(): boolean {
    return this.index !== null;
  }

  /** Check if the transformer model is loaded. */
  get isModelReady(): boolean {
    return this.modelLoaded;
  }
}

/**
 * Extract a relevant snippet from chunk text and highlight matching terms.
 * Returns HTML with <mark> tags around matched keywords.
 */
export function highlightSnippet(query: string, text: string, maxLen: number = 200): string {
  const queryTerms = new Set(tokenizeToTerms(query));
  if (queryTerms.size === 0) {
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  }

  // Find the best paragraph
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  let bestPara = paragraphs[0] || text;
  let bestScore = 0;

  for (const para of paragraphs) {
    const tokens = tokenize(para);
    const tokenValues = new Set(tokens.map(t => t.value));
    let matches = 0;
    for (const qt of queryTerms) {
      if (tokenValues.has(qt)) matches++;
    }
    const score = matches / Math.max(queryTerms.size, 1);
    if (score > bestScore) {
      bestScore = score;
      bestPara = para;
    }
  }

  // Truncate if too long
  let snippet = bestPara.trim();
  if (snippet.length > maxLen) {
    const breakPoint = snippet.lastIndexOf('.', maxLen);
    if (breakPoint > maxLen * 0.5) {
      snippet = snippet.slice(0, breakPoint + 1);
    } else {
      snippet = snippet.slice(0, maxLen) + '...';
    }
  }

  // Highlight matching terms
  const snippetTokens = tokenize(snippet);
  let result = '';
  let lastEnd = 0;

  for (const token of snippetTokens) {
    if (queryTerms.has(token.value)) {
      const originalStart = findOriginalWord(snippet, token.value, lastEnd);
      if (originalStart >= 0) {
        const originalWord = snippet.slice(
          originalStart,
          originalStart + findWordLength(snippet, originalStart),
        );
        result += escapeHtml(snippet.slice(lastEnd, originalStart));
        result += '<mark>' + escapeHtml(originalWord) + '</mark>';
        lastEnd = originalStart + originalWord.length;
      }
    }
  }

  result += escapeHtml(snippet.slice(lastEnd));

  return result || escapeHtml(snippet);
}

/**
 * Find the start index of a word in text that stems to 'stemmed'.
 */
function findOriginalWord(text: string, stemmed: string, fromIndex: number): number {
  const words = text.slice(fromIndex).match(/[a-zA-Z0-9'-]+/g);
  if (!words) return -1;

  let offset = 0;
  for (const word of words) {
    const idx = text.indexOf(word, fromIndex + offset);
    if (word.toLowerCase().startsWith(stemmed.slice(0, Math.min(4, stemmed.length)))) {
      return idx;
    }
    offset += word.length + 1;
  }
  return -1;
}

function findWordLength(text: string, start: number): number {
  let end = start;
  while (end < text.length && /[a-zA-Z0-9'-]/.test(text[end])) end++;
  return end - start;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Re-import tokenizer functions (used in highlightSnippet)
import { tokenize, tokenizeToTerms } from './tokenizer';
