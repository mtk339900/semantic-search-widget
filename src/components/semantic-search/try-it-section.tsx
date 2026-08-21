'use client';

import { SearchWidget } from 'react-semantic-search';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const EXAMPLES = [
  {
    query: 'login not working',
    finds: 'Authentication > Troubleshooting',
    note: 'No shared keywords — semantic match only',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    query: 'make my app faster',
    finds: 'Performance > Optimization Guide',
    note: '"faster" \u2192 "optimization", "performance"',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    query: 'how to write tests',
    finds: 'Testing > Unit Tests',
    note: 'Intent understood, not just keyword match',
    color: 'from-amber-500 to-orange-500',
  },
  {
    query: 'deploy to cloud',
    finds: 'Deployment > Cloud Platforms',
    note: '"cloud" \u2192 "AWS", "Vercel", "Docker"',
    color: 'from-purple-500 to-pink-500',
  },
];

function ExampleCard({
  query,
  finds,
  note,
  color,
  index,
}: {
  query: string;
  finds: string;
  note: string;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="group relative rounded-xl border border-gray-100 dark:border-gray-800 p-4 bg-white dark:bg-gray-900/80 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300 overflow-hidden cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      custom={index}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: (i) => ({
          opacity: 1,
          y: 0,
          transition: { delay: 0.1 + i * 0.1, duration: 0.5 },
        }),
      }}
      onClick={() => {
        const input = document.querySelector<HTMLInputElement>('input[role="combobox"]');
        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value',
          )?.set;
          nativeInputValueSetter?.call(input, query);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        }
      }}
    >
      {/* Gradient accent line at top */}
      <div className={cn('absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300', color)} />
      
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
        &ldquo;{query}&rdquo;
      </p>
      <p className="text-xs font-semibold flex items-center gap-1.5">
        <span className={cn('h-5 w-5 rounded-md bg-gradient-to-br flex items-center justify-center text-white', color)}>
          <ArrowRight className="h-3 w-3" />
        </span>
        <span className="text-emerald-600 dark:text-emerald-400">{finds}</span>
      </p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 pl-6.5">{note}</p>
    </motion.div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function TryItSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-20 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 hero-gradient" />
      
      <div ref={ref} className="max-w-2xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/80 dark:to-emerald-900/80 mb-4 shadow-sm">
            <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
            Try Semantic Search Now
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm sm:text-base max-w-md mx-auto">
            Search for something using natural language. Notice how it finds relevant results
            even when words don&apos;t match exactly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <SearchWidget
            indexUrl="/search-index.json"
            placeholder="Search again..."
            showStats={true}
          />
        </motion.div>

        <motion.div
          className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto"
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {EXAMPLES.map((ex, idx) => (
            <ExampleCard key={ex.query} {...ex} index={idx} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}