#!/usr/bin/env node

/**
 * semantic-search-cli — Build a search index from Markdown files.
 *
 * Usage:
 *   semantic-search-cli --input ./content --output ./public/search-index.json
 *   semantic-search-cli                          # defaults: ./content → ./search-index.json
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import matter from 'gray-matter';
import { chunkMarkdown, computeIdf } from 'semantic-search';
import type { Chunk, SearchIndex, EmbeddedChunk } from 'semantic-search';

const __dirname = dirname(fileURLToPath(import.meta.url));

function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = dir + '/' + entry.name;
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function parseMarkdownFile(filePath: string): { content: string } {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { content } = matter(raw);
  return { content };
}

function parseArgs(args: string[]) {
  let input = './content';
  let output = './search-index.json';
  let model = 'Xenova/all-MiniLM-L6-v2';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) input = args[++i];
    else if (args[i] === '--output' && args[i + 1]) output = args[++i];
    else if (args[i] === '--model' && args[i + 1]) model = args[++i];
    else if (args[i] === '--help') {
      console.log(`Usage: semantic-search-cli [options]

Options:
  --input  <dir>   Input directory with .md files (default: ./content)
  --output <file>  Output index JSON path (default: ./search-index.json)
  --model  <id>    HuggingFace model ID (default: Xenova/all-MiniLM-L6-v2)
  --help           Show this help`);
      process.exit(0);
    }
  }

  return { input: resolve(input), output: resolve(output), model };
}

async function main() {
  const { input, output, model } = parseArgs(process.argv.slice(2));
  const MODEL_ID = model;

  console.log('=== Semantic Search Index Builder ===');
  console.log('Input: ', input);
  console.log('Output:', output);
  console.log('Model: ', MODEL_ID);

  // 1. Find and parse Markdown files
  console.log('\nReading content...');
  const mdFiles = findMarkdownFiles(input);
  if (mdFiles.length === 0) {
    console.error('No .md files found in', input);
    process.exit(1);
  }
  console.log('Found', mdFiles.length, 'files');

  // 2. Chunk
  const allChunks: Chunk[] = [];
  let counter = 0;
  for (const fp of mdFiles) {
    const { content } = parseMarkdownFile(fp);
    const relPath = '/' + fp.slice(input.length).replace(/^\//, '');
    const chunks = chunkMarkdown(content, relPath, '');
    for (const c of chunks) c.id = 'chunk_' + String(++counter).padStart(4, '0');
    allChunks.push(...chunks);
  }
  console.log('Created', allChunks.length, 'chunks');

  // 3. Load model and encode chunks
  console.log('Loading model (first run downloads ~22MB)...');
  const { pipeline } = await import('@huggingface/transformers');
  const extractor = await pipeline('feature-extraction', MODEL_ID, { dtype: 'fp32' });
  console.log('Model loaded. Encoding chunks...');

  const embeddedChunks: EmbeddedChunk[] = [];
  const DIM = 384;

  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    const out = await extractor(chunk.text, { pooling: 'mean', normalize: true });
    const tensor = out as unknown as { data: Float32Array; dims: number[] };
    const data = Array.from(tensor.data);

    let vector: number[];
    if (tensor.dims.length === 3) {
      const [_, seqLen, hidden] = tensor.dims;
      vector = new Array(hidden).fill(0);
      for (let s = 0; s < seqLen; s++)
        for (let d = 0; d < hidden; d++)
          vector[d] += data[s * hidden + d];
      let norm = 0;
      for (let d = 0; d < hidden; d++) vector[d] /= seqLen;
      for (let d = 0; d < hidden; d++) norm += vector[d] * vector[d];
      norm = Math.sqrt(norm);
      if (norm > 0) for (let d = 0; d < hidden; d++) vector[d] /= norm;
    } else {
      vector = data.slice(0, DIM);
    }

    embeddedChunks.push({ ...chunk, vector });
    if ((i + 1) % 20 === 0) console.log('  Encoded', i + 1, '/', allChunks.length);
  }

  console.log('All chunks encoded:', embeddedChunks.length, 'x', DIM, 'd');

  // 4. BM25 stats
  console.log('Computing BM25 stats...');
  const { idf, avgDocLength, vocabulary } = computeIdf(embeddedChunks);

  // 5. Build and write index
  const index: SearchIndex = {
    version: 2,
    model: MODEL_ID,
    dimensions: DIM,
    generatedAt: new Date().toISOString(),
    vocabulary, idf, avgDocLength,
    chunkCount: embeddedChunks.length,
    chunks: embeddedChunks,
  };

  // Ensure output directory exists
  fs.mkdirSync(dirname(output), { recursive: true });

  const json = JSON.stringify(index);
  fs.writeFileSync(output, json, 'utf-8');
  const sizeMB = (Buffer.byteLength(json, 'utf-8') / (1024 * 1024)).toFixed(2);
  console.log('\nIndex written:', output, `(${sizeMB} MB)`);
  console.log('Done!');
}

main().catch(err => { console.error('Build failed:', err); process.exit(1); });
