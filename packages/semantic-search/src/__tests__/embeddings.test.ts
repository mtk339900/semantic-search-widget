import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { encodeText, resetEncoder, DEFAULT_MODEL_ID, DEFAULT_DIMENSIONS } from '../embeddings';
import { cosineSimilarity, normalize } from '../similarity';

describe('encodeText()', () => {
  afterAll(() => {
    resetEncoder();
  });

  it('returns a vector of 384 dimensions', async () => {
    const vec = await encodeText('hello world');
    expect(vec.length).toBe(DEFAULT_DIMENSIONS);
  }, 60000);

  it('returns a normalized vector (unit length)', async () => {
    const vec = await encodeText('semantic search is great');
    const magnitude = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
    expect(magnitude).toBeCloseTo(1, 4);
  }, 60000);

  it('identical texts produce identical vectors', async () => {
    const text = 'the quick brown fox jumps over the lazy dog';
    const v1 = await encodeText(text);
    const v2 = await encodeText(text);
    for (let i = 0; i < v1.length; i++) {
      expect(v2[i]).toBeCloseTo(v1[i], 10);
    }
  }, 60000);

  it('similar texts have high cosine similarity', async () => {
    const v1 = await encodeText('the cat sat on the mat');
    const v2 = await encodeText('a cat is sitting on a rug');
    const sim = cosineSimilarity(v1, v2);
    expect(sim).toBeGreaterThan(0.7);
  }, 60000);

  it('unrelated texts have lower cosine similarity', async () => {
    const v1 = await encodeText('database normalization techniques');
    const v2 = await encodeText('how to bake chocolate chip cookies');
    const sim = cosineSimilarity(v1, v2);
    expect(sim).toBeLessThan(0.5);
  }, 60000);

  it('paraphrases have high similarity', async () => {
    const v1 = await encodeText('how do I fix authentication problems');
    const v2 = await encodeText('troubleshooting login issues');
    const sim = cosineSimilarity(v1, v2);
    // This is the KEY test that the old system failed
    expect(sim).toBeGreaterThan(0.5);
  }, 60000);

  it('handles empty string', async () => {
    const vec = await encodeText('');
    expect(vec.length).toBe(DEFAULT_DIMENSIONS);
    expect(typeof vec[0]).toBe('number');
  }, 60000);

  it('handles special characters', async () => {
    const vec = await encodeText('!@#$%^&*()');
    expect(vec.length).toBe(DEFAULT_DIMENSIONS);
    expect(typeof vec[0]).toBe('number');
  }, 60000);

  it('no NaN or Infinity values', async () => {
    const vec = await encodeText('some random text here');
    for (const x of vec) {
      expect(Number.isNaN(x)).toBe(false);
      expect(Number.isFinite(x)).toBe(true);
    }
  }, 60000);
});

describe('DEFAULT_MODEL_ID', () => {
  it('is set to Xenova/all-MiniLM-L6-v2', () => {
    expect(DEFAULT_MODEL_ID).toBe('Xenova/all-MiniLM-L6-v2');
  });
});

describe('DEFAULT_DIMENSIONS', () => {
  it('is 384', () => {
    expect(DEFAULT_DIMENSIONS).toBe(384);
  });
});
