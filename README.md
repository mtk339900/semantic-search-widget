# Semantic Search Widget

**Zero-backend semantic search for documentation sites — powered by sentence-transformer embeddings running entirely in the browser.**

A monorepo with three packages: a pure-TypeScript search engine, a drop-in React widget, and a CLI for building search indexes from Markdown files.

---

## How It Works

```
Build Time (CLI)                         Runtime (Browser)

Markdown files                           User types query
       │                                       │
       ▼                                       ▼
 Heading-aware                         all-MiniLM-L6-v2
 chunking (300 tok)                    encodes query → 384d
       │                                       │
       ▼                                       ▼
 all-MiniLM-L6-v2                      Cosine similarity
 encodes chunks → 384d                against 141 pre-computed
       │                                chunk vectors
       ▼                                       │
 BM25 stats (IDF,                     ┌──────┴──────┐
 avg doc length)                      │  0.7×sem +  │
       │                              │  0.3×BM25   │
       ▼                              └──────┬──────┘
 search-index.json (1.3 MB)                  │
       │                                       ▼
       └───────── fetch() ───────────── Ranked results
```

No API keys. No server. The transformer model (~22MB) downloads once and caches in the browser.

---

## Monorepo Structure

```
semantic-search-widget/
├── packages/
│   ├── semantic-search/          # Core engine (pure TypeScript, no React)
│   │   ├── src/
│   │   │   ├── types.ts           # Shared types and defaults
│   │   │   ├── tokenizer.ts       # Custom stemmer + stop words
│   │   │   ├── chunker.ts         # Heading-aware Markdown chunker
│   │   │   ├── embeddings.ts      # @huggingface/transformers wrapper
│   │   │   ├── similarity.ts      # Cosine similarity, batch scoring
│   │   │   ├── bm25.ts            # BM25 keyword scoring
│   │   │   ├── search-engine.ts   # Hybrid search orchestrator
│   │   │   ├── index.ts           # Public barrel exports
│   │   │   └── __tests__/         # 6 test files, 147 test cases
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── react-semantic-search/    # React widget (npm package)
│   │   ├── src/
│   │   │   ├── index.ts           # Public exports
│   │   │   ├── SearchWidget.tsx   # Drop-in combobox component
│   │   │   ├── use-semantic-search.ts  # React hook
│   │   │   └── utils.ts           # cn() utility
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── semantic-search-cli/      # CLI tool (npm bin)
│       ├── src/
│       │   └── index.ts           # CLI entry point
│       ├── package.json
│       └── tsconfig.json
│
├── src/                          # Demo Next.js app
├── content/                      # Sample Markdown docs (12 files)
├── public/search-index.json      # Pre-built index (141 chunks)
├── package.json                  # Workspace root + demo app
└── README.md
```

---

## Quick Start

### 1. Build the Search Index

```bash
npx semantic-search-cli --input ./docs --output ./public/search-index.json
```

This reads all `.md` files from `./docs`, splits them into heading-aware chunks, encodes each chunk with `all-MiniLM-L6-v2`, computes BM25 statistics, and writes a `search-index.json` file.

### 2. Drop the Widget Into Your App

```bash
npm install react-semantic-search
```

```tsx
import { SearchWidget } from 'react-semantic-search';

export default function Layout() {
  return (
    <div>
      <SearchWidget indexUrl="/search-index.json" />
    </div>
  );
}
```

That's it. The widget handles everything: lazy index loading, model downloading, hybrid search, keyboard navigation, search history, and result display.

---

## Packages

### `semantic-search`

The core engine. No framework dependency — works in Node.js and browsers.

```ts
import {
  SearchEngine,
  encodeText,
  chunkMarkdown,
  computeIdf,
  cosineSimilarity,
  type SearchResult,
  type SearchIndex,
} from 'semantic-search';
```

### `react-semantic-search`

Drop-in React component with built-in UX.

```tsx
import { SearchWidget, useSemanticSearch } from 'react-semantic-search';

// Full widget with UI
<SearchWidget
  indexUrl="/search-index.json"
  placeholder="Search docs..."
  showStats={true}
/>

// Headless hook for custom UI
const { query, setQuery, results, isSearching, isLoading, init } = useSemanticSearch({
  indexUrl: '/search-index.json',
});
```

**Widget features:**

- Lazy index loading (fetches on first focus, not on page mount)
- Lazy model loading (downloads MiniLM on first search)
- Hybrid ranking: 70% semantic (cosine similarity) + 30% keyword (BM25)
- Score breakdown bars per result
- Keyboard navigation (Arrow keys, Ctrl+K, Escape)
- Search history (localStorage, max 10 entries)
- Copy-to-clipboard per result
- Dark mode support
- Accessible (ARIA combobox pattern)

### `semantic-search-cli`

CLI for building search indexes.

```bash
# Default: reads ./content, outputs ./search-index.json
npx semantic-search-cli

# Custom paths
npx semantic-search-cli --input ./docs --output ./public/search-index.json

# Custom model
npx semantic-search-cli --model Xenova/all-MiniLM-L6-v2
```

---

## Architecture Decisions

### Why MiniLM in the Browser?

Most "semantic search" solutions require a backend (OpenAI embeddings, Pinecone, etc.). This project uses `@huggingface/transformers` to run `all-MiniLM-L6-v2` directly in the browser via ONNX Runtime. The trade-off:

- **Cost:** Free, no API keys
- **Privacy:** User queries never leave the browser
- **Latency:** ~22MB model download on first use (cached after), then ~50-200ms per query
- **Quality:** Trained on 1B+ sentence pairs — understands synonyms, paraphrases, and intent

### Why Hybrid (Semantic + BM25)?

Pure semantic search misses exact keyword matches (product names, error codes). Pure BM25 misses paraphrases. The 70/30 hybrid gives the best of both:

- "login not working" finds authentication troubleshooting (semantic)
- "ERR_CONNECTION_REFUSED" finds the exact error code (keyword)

### Why Heading-Aware Chunking?

Naive fixed-size chunking splits mid-section, destroying context. This chunker:

- Respects H1/H2/H3 boundaries as natural break points
- Merges short sections to avoid tiny fragments
- Splits long sections at paragraph boundaries with 40-token overlap
- Generates breadcrumb heading trails for result display

---

## Running the Demo

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Run tests
bun run test

# Lint
bun run lint

# Rebuild search index
bun run build:index
```

The demo at `/` showcases the widget with a documentation site (12 Markdown files, 141 chunks).
## or use the demo url (https://semantic-search-widget.vercel.app/)
---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Embeddings | `all-MiniLM-L6-v2` via `@huggingface/transformers` |
| Keyword Search | Custom BM25 implementation |
| Runtime | Browser (ONNX Runtime) / Node.js (CLI) |
| Widget | React 19, Framer Motion |
| Demo App | Next.js 16, Tailwind CSS 4 |
| Testing | Vitest (147 tests) |
| Language | TypeScript (strict mode) |

---

## Stats

- **141** documentation chunks indexed
- **384**-dimensional embedding vectors
- **1.3 MB** search index (vs 7.8 MB with the old approach)
- **~50-200ms** search latency (after model cached)
- **147** test cases across 6 test files
- **0** external API calls at runtime

---

## License

MIT
