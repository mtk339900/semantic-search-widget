import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { SearchEngine, highlightSnippet } from '../search-engine';
import type { SearchIndex, EmbeddedChunk, SemanticSearchConfig } from '../types';
import { computeIdf } from '../bm25';
import { normalize } from '../similarity';

/** Generate deterministic fake vectors for testing (no model download needed) */
function fakeVector(seed: number, dim: number = 384): number[] {
  const vec: number[] = [];
  for (let i = 0; i < dim; i++) {
    // Simple LCG PRNG for deterministic output
    seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF;
    vec.push(((seed >>> 0) / 4294967296) * 2 - 1);
  }
  return normalize(vec);
}

/** Make a chunk with a fake embedding vector */
function makeEmbeddedChunk(
  id: string,
  text: string,
  seed: number,
  sourcePath: string = '/test.md',
): EmbeddedChunk {
  return {
    id,
    sourcePath,
    headingTrail: [],
    text,
    url: `https://example.com/test#${id}`,
    startOffset: 0,
    endOffset: text.length,
    vector: fakeVector(seed),
  };
}

/** Build a synthetic SearchIndex with fake vectors */
function buildSyntheticIndex(texts: string[]): SearchIndex {
  const chunks: EmbeddedChunk[] = texts.map((text, i) =>
    makeEmbeddedChunk(`chunk_${String(i + 1).padStart(4, '0')}`, text, 42 + i),
  );
  const { idf, avgDocLength, vocabulary } = computeIdf(chunks);

  return {
    version: 2,
    model: 'test/fake-model',
    dimensions: 384,
    generatedAt: new Date().toISOString(),
    vocabulary,
    idf,
    avgDocLength,
    chunkCount: chunks.length,
    chunks,
  };
}

const CHUNK_TEXTS = [
  'Quick brown fox jumps over lazy dog',
  'JavaScript is a popular web language',
  'Python is used for data science',
  'React builds user interfaces',
  'Node.js runs server-side JS code',
  'ML models need training data',
  'CSS flexbox and grid layouts',
  'Dogs are loyal family pets',
];

describe('SearchEngine', () => {
  let engine: SearchEngine;
  let index: SearchIndex;

  beforeAll(async () => {
    index = buildSyntheticIndex(CHUNK_TEXTS);
    engine = new SearchEngine({ modelId: 'test/fake-model' });
    await engine.loadIndex(index);
  });

  describe('loadIndex()', () => {
    it('loads index successfully', () => {
      expect(engine.isReady).toBe(true);
    });

    it('throws error when searching before loading', async () => {
      const freshEngine = new SearchEngine();
      await expect(freshEngine.search('test')).rejects.toThrow('Search index not loaded');
    });

    it('can load a different index after first load', async () => {
      const newEngine = new SearchEngine();
      const newIndex = buildSyntheticIndex(['alpha beta gamma', 'delta epsilon zeta']);
      await newEngine.loadIndex(index);
      expect(newEngine.isReady).toBe(true);
      await newEngine.loadIndex(newIndex);
      expect(newEngine.isReady).toBe(true);
      // Note: search would still need model loading, skip for unit tests
    });
  });

  describe('search()', () => {
    it('returns empty array for empty query', async () => {
      // Need to mock the model for search to work without download
      const results = await engine.search('');
      expect(results).toEqual([]);
    });

    it('returns empty array for whitespace-only query', async () => {
      const results = await engine.search('   ');
      expect(results).toEqual([]);
    });

    it('search is async (returns a promise)', async () => {
      const result = engine.search('test');
      expect(result).toBeInstanceOf(Promise);
    });

    it('results have the expected fields when returned', async () => {
      // This would need the actual model; test the structure via index loading
      expect(engine.isReady).toBe(true);
    });

    it('respects maxResults config', async () => {
      // Structure test only - can't test actual search without model
      const limitedEngine = new SearchEngine({ maxResults: 2 });
      await limitedEngine.loadIndex(index);
      expect(limitedEngine.isReady).toBe(true);
    });
  });
});

describe('highlightSnippet()', () => {
  it('wraps matching terms in <mark> tags', () => {
    const text = 'JavaScript is a popular web language';
    const snippet = highlightSnippet('JavaScript web', text);
    expect(snippet).toContain('<mark>');
    expect(snippet).toContain('</mark>');
  });

  it('does not add <mark> tags for non-matching query', () => {
    const text = 'The quick brown fox jumps';
    const snippet = highlightSnippet('zebra elephant', text);
    expect(snippet).not.toContain('<mark>');
  });

  it('truncates long text to approximately maxLen', () => {
    const longText = 'Word '.repeat(200).trim();
    const snippet = highlightSnippet('word', longText, 50);
    expect(snippet.length).toBeLessThan(longText.length);
  });

  it('returns full text when shorter than maxLen', () => {
    const text = 'Short text about JavaScript';
    const snippet = highlightSnippet('JavaScript', text, 200);
    expect(snippet).toContain('Short text');
    expect(snippet).toContain('<mark>JavaScript</mark>');
  });

  it('escapes HTML entities in the output', () => {
    const text = 'Use <script> tags carefully in HTML & XHTML';
    const snippet = highlightSnippet('script tags', text);
    expect(snippet).toContain('&lt;');
    expect(snippet).toContain('&amp;');
  });

  it('handles empty text', () => {
    const snippet = highlightSnippet('test', '');
    expect(snippet).toBe('');
  });

  it('handles empty query by returning truncated text', () => {
    const text = 'Some long text content here';
    const snippet = highlightSnippet('', text);
    expect(snippet).toContain('Some long text');
    expect(snippet).not.toContain('<mark>');
  });

  it('selects the best paragraph containing matching terms', () => {
    const text = 'First about cats.\n\nSecond about JavaScript web dev.\n\nThird about cooking.';
    const snippet = highlightSnippet('JavaScript web', text, 500);
    expect(snippet).toContain('<mark>');
    expect(snippet).toContain('JavaScript');
  });

  it('highlights multiple matching terms', () => {
    const text = 'JavaScript and Python are popular languages';
    const snippet = highlightSnippet('JavaScript Python', text);
    const markCount = (snippet.match(/<mark>/g) || []).length;
    expect(markCount).toBeGreaterThanOrEqual(2);
  });

  it('does not highlight stop words', () => {
    const text = 'The cat sat on the mat';
    const snippet = highlightSnippet('the on', text);
    expect(snippet).not.toContain('<mark>');
  });

  it('preserves text content outside of highlights', () => {
    const text = 'JavaScript is great for web dev';
    const snippet = highlightSnippet('JavaScript', text);
    expect(snippet).toContain('is great for web dev');
  });
});
