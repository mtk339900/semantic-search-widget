import { describe, it, expect } from 'vitest';
import { cosineSimilarity, dotProduct, normalize } from '../similarity';

describe('cosineSimilarity()', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 10);
  });

  it('returns 1 for identical normalized vectors', () => {
    const v = normalize([1, 2, 3, 4, 5]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 10);
  });

  it('returns 0 for orthogonal vectors', () => {
    // [1, 0] and [0, 1] are orthogonal
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 10);
  });

  it('returns close to -1 for opposite vectors', () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 10);
  });

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('throws on dimension mismatch', () => {
    const a = [1, 2, 3];
    const b = [1, 2];
    expect(() => cosineSimilarity(a, b)).toThrow('Vector dimension mismatch');
  });

  it('returns positive value for similar vectors', () => {
    const a = [1, 2, 3];
    const b = [1.1, 2.1, 3.1];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.99);
  });

  it('handles high-dimensional vectors', () => {
    const dim = 128;
    const a = Array.from({ length: dim }, (_, i) => i + 1);
    const b = Array.from({ length: dim }, (_, i) => i + 1);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 10);
  });

  it('returns 0 when one vector is all zeros', () => {
    const a = [0, 0, 0];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('is symmetric: cos(a,b) === cos(b,a)', () => {
    const a = [3, 1, 4, 1, 5];
    const b = [2, 7, 1, 8, 2];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });

  it('clamps results to [-1, 1]', () => {
    const a = [0.1, 0.9];
    const b = [0.8, 0.2];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });
});

describe('dotProduct()', () => {
  it('computes accurate dot product for simple vectors', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    expect(dotProduct(a, b)).toBe(32);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(dotProduct([1, 0], [0, 1])).toBe(0);
  });

  it('returns squared magnitude for self dot product', () => {
    const v = [3, 4];
    // 3^2 + 4^2 = 9 + 16 = 25
    expect(dotProduct(v, v)).toBe(25);
  });

  it('throws on dimension mismatch', () => {
    expect(() => dotProduct([1, 2], [1, 2, 3])).toThrow('Vector dimension mismatch');
  });

  it('handles single-element vectors', () => {
    expect(dotProduct([5], [3])).toBe(15);
  });

  it('handles vectors with negative values', () => {
    const a = [1, -2, 3];
    const b = [-1, 2, -3];
    // -1 + -4 + -9 = -14
    expect(dotProduct(a, b)).toBe(-14);
  });

  it('handles floating point vectors', () => {
    const a = [0.1, 0.2, 0.3];
    const b = [0.4, 0.5, 0.6];
    const result = dotProduct(a, b);
    // 0.04 + 0.10 + 0.18 = 0.32
    expect(result).toBeCloseTo(0.32, 10);
  });

  it('is symmetric: dot(a,b) === dot(b,a)', () => {
    const a = [7, 2, 5];
    const b = [3, 8, 1];
    expect(dotProduct(a, b)).toBe(dotProduct(b, a));
  });

  it('handles zero vectors', () => {
    expect(dotProduct([0, 0, 0], [1, 2, 3])).toBe(0);
    expect(dotProduct([1, 2, 3], [0, 0, 0])).toBe(0);
  });

  it('returns 0 for empty vectors', () => {
    expect(dotProduct([], [])).toBe(0);
  });

  it('handles high-dimensional vectors accurately', () => {
    const dim = 128;
    const a = Array.from({ length: dim }, (_, i) => 0.01 * (i + 1));
    const b = Array.from({ length: dim }, (_, i) => 0.01 * (dim - i));
    const expected = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    expect(dotProduct(a, b)).toBeCloseTo(expected, 10);
  });
});

describe('normalize()', () => {
  it('produces a unit vector (magnitude = 1)', () => {
    const v = normalize([3, 4]);
    const magnitude = Math.sqrt(v[0] ** 2 + v[1] ** 2);
    expect(magnitude).toBeCloseTo(1, 10);
  });

  it('preserves direction', () => {
    const original = [3, 4, 0];
    const normalized = normalize([...original]);
    const ratio = normalized[0] / original[0];
    expect(normalized[0] / original[0]).toBeCloseTo(normalized[1] / original[1], 10);
  });

  it('mutates and returns the same array reference', () => {
    const v = [3, 4];
    const result = normalize(v);
    expect(result).toBe(v);
  });

  it('handles a zero vector by returning it unchanged', () => {
    const v = [0, 0, 0];
    const result = normalize(v);
    expect(result).toEqual([0, 0, 0]);
  });

  it('handles a single-element vector', () => {
    const v = normalize([5]);
    expect(v[0]).toBeCloseTo(1, 10);
  });

  it('handles negative values correctly', () => {
    const v = normalize([-3, 4]);
    const magnitude = Math.sqrt(v[0] ** 2 + v[1] ** 2);
    expect(magnitude).toBeCloseTo(1, 10);
    expect(v[0]).toBeCloseTo(-0.6, 5);
    expect(v[1]).toBeCloseTo(0.8, 5);
  });

  it('handles high-dimensional vectors', () => {
    const dim = 128;
    const v = normalize(Array.from({ length: dim }, (_, i) => i + 1));
    const magnitude = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(magnitude).toBeCloseTo(1, 10);
  });

  it('normalizing an already normalized vector gives same result', () => {
    const v1 = normalize([1, 2, 3, 4, 5]);
    const v2 = normalize([...v1]);
    for (let i = 0; i < v1.length; i++) {
      expect(v2[i]).toBeCloseTo(v1[i], 10);
    }
  });
});
