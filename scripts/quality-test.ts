/**
 * Semantic Search — Quality Benchmark
 *
 * Runs predefined queries against the search index and measures
 * whether the expected source documents appear in the top-K results.
 * Reports precision, recall, and a per-query breakdown.
 *
 * Usage:
 *   bun run scripts/quality-test.ts
 *   npm run test:quality  (if "test:quality" script is added to package.json)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cosineSimilarity, bm25Score, computeIdf } from 'semantic-search';
import { encodeText } from 'semantic-search';
import { tokenize } from 'semantic-search';
import type { SearchIndex, EmbeddedChunk } from 'semantic-search';

// ── Config ──────────────────────────────────────────────────────
const INDEX_PATH = resolve(import.meta.dirname, '../public/search-index.json');
const TOP_K = 5;
const SEMANTIC_WEIGHT = 0.7;
const KEYWORD_WEIGHT = 0.3;
const MIN_SCORE = 0.01;

// ── Test Suite ───────────────────────────────────────────────────
/** Each test: a query + which source file(s) should appear in top-K */
interface TestCase {
  query: string;
  /** At least one of these source paths must appear in top-K */
  expectedSources: string[];
  description: string;
}

const TESTS: TestCase[] = [
  {
    query: 'how to install and set up the framework',
    expectedSources: ['installation.md', 'getting-started.md'],
    description: 'Setup/install topic → installation or getting-started',
  },
  {
    query: 'user login and OAuth providers',
    expectedSources: ['authentication.md'],
    description: 'Auth topic → authentication',
  },
  {
    query: 'lazy loading and code splitting',
    expectedSources: ['performance.md'],
    description: 'Performance optimization → performance',
  },
  {
    query: 'file-based routing and guarded routes',
    expectedSources: ['routing.md'],
    description: 'Routing topic → routing',
  },
  {
    query: 'reactive state and stores',
    expectedSources: ['state-management.md'],
    description: 'State management → state-management',
  },
  {
    query: 'deploy to docker and CI/CD',
    expectedSources: ['deployment.md'],
    description: 'Deployment topic → deployment',
  },
  {
    query: 'unit testing with vitest',
    expectedSources: ['testing.md'],
    description: 'Testing topic → testing',
  },
  {
    query: 'component props and lifecycle hooks',
    expectedSources: ['components.md'],
    description: 'Components topic → components',
  },
  {
    query: 'data fetching and caching strategies',
    expectedSources: ['data-fetching.md'],
    description: 'Data fetching → data-fetching',
  },
  {
    query: 'environment variables and configuration files',
    expectedSources: ['configuration.md'],
    description: 'Configuration → configuration',
  },
  {
    query: 'common errors and debugging',
    expectedSources: ['troubleshooting.md'],
    description: 'Troubleshooting → troubleshooting',
  },
  {
    query: 'API calls and pagination',
    expectedSources: ['data-fetching.md'],
    description: 'API/pagination → data-fetching',
  },
  {
    query: 'middleware and programmatic navigation',
    expectedSources: ['routing.md'],
    description: 'Advanced routing → routing',
  },
  {
    query: 'mocking and component testing',
    expectedSources: ['testing.md'],
    description: 'Testing patterns → testing',
  },
  {
    query: 'Docker container and production tuning',
    expectedSources: ['deployment.md'],
    description: 'Docker/production → deployment',
  },
];

// ── Helpers ─────────────────────────────────────────────────────

function highlightScore(score: number, max: number): string {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 80) return `\x1b[32m${score.toFixed(4)}\x1b[0m`;  // green
  if (pct >= 50) return `\x1b[33m${score.toFixed(4)}\x1b[0m`;  // yellow
  return `\x1b[31m${score.toFixed(4)}\x1b[0m`;                 // red
}

function formatSource(path: string): string {
  return path.replace(/^content\//, '');
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('\n  ╔═══════════════════════════════════════════════════════╗');
  console.log('  ║     Semantic Search — Quality Benchmark              ║');
  console.log('  ╚═══════════════════════════════════════════════════════╝\n');

  // 1. Load index
  console.log(`  Loading index: ${INDEX_PATH}`);
  const index: SearchIndex = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
  console.log(`  Model: ${index.model} (${index.dimensions}d, ${index.chunkCount} chunks)\n`);

  // 2. Compute IDF if not already in index
  const idf = index.idf;
  const avgDocLen = index.avgDocLength;

  // 3. Encode query
  console.log('  Loading embedding model (first query only)…\n');

  let passed = 0;
  let failed = 0;
  const results: { test: TestCase; hit: boolean; topSources: string[]; topScore: number }[] = [];

  for (const tc of TESTS) {
    // Encode query
    const queryVector = await encodeText(tc.query);
    const queryTokens = tokenize(tc.query);

    // Score every chunk
    const scored = index.chunks.map((chunk: EmbeddedChunk) => {
      const semScore = cosineSimilarity(queryVector, chunk.vector);
      const kwScore = bm25Score(queryTokens, tokenize(chunk.text), idf, avgDocLen, 1.2, 0.75);
      const combined = SEMANTIC_WEIGHT * semScore + KEYWORD_WEIGHT * kwScore;
      return { chunk, semScore, kwScore, combined };
    });

    // Sort by combined score, take top-K
    const topK = scored
      .filter((s) => s.combined >= MIN_SCORE)
      .sort((a, b) => b.combined - a.combined)
      .slice(0, TOP_K);

    const topSources = topK.map((s) => s.chunk.sourcePath);
    const hit = tc.expectedSources.some((src) =>
      topSources.some((actual) => actual.endsWith(src))
    );

    if (hit) passed++;
    else failed++;

    results.push({ test: tc, hit, topSources, topScore: topK[0]?.combined ?? 0 });
  }

  // 4. Report
  const maxScore = Math.max(...results.map((r) => r.topScore));
  console.log('  ┌─────────────────────────────────────────────────────────────┐');
  console.log('  │ #  │ Status  │ Query                           │ Top Score  │');
  console.log('  ├────┼─────────┼─────────────────────────────────┼────────────┤');

  results.forEach((r, i) => {
    const status = r.hit
      ? '\x1b[32m  PASS  \x1b[0m'
      : '\x1b[31m  FAIL  \x1b[0m';
    const num = String(i + 1).padStart(2, ' ');
    const query = r.test.query.length > 30
      ? r.test.query.slice(0, 30) + '…'
      : r.test.query.padEnd(32);
    const score = r.topScore > 0 ? highlightScore(r.topScore, maxScore) : 'n/a      ';
    console.log(`  │ ${num} │ ${status} │ ${query} │ ${score}  │`);
  });

  console.log('  └────┴─────────┴─────────────────────────────────┴────────────┘');
  console.log();

  // 5. Failed details
  if (failed > 0) {
    console.log('  \x1b[31m  Failed queries detail:\x1b[0m\n');
    for (const r of results.filter((r) => !r.hit)) {
      console.log(`    Query:       "${r.test.query}"`);
      console.log(`    Expected:    ${r.test.expectedSources.join(', ')}`);
      console.log(`    Got instead: ${r.topSources.slice(0, 3).map(formatSource).join(', ')}`);
      console.log();
    }
  }

  // 6. Summary
  const total = TESTS.length;
  const pct = ((passed / total) * 100).toFixed(0);
  console.log('  ─────────────────────────────────────────────');
  console.log(`  Total:  ${total}  │  Passed: ${passed}  │  Failed: ${failed}  │  Score: ${pct}%`);
  console.log('  ─────────────────────────────────────────────\n');

  if (failed === 0) {
    console.log('  \x1b[32m  All tests passed! ✓\x1b[0m\n');
  } else {
    console.log(`  \x1b[33m  ${failed} test(s) failed. Review queries or index content.\x1b[0m\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\x1b[31m  Fatal error:\x1b[0m', err);
  process.exit(1);
});
