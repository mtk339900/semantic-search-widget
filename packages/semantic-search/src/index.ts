// semantic-search — Core Engine
//
// Pure TypeScript: no React, no DOM. Works in both Node.js and browser.
//
// Public API:
//   - SearchEngine  (hybrid semantic + BM25 search)
//   - encodeText    (single text → embedding vector)
//   - encodeBatch   (multiple texts → embedding vectors)
//   - chunkMarkdown (Markdown → heading-aware chunks)
//   - computeIdf    (BM25 statistics)
//   - etc.

export { SearchEngine, highlightSnippet } from './search-engine';
export { encodeText, encodeBatch, resetEncoder, getEncoder, DEFAULT_MODEL_ID, DEFAULT_DIMENSIONS } from './embeddings';
export { cosineSimilarity, dotProduct, normalize, batchCosineSimilarity } from './similarity';
export { bm25Score, bm25Batch, computeIdf } from './bm25';
export { chunkMarkdown } from './chunker';
export { tokenize, tokenizeToTerms, countTokens, stem } from './tokenizer';

export type {
  Chunk,
  EmbeddedChunk,
  SearchIndex,
  SearchResult,
  SemanticSearchConfig,
  Token,
  HeadingNode,
  ChunkerOptions,
} from './types';

export { DEFAULT_CONFIG, DEFAULT_CHUNKER_OPTIONS } from './types';
