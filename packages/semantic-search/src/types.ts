// ============================================================// Semantic Search Widget — Core Type Definitions
// ============================================================

/** A single chunk of text extracted from a source document. */
export interface Chunk {
  /** Unique identifier, e.g. "chunk_0001" */
  id: string;
  /** Relative file path of the source document */
  sourcePath: string;
  /** Breadcrumb trail of headings leading to this chunk */
  headingTrail: string[];
  /** The actual text content of the chunk */
  text: string;
  /** URL that links to the section in the live site */
  url: string;
  /** Character offset where this chunk starts in the source */
  startOffset: number;
  /** Character offset where this chunk ends in the source */
  endOffset: number;
}

/** A chunk together with its pre-computed embedding vector. */
export interface EmbeddedChunk extends Chunk {
  /** Dense embedding vector (normalised to unit length) */
  vector: number[];
}

/** The on-disk index format (serialised as JSON).
 *
 * V2: Uses pre-trained sentence-transformer model.
 * Chunk vectors are pre-computed at build time.
 * At runtime, the same model encodes queries for cosine similarity.
 * No word vectors stored — the model handles encoding directly.
 */
export interface SearchIndex {
  version: number;
  /** HuggingFace model ID used for embeddings */
  model: string;
  /** Embedding dimensions (e.g. 384 for all-MiniLM-L6-v2) */
  dimensions: number;
  generatedAt: string;
  /** Vocabulary used for BM25 at index time */
  vocabulary: Record<string, number>;
  /** IDF values per term, matching the vocabulary */
  idf: Record<string, number>;
  /** Average document length (in tokens) for BM25 */
  avgDocLength: number;
  /** Total number of chunks in the index */
  chunkCount: number;
  chunks: EmbeddedChunk[];
}

/** A ranked search result returned to the UI. */
export interface SearchResult {
  chunk: EmbeddedChunk;
  /** Combined hybrid score (higher = better) */
  score: number;
  /** Pure semantic (cosine) score component */
  semanticScore: number;
  /** Pure keyword (BM25) score component */
  keywordScore: number;
  /** A short excerpt with <mark> tags around matching keywords */
  highlightedSnippet: string;
}

/** Configuration options exposed to the consumer. */
export interface SemanticSearchConfig {
  /** Path to the pre-built index JSON (relative or absolute URL) */
  indexUrl: string;
  /** Max results to return per query (default 8) */
  maxResults?: number;
  /** Weight of semantic score in hybrid ranking (default 0.7) */
  semanticWeight?: number;
  /** Weight of keyword (BM25) score (default 0.3) */
  keywordWeight?: number;
  /** Debounce delay in ms for keystrokes (default 250) */
  debounceMs?: number;
  /** BM25 k1 parameter (default 1.2) */
  bm25K1?: number;
  /** BM25 b parameter (default 0.75) */
  bm25B?: number;
  /** Minimum score threshold (default 0.01) */
  minScore?: number;
  /** HuggingFace model ID (default: 'Xenova/all-MiniLM-L6-v2') */
  modelId?: string;
}

/** Internal representation of a token with its position. */
export interface Token {
  value: string;
  position: number;
}

/** Parsed heading structure from a Markdown document. */
export interface HeadingNode {
  level: number;
  text: string;
  children: HeadingNode[];
}

/** Options for the chunker. */
export interface ChunkerOptions {
  /** Maximum tokens per chunk (default ~300) */
  maxTokensPerChunk?: number;
  /** Minimum tokens per chunk — merge small chunks (default ~30) */
  minTokensPerChunk?: number;
  /** Overlap tokens when splitting long sections (default ~40) */
  overlapTokens?: number;
  /** Maximum heading depth to split on (default 3 — H1-H3) */
  maxHeadingDepth?: number;
}

/** Default configuration values. */
export const DEFAULT_CONFIG: Required<Omit<SemanticSearchConfig, 'indexUrl'>> = {
  maxResults: 8,
  semanticWeight: 0.7,
  keywordWeight: 0.3,
  debounceMs: 250,
  bm25K1: 1.2,
  bm25B: 0.75,
  minScore: 0.01,
  modelId: 'Xenova/all-MiniLM-L6-v2',
};

export const DEFAULT_CHUNKER_OPTIONS: Required<ChunkerOptions> = {
  maxTokensPerChunk: 300,
  minTokensPerChunk: 30,
  overlapTokens: 40,
  maxHeadingDepth: 3,
};
