// react-semantic-search — React Widget
//
// Drop-in search widget for documentation sites.
// Uses semantic-search core engine under the hood.
//
// Usage:
//   import { SearchWidget } from 'react-semantic-search';
//   <SearchWidget indexUrl="/search-index.json" />

export { SearchWidget } from './SearchWidget';
export type { SearchWidgetProps } from './SearchWidget';
export { useSemanticSearch } from './use-semantic-search';
export type { UseSemanticSearchReturn } from './use-semantic-search';

// Re-export core types for consumer convenience
export type {
  Chunk,
  EmbeddedChunk,
  SearchIndex,
  SearchResult,
  SemanticSearchConfig,
} from 'semantic-search';
