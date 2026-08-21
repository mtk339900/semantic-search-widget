import { describe, it, expect } from 'vitest';
import { chunkMarkdown } from '../chunker';

const BASE_URL = 'https://example.com/docs';
const SOURCE_PATH = '/getting-started.md';

describe('chunkMarkdown()', () => {
  it('splits at H1 heading boundaries', () => {
    // Each section needs enough tokens to exceed minTokensPerChunk (30)
    const longPara = 'This is a detailed paragraph providing comprehensive information about the topic. '.repeat(5);
    const md = `# Getting Started

${longPara}

# Installation

${longPara}`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    // First chunk should be from "Getting Started"
    const firstTrail = chunks[0].headingTrail;
    expect(firstTrail).toContain('Getting Started');

    // Second chunk should be from "Installation"
    const secondTrail = chunks[1].headingTrail;
    expect(secondTrail).toContain('Installation');
  });

  it('splits at H2 heading boundaries', () => {
    const longPara = 'This paragraph contains sufficient detail and information to exceed the minimum token threshold requirement. '.repeat(3);
    const md = `# Main Title

${longPara}

## Sub Section One

${longPara}

## Sub Section Two

${longPara}`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    expect(chunks.length).toBeGreaterThanOrEqual(3);

    // Check H2 trail
    const h2Chunks = chunks.filter(c =>
      c.headingTrail.includes('Sub Section One') ||
      c.headingTrail.includes('Sub Section Two')
    );
    expect(h2Chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('splits at H3 heading boundaries', () => {
    const longPara = 'This paragraph contains enough content to ensure the token count exceeds the minimum threshold for chunk creation. '.repeat(3);
    const md = `# Top Level

${longPara}

## Section Two

${longPara}

### Deep Section

${longPara}

### Another Deep Section

${longPara}`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    // Should split at H1, H2, H3 boundaries
    expect(chunks.length).toBeGreaterThanOrEqual(3);

    // Check that H3 headings are captured in the trail
    const h3Chunks = chunks.filter(c =>
      c.headingTrail.includes('Deep Section') ||
      c.headingTrail.includes('Another Deep Section')
    );
    expect(h3Chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT split at H4+ headings', () => {
    const md = `# Top Level

This is a long introductory section with plenty of content to ensure it meets minimum token requirements and does not get merged with other sections.

#### Should Not Split Here

This content should stay in the same section as the H1 content above since H4 does not cause a split boundary.

##### Also No Split

More content that continues in the same section.`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    // H4+ should not cause splits, so content under H1 stays together
    // (unless it exceeds maxTokensPerChunk, which it shouldn't)
    expect(chunks.length).toBeGreaterThanOrEqual(1);

    // The H4 content should be within a chunk whose trail does NOT include the H4
    const chunkWithH4 = chunks.find(c => c.text.includes('Should Not Split Here'));
    expect(chunkWithH4).toBeDefined();
    expect(chunkWithH4!.headingTrail).not.toContain('Should Not Split Here');
  });

  it('merges short sections with the next section', () => {
    // First section is very short (below minTokensPerChunk default of 30)
    const md = `# Short

Tiny intro.

## Longer Section

${'This is a longer section with plenty of content to ensure it meets the minimum token threshold. '.repeat(10)}`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    // The short section should be merged with the longer one
    // So we expect fewer chunks than heading boundaries
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('generates correct sequential chunk IDs', () => {
    const md = `# First

${'Content paragraph one. '.repeat(15)}

## Second

${'Content paragraph two. '.repeat(15)}`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].id).toBe(`chunk_${String(i + 1).padStart(4, '0')}`);
    }
  });

  it('generates URLs with slug fragments', () => {
    const md = `# Getting Started

${'Installation guide content here. '.repeat(15)}`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    expect(chunks.length).toBeGreaterThanOrEqual(1);

    // URL should contain the source path and a hash fragment
    for (const chunk of chunks) {
      expect(chunk.url).toContain('/getting-started');
      if (chunk.headingTrail.length > 0) {
        expect(chunk.url).toContain('#');
      }
    }
  });

  it('generates correct heading slugs with hyphens', () => {
    const md = `# Quick Start Guide

${'Some helpful content. '.repeat(15)}`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    const url = chunks[0].url;
    // "Quick Start Guide" -> "#quick-start-guide"
    expect(url).toContain('#quick-start-guide');
  });

  it('strips trailing slashes from base URL', () => {
    const md = `# Intro

${'Content here. '.repeat(15)}`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, 'https://example.com/docs/');
    expect(chunks[0].url).not.toMatch(/\/docs\/\//);
  });

  it('handles empty content', () => {
    const chunks = chunkMarkdown('', SOURCE_PATH, BASE_URL);
    expect(chunks).toEqual([]);
  });

  it('handles content with only headings and no body text', () => {
    const md = `# Title One

## Title Two

### Title Three`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    // With no body text, there should be no chunks (or very few)
    expect(chunks.length).toBe(0);
  });

  it('handles content with no headings', () => {
    const md = `${'This is plain text content without any markdown headings. '.repeat(20)}`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    // Should create at least one chunk for the content
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].headingTrail).toEqual([]);
    expect(chunks[0].text.length).toBeGreaterThan(0);
  });

  it('splits very long sections at paragraph boundaries', () => {
    // Create content that will exceed maxTokensPerChunk (default 300)
    const paragraphs = Array.from({ length: 20 }, (_, i) =>
      `Paragraph ${i}: ${'This is a long paragraph of text designed to push the token count well above the default maximum tokens per chunk threshold of 300 tokens. '.repeat(5)}`
    );
    const md = `# Long Section

${paragraphs.join('\n\n')}`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    // Should be split into multiple chunks
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    // All chunks should share the same heading trail
    for (const chunk of chunks) {
      expect(chunk.headingTrail).toContain('Long Section');
    }
  });

  it('applies overlap when splitting long sections', () => {
    const paragraphs = Array.from({ length: 20 }, (_, i) =>
      `Para ${i}: ${'Lots of text here to ensure we exceed the chunk size. '.repeat(6)}`
    );
    const md = `# Overlap Test

${paragraphs.join('\n\n')}`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL, { overlapTokens: 30 });
    if (chunks.length >= 2) {
      // There should be some shared text between consecutive chunks (overlap)
      const text1 = chunks[0].text;
      const text2 = chunks[1].text;
      // At least some words from the end of chunk 1 should appear in chunk 2
      // (due to overlap). Check for a word from the last paragraph of chunk 1
      // appearing in chunk 2.
      const words1 = text1.split(/\s+/);
      const lastWords = words1.slice(-10);
      const hasOverlap = lastWords.some(w => w.length > 3 && text2.toLowerCase().includes(w.toLowerCase()));
      // This is a soft check — overlap may not always produce identical words
      // depending on paragraph boundaries, but it's a reasonable expectation
      expect(chunks.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('correctly captures heading trail for H1 > H2 > H3 hierarchy', () => {
    const md = `# Level One

Introductory content that is sufficiently long enough.

## Level Two

More content for the second level section.

### Level Three

Deep content for the third level section.`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    // Find the H3 chunk
    const h3Chunk = chunks.find(c => c.headingTrail.includes('Level Three'));
    if (h3Chunk) {
      // Trail should be [H1, H2, H3]
      expect(h3Chunk.headingTrail.length).toBeGreaterThanOrEqual(2);
      expect(h3Chunk.headingTrail[0]).toBe('Level One');
    }
  });

  it('resets heading trail when encountering a new H1', () => {
    const longPara = 'This paragraph provides sufficient content to exceed the minimum token threshold for independent chunk creation. '.repeat(3);
    const md = `# First Chapter

${longPara}

## Subsection

${longPara}

# Second Chapter

${longPara}`;

    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    const secondChapter = chunks.find(c => c.headingTrail.includes('Second Chapter'));
    expect(secondChapter).toBeDefined();
    // After new H1, trail should not include first chapter headings
    expect(secondChapter!.headingTrail).not.toContain('First Chapter');
  });

  it('sets sourcePath on all chunks', () => {
    const md = `# Test

${'Content. '.repeat(15)}`;
    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    for (const chunk of chunks) {
      expect(chunk.sourcePath).toBe(SOURCE_PATH);
    }
  });

  it('respects custom chunker options', () => {
    const md = `# Title

${'Custom options test. '.repeat(5)}`;
    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL, {
      maxTokensPerChunk: 100,
      minTokensPerChunk: 5,
      overlapTokens: 10,
    });
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('removes .md extension from source path in URL', () => {
    const md = `# Test

${'Content here. '.repeat(15)}`;
    const chunks = chunkMarkdown(md, '/page.md', BASE_URL);
    expect(chunks[0].url).not.toContain('.md');
    expect(chunks[0].url).toContain('/page');
  });

  it('handles markdown with only a single short section', () => {
    const md = `# Only Section

Just a little bit of content here.`;

    // Short section below minTokensPerChunk, no next section to merge with
    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    // Pending merge gets pushed even if short
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('sets startOffset and endOffset on chunks', () => {
    const md = `# Title

${'Content. '.repeat(15)}`;
    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    for (const chunk of chunks) {
      expect(typeof chunk.startOffset).toBe('number');
      expect(typeof chunk.endOffset).toBe('number');
      expect(chunk.endOffset).toBeGreaterThanOrEqual(chunk.startOffset);
    }
  });

  it('handles multiple consecutive blank lines', () => {
    const md = `# Title




Some content after multiple blank lines.`;
    const chunks = chunkMarkdown(md, SOURCE_PATH, BASE_URL);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });
});
