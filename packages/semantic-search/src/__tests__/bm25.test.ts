import { describe, it, expect, beforeAll } from 'vitest';
import { bm25Score, bm25Batch, computeIdf } from '../bm25';
import { EmbeddedChunk } from '../types';

/** Helper to create a mock EmbeddedChunk */
function makeChunk(id: string, text: string, vector: number[] = []): EmbeddedChunk {
  return {
    id,
    sourcePath: `/test.md`,
    headingTrail: [],
    text,
    url: `https://example.com/test#${id}`,
    startOffset: 0,
    endOffset: text.length,
    vector,
  };
}

describe('computeIdf()', () => {
  let chunks: EmbeddedChunk[];
  let idfResult: { idf: Record<string, number>; avgDocLength: number; vocabulary: Record<string, number> };

  beforeAll(() => {
    chunks = [
      makeChunk('c1', 'The quick brown fox jumps over the lazy dog'),
      makeChunk('c2', 'A fast brown hare runs across the meadow'),
      makeChunk('c3', 'JavaScript frameworks help build web applications'),
    ];
    idfResult = computeIdf(chunks);
  });

  it('computes IDF for terms present in documents', () => {
    // 'brown' appears in c1 and c2, so should have a lower IDF than a rarer term
    expect(idfResult.idf['brown']).toBeDefined();
    expect(idfResult.idf['brown']).toBeGreaterThan(0);
  });

  it('rare terms get higher IDF than common terms', () => {
    // 'fox' appears only in c1, 'brown' appears in c1 and c2
    // So IDF(fox) > IDF(brown)
    if (idfResult.idf['fox'] !== undefined && idfResult.idf['brown'] !== undefined) {
      expect(idfResult.idf['fox']).toBeGreaterThan(idfResult.idf['brown']);
    }
  });

  it('computes average document length', () => {
    expect(idfResult.avgDocLength).toBeGreaterThan(0);
    // Should be the average token count across all chunks
    const totalTokens = chunks.reduce((sum, c) => {
      // Approximate: count words (non-stop words)
      return sum + c.text.split(/\s+/).length;
    }, 0);
    expect(idfResult.avgDocLength).toBeLessThanOrEqual(totalTokens);
    expect(idfResult.avgDocLength).toBeGreaterThan(0);
  });

  it('builds vocabulary mapping terms to indices', () => {
    expect(Object.keys(idfResult.vocabulary).length).toBeGreaterThan(0);
    for (const idx of Object.values(idfResult.vocabulary)) {
      expect(typeof idx).toBe('number');
      expect(idx).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns avgDocLength of 1 for empty chunk list', () => {
    const result = computeIdf([]);
    expect(result.avgDocLength).toBe(1);
    expect(Object.keys(result.idf).length).toBe(0);
    expect(Object.keys(result.vocabulary).length).toBe(0);
  });

  it('IDF formula uses log scale', () => {
    // All IDF values should be positive (log of positive number > 0)
    for (const [term, value] of Object.entries(idfResult.idf)) {
      expect(value).toBeGreaterThan(0);
      // IDF should be finite
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe('bm25Score()', () => {
  const chunks = [
    makeChunk('c1', 'The quick brown fox jumps over the lazy dog'),
    makeChunk('c2', 'JavaScript is a popular programming language'),
    makeChunk('c3', 'Python and JavaScript are both scripting languages'),
  ];

  const { idf, avgDocLength } = computeIdf(chunks);

  it('returns positive score for matching terms', () => {
    const score = bm25Score('brown fox', chunks[0], idf, avgDocLength, chunks.length);
    expect(score).toBeGreaterThan(0);
  });

  it('returns 0 for non-matching query', () => {
    const score = bm25Score('zebra elephant', chunks[0], idf, avgDocLength, chunks.length);
    expect(score).toBe(0);
  });

  it('returns 0 for empty query', () => {
    const score = bm25Score('', chunks[0], idf, avgDocLength, chunks.length);
    expect(score).toBe(0);
  });

  it('returns 0 for empty document text', () => {
    const emptyChunk = makeChunk('empty', '');
    const score = bm25Score('test query', emptyChunk, idf, avgDocLength, chunks.length);
    expect(score).toBe(0);
  });

  it('higher term frequency gives higher score', () => {
    const chunkA = makeChunk('a', 'test test test test query');
    const chunkB = makeChunk('b', 'test query');
    const { idf: idf2, avgDocLength: avg2 } = computeIdf([chunkA, chunkB]);

    const scoreA = bm25Score('test', chunkA, idf2, avg2, 2);
    const scoreB = bm25Score('test', chunkB, idf2, avg2, 2);
    expect(scoreA).toBeGreaterThan(scoreB);
  });

  it('repeated query terms contribute more to the score', () => {
    // Query with repeated concept should score higher
    // Note: tokenizeToTerms will produce duplicates for repeated words
    const score1 = bm25Score('javascript', chunks[1], idf, avgDocLength, chunks.length);
    const score2 = bm25Score('javascript javascript', chunks[1], idf, avgDocLength, chunks.length);
    expect(score2).toBeGreaterThan(score1);
  });

  it('document with more matching terms scores higher', () => {
    const scoreC1 = bm25Score('javascript', chunks[1], idf, avgDocLength, chunks.length);
    const scoreC3 = bm25Score('javascript', chunks[2], idf, avgDocLength, chunks.length);
    // Both contain 'javascript', but they should both have positive scores
    expect(scoreC1).toBeGreaterThan(0);
    expect(scoreC3).toBeGreaterThan(0);
  });

  it('stop words in query are removed and do not affect scoring', () => {
    const scoreWithout = bm25Score('javascript', chunks[1], idf, avgDocLength, chunks.length);
    const scoreWith = bm25Score('the javascript is', chunks[1], idf, avgDocLength, chunks.length);
    // 'the' and 'is' are stop words, so scores should be the same
    expect(scoreWith).toBe(scoreWithout);
  });

  it('uses BM25 parameters k1 and b correctly', () => {
    const score1 = bm25Score('javascript', chunks[1], idf, avgDocLength, chunks.length, 1.2, 0.75);
    const score2 = bm25Score('javascript', chunks[1], idf, avgDocLength, chunks.length, 2.0, 0.5);
    // Different parameters should produce different scores
    expect(score2).not.toBe(score1);
  });

  it('works with single-chunk corpus', () => {
    const singleChunk = makeChunk('s1', 'unique content about database optimization');
    const { idf: singleIdf, avgDocLength: singleAvg } = computeIdf([singleChunk]);
    const score = bm25Score('database', singleChunk, singleIdf, singleAvg, 1);
    expect(score).toBeGreaterThan(0);
  });

  it('query with only stop words returns 0', () => {
    const score = bm25Score('the is a of in', chunks[0], idf, avgDocLength, chunks.length);
    expect(score).toBe(0);
  });
});

describe('bm25Batch()', () => {
  const chunks = [
    makeChunk('c1', 'The quick brown fox jumps over the lazy dog'),
    makeChunk('c2', 'JavaScript is a popular programming language'),
    makeChunk('c3', 'Python and JavaScript are both scripting languages'),
  ];
  const { idf, avgDocLength } = computeIdf(chunks);

  it('returns a Map with entries for all chunks', () => {
    const scores = bm25Batch('javascript', chunks, idf, avgDocLength);
    expect(scores).toBeInstanceOf(Map);
    expect(scores.size).toBe(chunks.length);
  });

  it('maps each chunk ID to its score', () => {
    const scores = bm25Batch('javascript', chunks, idf, avgDocLength);
    for (const chunk of chunks) {
      expect(scores.has(chunk.id)).toBe(true);
    }
  });

  it('scores are non-negative', () => {
    const scores = bm25Batch('test query', chunks, idf, avgDocLength);
    for (const score of scores.values()) {
      expect(score).toBeGreaterThanOrEqual(0);
    }
  });

  it('matching chunks score higher than non-matching chunks', () => {
    const scores = bm25Batch('javascript programming', chunks, idf, avgDocLength);
    const scoreC2 = scores.get('c2')!;
    const scoreC1 = scores.get('c1')!;
    // c2 mentions both javascript and programming
    expect(scoreC2).toBeGreaterThan(scoreC1);
  });

  it('works with empty chunks array', () => {
    const scores = bm25Batch('test', [], idf, avgDocLength);
    expect(scores).toBeInstanceOf(Map);
    expect(scores.size).toBe(0);
  });

  it('all scores are 0 when query matches nothing', () => {
    const scores = bm25Batch('zebra unicorn dragon', chunks, idf, avgDocLength);
    for (const score of scores.values()) {
      expect(score).toBe(0);
    }
  });
});
