// ============================================================
// Semantic Search Widget — Heading-Aware Chunker
// ============================================================

import { Chunk, ChunkerOptions, DEFAULT_CHUNKER_OPTIONS } from './types';
import { countTokens } from './tokenizer';

interface RawSection {
  headingTrail: string[];
  text: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Parse Markdown content into heading-aware sections.
 * Each H1-H3 boundary starts a new section.
 */
function parseMarkdownSections(markdown: string): RawSection[] {
  const lines = markdown.split('\n');
  const sections: RawSection[] = [];
  let currentTrail: string[] = [];
  let currentText: string[] = [];
  let currentStart = 0;
  let currentOffset = 0;

  const flushSection = () => {
    const text = currentText.join('\n').trim();
    if (text.length > 0) {
      const fullText = currentText.join('\n');
      sections.push({
        headingTrail: [...currentTrail],
        text,
        startOffset: currentStart,
        endOffset: currentStart + fullText.length,
      });
    }
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();

      // Flush any accumulated text before this heading
      flushSection();

      // Update heading trail
      if (level === 1) {
        currentTrail = [title];
      } else if (level === 2) {
        currentTrail = currentTrail.slice(0, 1);
        currentTrail.push(title);
      } else if (level === 3) {
        currentTrail = currentTrail.slice(0, 2);
        if (currentTrail.length < 2) currentTrail.push(title);
        else currentTrail[2] = title;
      } else {
        // H4+ — don't split, just include in current section
        currentText.push(line);
        currentOffset += line.length + 1;
        continue;
      }

      currentStart = currentOffset;
      currentText = [];
    } else {
      currentText.push(line);
    }
    currentOffset += line.length + 1;
  }

  flushSection();
  return sections;
}

/**
 * Split a long section into smaller chunks at paragraph boundaries
 * with overlap to preserve context at boundaries.
 */
function splitLongSection(
  section: RawSection,
  maxTokens: number,
  overlapTokens: number,
): RawSection[] {
  const tokenCount = countTokens(section.text);
  if (tokenCount <= maxTokens) return [section];

  const paragraphs = section.text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const chunks: RawSection[] = [];
  let buffer: string[] = [];
  let bufferTokens = 0;
  let overlapBuf: string[] = [];
  let overlapCount = 0;

  const flush = () => {
    const text = buffer.join('\n\n').trim();
    if (text.length > 0) {
      const fullText = buffer.join('\n\n');
      chunks.push({
        headingTrail: [...section.headingTrail],
        text,
        startOffset: section.startOffset,
        endOffset: section.startOffset + fullText.length,
      });
    }
  };

  for (const para of paragraphs) {
    const paraTokens = countTokens(para);

    if (bufferTokens + paraTokens > maxTokens) {
      flush();
      // Keep overlap from the end of the previous buffer
      buffer = [...overlapBuf, para];
      bufferTokens = overlapCount + paraTokens;
      overlapBuf = [];
      overlapCount = 0;
    } else {
      buffer.push(para);
      bufferTokens += paraTokens;
    }

    // Track last few paragraphs for overlap
    if (paraTokens > 0) {
      overlapBuf.push(para);
      overlapCount += paraTokens;
      while (overlapCount > overlapTokens && overlapBuf.length > 1) {
        const removed = overlapBuf.shift()!;
        overlapCount -= countTokens(removed);
      }
    }
  }

  flush();
  return chunks.length > 0 ? chunks : [section];
}

/**
 * Main chunker entry point.
 * Takes raw Markdown and produces heading-aware chunks.
 */
export function chunkMarkdown(
  markdown: string,
  sourcePath: string,
  baseUrl: string,
  options?: ChunkerOptions,
): Chunk[] {
  const opts = { ...DEFAULT_CHUNKER_OPTIONS, ...options };
  const sections = parseMarkdownSections(markdown);
  const chunks: Chunk[] = [];
  let counter = 0;

  // Merge very short sections with the next one
  const mergedSections: RawSection[] = [];
  let pendingMerge: RawSection | null = null;

  for (const section of sections) {
    const tokens = countTokens(section.text);
    if (tokens < opts.minTokensPerChunk) {
      if (pendingMerge) {
        pendingMerge.text += '\n\n' + section.text;
        pendingMerge.endOffset = section.endOffset;
        // Update heading trail if new section has deeper headings
        if (section.headingTrail.length > pendingMerge.headingTrail.length) {
          pendingMerge.headingTrail = [...section.headingTrail];
        }
      } else {
        pendingMerge = { ...section };
      }
    } else {
      if (pendingMerge) {
        pendingMerge.text += '\n\n' + section.text;
        pendingMerge.endOffset = section.endOffset;
        if (section.headingTrail.length > pendingMerge.headingTrail.length) {
          pendingMerge.headingTrail = [...section.headingTrail];
        }
        mergedSections.push(pendingMerge);
        pendingMerge = null;
      } else {
        mergedSections.push(section);
      }
    }
  }

  if (pendingMerge) {
    mergedSections.push(pendingMerge);
  }

  for (const section of mergedSections) {
    const subChunks = splitLongSection(
      section,
      opts.maxTokensPerChunk,
      opts.overlapTokens,
    );

    for (const sc of subChunks) {
      const id = `chunk_${String(++counter).padStart(4, '0')}`;
      const slug = headingToSlug(sc.headingTrail);
      const url = baseUrl.replace(/\/$/, '') + sourcePath.replace(/\.md$/, '') + slug;

      chunks.push({
        id,
        sourcePath,
        headingTrail: sc.headingTrail,
        text: sc.text,
        url,
        startOffset: sc.startOffset,
        endOffset: sc.endOffset,
      });
    }
  }

  return chunks;
}

/**
 * Convert heading trail to a URL fragment.
 */
function headingToSlug(trail: string[]): string {
  if (trail.length === 0) return '';
  const last = trail[trail.length - 1];
  return '#' + last
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
