'use client';

import { SearchWidget } from 'react-semantic-search';
import { Search, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const SUGGESTED_QUERIES = [
  'login not working',
  'how to deploy',
  'optimize performance',
  'writing unit tests',
  'authentication setup',
  'error handling in API calls',
];

export function HeroSearch() {
  return (
    <section className="relative pt-16 sm:pt-24 pb-16 px-4 sm:px-6 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 dot-pattern opacity-30" />

      {/* Floating orbs */}
      <div className="absolute top-20 left-[10%] w-64 h-64 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-10 right-[10%] w-48 h-48 bg-emerald-300/10 dark:bg-emerald-400/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-40 right-[25%] w-32 h-32 bg-teal-400/8 dark:bg-teal-500/5 rounded-full blur-2xl animate-pulse-glow" style={{ animationDelay: '3s' }} />

      <div className="max-w-2xl mx-auto text-center relative z-10">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/60 dark:border-emerald-800/60 mb-6"
        >
          <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Powered by MiniLM (Sentence Transformers)
          </span>
        </motion.div>

        {/* Title */}
        <motion.h2
          className="text-3xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4 leading-[1.1]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Search like you{' '}
          <span className="relative">
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              think
            </span>
            <motion.span
              className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-full"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            />
          </span>
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          className="text-gray-500 dark:text-gray-400 text-sm sm:text-base max-w-lg mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Type what you mean, not just the exact words. Our hybrid semantic + keyword engine
          understands your intent across 141 documentation chunks.
        </motion.p>

        {/* Search Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8"
        >
          <SearchWidget
            indexUrl="/search-index.json"
            placeholder={'Try: \u201clogin not working\u201d or \u201chow to deploy\u201d...'}
          />
        </motion.div>

        {/* Suggested queries */}
        <motion.div
          className="mt-6 flex flex-wrap justify-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {SUGGESTED_QUERIES.map((q, i) => (
            <motion.button
              key={q}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const input = document.querySelector<HTMLInputElement>(
                  'input[role="combobox"]',
                );
                if (input) {
                  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    'value',
                  )?.set;
                  nativeInputValueSetter?.call(input, q);
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  input.focus();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-xs text-gray-600 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all duration-200 shadow-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.6 + i * 0.05 }}
            >
              <Search className="h-3 w-3" />
              {q}
            </motion.button>
          ))}
        </motion.div>

        {/* Keyboard shortcut hint */}
        <motion.p
          className="mt-4 text-[11px] text-gray-400 dark:text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Press{' '}
          <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[10px] font-mono text-gray-500 dark:text-gray-400">
            Ctrl
          </kbd>{' '}
          +{' '}
          <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[10px] font-mono text-gray-500 dark:text-gray-400">
            K
          </kbd>{' '}
          to focus search
        </motion.p>
      </div>
    </section>
  );
}