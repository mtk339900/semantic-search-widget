'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { SearchEngine, type SearchResult } from 'semantic-search';
import type { SemanticSearchConfig } from 'semantic-search';
import { DEFAULT_CONFIG } from 'semantic-search';

export interface UseSemanticSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  isLoading: boolean;
  error: string | null;
  searchTimeMs: number | null;
  isReady: boolean;
  isModelLoading: boolean;
  performSearch: (q: string) => void;
  /** Trigger index load (call on first user interaction, e.g. focus) */
  init: () => Promise<void>;
}

export function useSemanticSearch(
  config?: Partial<SemanticSearchConfig>,
): UseSemanticSearchReturn {
  const engineRef = useRef<SearchEngine | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTimeMs, setSearchTimeMs] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  const fullConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  /** Lazy-init: loads the index JSON. Idempotent — concurrent calls share one promise. */
  const init = useCallback(async () => {
    if (engineRef.current?.isReady) return;
    if (initPromiseRef.current) return initPromiseRef.current;

    initPromiseRef.current = (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const engine = new SearchEngine(fullConfig);
        engineRef.current = engine;

        await engine.loadIndexFromUrl(fullConfig.indexUrl);

        setIsReady(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load search index';
        setError(message);
        console.error('Semantic search init failed:', err);
      } finally {
        setIsLoading(false);
      }
    })();

    return initPromiseRef.current;
  }, [fullConfig.indexUrl, fullConfig.modelId]);

  const performSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setSearchTimeMs(null);
      return;
    }

    // Clear any pending debounced search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      // Ensure index is loaded before searching
      if (!engineRef.current?.isReady) {
        await init();
      }
      if (!engineRef.current?.isReady) return; // init failed

      const start = performance.now();
      setIsSearching(true);
      setIsModelLoading(!engineRef.current.isModelReady);

      try {
        const searchResults = await engineRef.current.search(trimmed);
        const elapsed = performance.now() - start;

        setResults(searchResults);
        setSearchTimeMs(Math.round(elapsed * 100) / 100);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setIsModelLoading(false);
        setIsSearching(false);
      }
    }, fullConfig.debounceMs);
  }, [fullConfig.debounceMs, init]);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    performSearch(q);
  }, [performSearch]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    isLoading,
    isModelLoading,
    error,
    searchTimeMs,
    isReady,
    performSearch,
    init,
  };
}
