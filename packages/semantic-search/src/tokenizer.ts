// ============================================================
// Semantic Search Widget — Tokenizer & Stemmer
// ============================================================

import { Token } from './types';

/**
 * A minimal list of very common English stop words.
 * Kept intentionally small — aggressive stop-word removal hurts
 * semantic search because it discards query intent words.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
  'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'it', 'its',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
  'not', 'no', 'nor', 'as', 'if', 'then', 'than', 'so', 'just', 'about',
  'also', 'very', 'often', 'however', 'too', 'more', 'most', 'some', 'any',
  'each', 'every', 'all', 'both', 'few', 'many', 'such', 'only', 'own',
  'same', 'other', 'up', 'out', 'into', 'over', 'after', 'before',
]);

/**
 * Simple suffix-stripping stemmer inspired by Porter Stemmer.
 * Handles the most common English suffixes.
 * NOT a full Porter implementation — trades accuracy for bundle size.
 */
export function stem(word: string): string {
  if (word.length < 4) return word;

  let s = word.toLowerCase();

  // Step 1: plurals & past participles
  if (s.endsWith('sses')) s = s.slice(0, -2);
  else if (s.endsWith('ies')) s = s.slice(0, -2);
  else if (s.endsWith('ss')) { /* keep */ }
  else if (s.endsWith('s')) s = s.slice(0, -1);

  if (s.endsWith('eed')) {
    const stem = s.slice(0, -3);
    if (stem.length > 0 && countConsonants(stem) > 1) s = stem + 'ee';
  } else if (s.endsWith('ed') && s.length > 4) {
    const stem = s.slice(0, -2);
    if (hasVowel(stem)) s = stem;
  } else if (s.endsWith('ing') && s.length > 5) {
    const stem = s.slice(0, -3);
    if (hasVowel(stem)) s = stem;
  }

  // Step 2: y → i
  if (s.endsWith('y') && s.length > 2 && !hasVowel(s.slice(0, -1))) {
    s = s.slice(0, -1) + 'i';
  }

  // Step 3: common suffixes (order matters)
  const suffixes = [
    ['ational', 'ate'], ['tional', 'tion'], ['enci', 'ence'],
    ['anci', 'ance'], ['izer', 'ize'], ['ably', 'able'],
    ['alli', 'al'], ['entli', 'ent'], ['eli', 'e'],
    ['ousli', 'ous'], ['ization', 'ize'], ['ation', 'ate'],
    ['ator', 'ate'], ['alism', 'al'], ['iveness', 'ive'],
    ['fulness', 'ful'], ['ousness', 'ous'], ['aliti', 'al'],
    ['iviti', 'ive'], ['biliti', 'ble'],
  ];

  for (const [suffix, replacement] of suffixes) {
    if (s.endsWith(suffix) && s.length > suffix.length + 2) {
      s = s.slice(0, -suffix.length) + replacement;
      break;
    }
  }

  return s;
}

function hasVowel(s: string): boolean {
  return /[aeiou]/.test(s);
}

function countConsonants(s: string): number {
  let count = 0;
  for (const ch of s) {
    if (!/[aeiou]/.test(ch)) count++;
  }
  return count;
}

/**
 * Tokenise a string into an array of {value, position} tokens.
 * Splits on non-alphanumeric, lowercases, stems, and removes stop words.
 */
export function tokenize(text: string): Token[] {
  const raw = text
    .toLowerCase()
    .replace(/['']/g, "'")
    .split(/[^a-z0-9'-]+/)
    .filter(w => w.length > 1 && !/^[0-9]+$/.test(w));

  const tokens: Token[] = [];
  let position = 0;

  for (const word of raw) {
    if (STOP_WORDS.has(word)) continue;
    const stemmed = stem(word);
    if (stemmed.length < 2) continue;
    tokens.push({ value: stemmed, position: position++ });
  }

  return tokens;
}

/**
 * Return just the stemmed token strings (no positions).
 */
export function tokenizeToTerms(text: string): string[] {
  return tokenize(text).map(t => t.value);
}

/**
 * Simple word count for rough token estimation.
 */
export function countTokens(text: string): number {
  return tokenize(text).length;
}
