'use client';

import { HeroSearch } from '@/components/semantic-search/hero-search';
import { TryItSection } from '@/components/semantic-search/try-it-section';
import { ThemeToggle } from '@/components/theme-toggle';
import { ScrollToTop } from '@/components/scroll-to-top';
import { AnimatedCounter } from '@/components/animated-counter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Brain,
  Gauge,
  Package,
  FileSearch,
  Layers,
  Sparkles,
  Zap,
  Cpu,
  HardDrive,
  Code2,
  TestTube2,
  Shield,
  Globe,
  Keyboard,
  History,
  Moon,
  Copy,
} from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const FEATURES = [
  {
    icon: Brain,
    title: 'Real Semantic Understanding',
    description:
      'Powered by MiniLM, a sentence-transformer trained on 1B+ pairs. Search "login not working" truly finds troubleshooting auth articles.',
  },
  {
    icon: Gauge,
    title: 'Sub-millisecond Search',
    description:
      'Pre-computed embeddings + in-memory vectors = instant results. No API calls, no network latency for search.',
  },
  {
    icon: Package,
    title: 'Zero Backend',
    description:
      'Everything runs in the browser. No server, no database, no API costs. Build once, search forever.',
  },
  {
    icon: Layers,
    title: 'Hybrid Ranking',
    description:
      'Combines semantic similarity (70%) with BM25 keyword scoring (30%) for the best of both worlds.',
  },
  {
    icon: Shield,
    title: 'Dark Mode',
    description:
      'Full dark mode support with smooth transitions. The search experience adapts to your preference automatically.',
  },
  {
    icon: Keyboard,
    title: 'Keyboard Navigation',
    description:
      'Full keyboard support with arrow keys, Ctrl+K shortcut, and Escape to close. Navigate results without touching the mouse.',
  },
  {
    icon: History,
    title: 'Search History',
    description:
      'Your recent searches are stored locally. Quickly re-run previous queries or explore your search patterns.',
  },
  {
    icon: Copy,
    title: 'Copy to Clipboard',
    description:
      'One-click copy of any search result snippet. Perfect for sharing findings or saving them for later reference.',
  },
];

const ARCHITECTURE_STEPS = [
  {
    icon: FileSearch,
    title: 'Crawl & Parse',
    description: 'Read Markdown/HTML content, extract structured text with heading hierarchy.',
  },
  {
    icon: Brain,
    title: 'Smart Chunking',
    description:
      'Heading-aware splitting: never breaks mid-sentence, merges tiny sections, overlaps boundaries.',
  },
  {
    icon: Cpu,
    title: 'Encode with MiniLM',
    description:
      'Pre-trained all-MiniLM-L6-v2 generates 384-dim vectors. Trained on billions of words, not 12 pages.',
  },
  {
    icon: HardDrive,
    title: 'Ship Index',
    description:
      'Output a single index.json with chunks, vectors, and BM25 stats. Serve as a static file.',
  },
  {
    icon: Search,
    title: 'Search in Browser',
    description:
      'Load MiniLM in-browser (~22MB, cached), encode queries, compute cosine similarity + BM25, rank results.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50 dark:bg-[#0a0a14]">
      {/* Header */}
      <header className="border-b border-gray-200/60 dark:border-gray-800/60 glass sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Search className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                Semantic Search
              </h1>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight font-medium">
                Nova.js Demo
              </p>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Badge variant="outline" className="text-[10px] gap-1 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3 w-3" />
              v2.0
            </Badge>
            <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              <Zap className="h-3 w-3" />
              0 Backend
            </Badge>
            <ThemeToggle />
          </motion.div>
        </div>
      </header>

      <main className="flex-1">
        <HeroSearch />

        {/* Architecture Section */}
        <section className="py-20 px-4 sm:px-6 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 dot-pattern opacity-40" />
          <div className="max-w-5xl mx-auto relative z-10">
            <AnimatedSection>
              <SectionHeader
                icon={Code2}
                title="How It Works"
                description="A build-time + runtime pipeline that ships a fully self-contained semantic search experience."
              />
            </AnimatedSection>

            <AnimatedSection className="mt-10">
              <div className="relative">
                <div className="hidden md:block absolute left-8 top-8 bottom-8 w-px">
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-300/0 via-emerald-400/60 to-emerald-300/0" />
                </div>
                <div className="space-y-3">
                  {ARCHITECTURE_STEPS.map((step, idx) => (
                    <motion.div
                      key={step.title}
                      custom={idx}
                      variants={fadeUp}
                    >
                      <ArchitectureStep step={step} index={idx} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-4 sm:px-6 bg-white dark:bg-gray-950/50 relative">
          <div className="absolute inset-0 hero-gradient" />
          <div className="max-w-6xl mx-auto relative z-10">
            <AnimatedSection>
              <SectionHeader
                icon={Sparkles}
                title="Key Features"
                description="Every design decision is deliberate — this is built to impress in interviews and production alike."
              />
            </AnimatedSection>
            <AnimatedSection className="mt-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {FEATURES.map((feature, idx) => (
                  <motion.div key={feature.title} custom={idx} variants={fadeUp}>
                    <Card className="group h-full border-gray-100 dark:border-gray-800/60 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                            <feature.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <CardTitle className="text-sm font-semibold">{feature.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                          {feature.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Tech Specs */}
        <section className="py-20 px-4 sm:px-6 relative overflow-hidden">
          <div className="absolute inset-0 dot-pattern opacity-30" />
          <div className="max-w-5xl mx-auto relative z-10">
            <AnimatedSection>
              <SectionHeader
                icon={TestTube2}
                title="Tested & Verified"
                description="Comprehensive test suite with 172+ tests covering every component."
              />
            </AnimatedSection>
            <AnimatedSection className="mt-10">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  label="Test Cases"
                  value={172}
                  suffix="+"
                  sub="6 test files"
                />
                <StatCard
                  label="Chunks Indexed"
                  value={141}
                  sub="12 documents"
                />
                <StatCard
                  label="Vocabulary"
                  value={1085}
                  sub="unique terms"
                  prefix=""
                />
                <StatCard
                  label="Index Size"
                  value={1.3}
                  suffix=" MB"
                  sub="384 dimensions"
                />
              </div>
            </AnimatedSection>
          </div>
        </section>

        <TryItSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm py-8 px-4 mt-auto">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Search className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Semantic Search Widget</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Built with all-MiniLM-L6-v2 + BM25 Hybrid Ranking
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            {['Zero backend', 'Zero cost', 'Client-side', 'TypeScript'].map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-medium text-gray-500 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <motion.div
        className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/80 dark:to-emerald-900/80 mb-4 shadow-sm"
        whileHover={{ scale: 1.05, rotate: 5 }}
      >
        <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
      </motion.div>
      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-lg mx-auto text-sm sm:text-base">{description}</p>
    </div>
  );
}

function ArchitectureStep({
  step,
  index,
}: {
  step: (typeof ARCHITECTURE_STEPS)[number];
  index: number;
}) {
  return (
    <motion.div
      className="flex items-start gap-4 group"
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative z-10 shrink-0">
        <div className="h-16 w-16 rounded-2xl bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 group-hover:border-emerald-300 dark:group-hover:border-emerald-700 flex items-center justify-center transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:shadow-emerald-500/10">
          <step.icon className="h-7 w-7 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300" />
        </div>
        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
          <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300">{index + 1}</span>
        </div>
      </div>
      <div className="pt-2 flex-1">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">{step.title}</h4>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">{step.description}</p>
      </div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  suffix = '',
  prefix = '',
  sub,
}: {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  sub: string;
}) {
  return (
    <Card className="border-gray-100 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300">
      <CardContent className="pt-5 pb-4 text-center">
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          <AnimatedCounter value={value} suffix={suffix} prefix={prefix} />
        </p>
        <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">{label}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}
