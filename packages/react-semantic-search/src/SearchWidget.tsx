'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { SearchResult } from 'semantic-search';
import { useSemanticSearch } from './use-semantic-search';
import {
  Search,
  Loader2,
  AlertCircle,
  FileText,
  Clock,
  X,
  Sparkles,
  ChevronRight,
  Zap,
  Copy,
  Check,
  History,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from './utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface SearchWidgetProps {
  indexUrl?: string;
  placeholder?: string;
  className?: string;
  showStats?: boolean;
  header?: React.ReactNode;
}

const HISTORY_KEY = 'semantic-search-history';

function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function addToSearchHistory(query: string) {
  const history = getSearchHistory();
  const filtered = history.filter((h) => h !== query);
  filtered.unshift(query);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, 10)));
}

function clearSearchHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function SearchWidget({
  indexUrl = '/search-index.json',
  placeholder = 'Search documentation...',
  className,
  showStats = true,
  header,
}: SearchWidgetProps) {
  const { query, setQuery, results, isSearching, isLoading, isModelLoading, error, searchTimeMs, isReady, init } =
    useSemanticSearch({ indexUrl });

  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showResults, setShowResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(getSearchHistory);

  // Keyboard shortcut: Ctrl/Cmd + K to focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        setShowResults(false);
        setShowHistory(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close results when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setShowHistory(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation within results
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
      }
    },
    [results, activeIndex],
  );

  const handleFocus = () => {
    setIsFocused(true);
    setShowResults(true);
    if (!isReady && !isLoading && !error) {
      init();
    }
    if (query.length === 0 && !isSearching) {
      setShowHistory(true);
      setSearchHistory(getSearchHistory());
    }
  };

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setShowHistory(false);
    setActiveIndex(-1);

    if (q.trim().length > 0) {
      addToSearchHistory(q.trim());
      setSearchHistory(getSearchHistory());
    }
  };

  const handleHistoryClick = (q: string) => {
    setQuery(q);
    setShowHistory(false);
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;
    if (nativeInputValueSetter && inputRef.current) {
      nativeInputValueSetter.call(inputRef.current, q);
      inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    }
    inputRef.current?.focus();
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // fallback
    }
  };

  const hasResults = results.length > 0;
  const showDropdown =
    isFocused &&
    showResults &&
    (hasResults || isSearching || query.trim().length > 0 || showHistory);

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-2xl mx-auto', className)}>
      {header && <div className="mb-4">{header}</div>}

      {/* Search Input Container */}
      <div
        className={cn(
          'relative flex items-center rounded-2xl border-2 bg-white dark:bg-gray-900/80 shadow-sm transition-all duration-300',
          isFocused
            ? 'border-emerald-500 shadow-lg shadow-emerald-500/15 dark:shadow-emerald-500/10'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          error && 'border-red-300 dark:border-red-700',
        )}
      >
        <div className="pl-4 text-gray-400">
          {isSearching ? (
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className={cn(
            'border-0 shadow-none focus:outline-none text-base h-12 w-full bg-transparent px-2',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          )}
          aria-label="Search documentation"
          role="combobox"
          aria-controls="search-results"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />

        <div className="pr-3 flex items-center gap-2">
          {query.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
                setShowHistory(true);
                setSearchHistory(getSearchHistory());
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>
          )}
          {!query && !isFocused && (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">
              <span className="text-xs">⌘</span> K
            </kbd>
          )}
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-xl z-50">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            <span className="text-sm">Loading search index...</span>
          </div>
        </div>
      )}

      {/* Model loading indicator */}
      {isModelLoading && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 p-4 shadow-xl z-50">
          <div className="flex flex-col items-center gap-2 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Loading AI model...</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Downloading MiniLM (~22MB, cached after first load)</p>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-4 shadow-xl z-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Search unavailable</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Dropdown */}
      <AnimatePresence>
        {showDropdown && !isLoading && !error && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={cn(
              'absolute top-full left-0 right-0 mt-2 rounded-2xl border bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-hidden',
              hasResults ? 'border-gray-200/80 dark:border-gray-700/80' : 'border-gray-100 dark:border-gray-800',
            )}
            id="search-results"
            role="listbox"
          >
            {/* Search History */}
            {showHistory && searchHistory.length > 0 && !query && (
              <div className="max-h-[300px] overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <History className="h-3.5 w-3.5" />
                    Recent Searches
                  </div>
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                </div>
                <ul>
                  {searchHistory.map((q) => (
                    <li
                      key={q}
                      onClick={() => handleHistoryClick(q)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors group border-b border-gray-50 dark:border-gray-800/50 last:border-0"
                    >
                      <History className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 truncate">{q}</span>
                      <ArrowUp className="h-3 w-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity rotate-[-45deg]" />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* No results */}
            {!hasResults && query.trim().length > 0 && !isSearching && !showHistory && (
              <div className="p-8 text-center">
                <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                  <Search className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No results found</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Try different keywords or check your spelling
                </p>
              </div>
            )}

            {/* Results list */}
            {hasResults && (
              <div className="max-h-[460px] overflow-y-auto">
                {showStats && (searchTimeMs !== null || isSearching) && (
                  <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Zap className="h-3 w-3 text-emerald-500" />
                      <span>Hybrid: Semantic + BM25</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                      <span>{results.length} results</span>
                      {searchTimeMs !== null && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {searchTimeMs}ms
                        </span>
                      )}
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px]">
                        <ArrowUp className="h-2.5 w-2.5" />
                        <ArrowDown className="h-2.5 w-2.5" />
                        Navigate
                      </span>
                    </div>
                  </div>
                )}

                <ul>
                  {results.map((result, idx) => (
                    <SearchResultItem
                      key={result.chunk.id}
                      result={result}
                      index={idx}
                      isActive={idx === activeIndex}
                      copiedIdx={copiedIdx}
                      onCopy={handleCopy}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-center gap-4">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                  all-MiniLM-L6-v2 + BM25
                </p>
                <span className="text-gray-200 dark:text-gray-700">|</span>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  <kbd className="px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono">↑</kbd>
                  <kbd className="px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono">↓</kbd>
                  navigate
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchResultItem({
  result,
  index,
  isActive,
  copiedIdx,
  onCopy,
}: {
  result: SearchResult;
  index: number;
  isActive: boolean;
  copiedIdx: number | null;
  onCopy: (text: string, idx: number) => void;
}) {
  const { chunk, score, semanticScore, keywordScore, highlightedSnippet } = result;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={cn(
        'px-4 py-3.5 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0',
        'transition-all duration-150 cursor-pointer group',
        isActive
          ? 'bg-emerald-50/80 dark:bg-emerald-950/30'
          : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/30',
      )}
      role="option"
      aria-selected={isActive}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center transition-colors',
              isActive
                ? 'bg-emerald-100 dark:bg-emerald-900/50'
                : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30',
            )}
          >
            <FileText
              className={cn(
                'h-4 w-4 transition-colors',
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400',
              )}
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
            {chunk.headingTrail.map((heading, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-600" />}
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {heading}
                </span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              {chunk.sourcePath}
            </span>
            <span className="text-[10px] text-gray-300 dark:text-gray-600">|</span>
            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
              {score.toFixed(3)}
            </span>
            <div className="ml-auto">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onCopy(chunk.text, index); }}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Copy snippet"
              >
                {copiedIdx === index ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3" />
                )}
              </motion.button>
            </div>
          </div>

          <div
            className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3"
            dangerouslySetInnerHTML={{ __html: highlightedSnippet }}
          />

          <div className="flex items-center gap-4 mt-2.5">
            <ScoreBar label="Semantic" value={semanticScore} color="bg-blue-500" bgColor="bg-blue-100 dark:bg-blue-900/30" />
            <ScoreBar label="Keyword" value={keywordScore} color="bg-amber-500" bgColor="bg-amber-100 dark:bg-amber-900/30" />
          </div>
        </div>
      </div>
    </motion.li>
  );
}

function ScoreBar({ label, value, color, bgColor }: { label: string; value: number; color: string; bgColor: string }) {
  const pct = Math.min(Math.round(value * 100), 100);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-400 dark:text-gray-500 w-14">{label}</span>
      <div className={cn('w-16 h-1.5 rounded-full overflow-hidden', bgColor)}>
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 w-8 text-right">
        {value.toFixed(2)}
      </span>
    </div>
  );
}
