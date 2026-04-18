#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const contentPath = path.join(distDir, 'content.js');
let contentCode = fs.readFileSync(contentPath, 'utf8');

// Find and inline all chunk imports
const importRegex = /import\{([^}]+)\}from"\.\/chunks\/([^"]+)\.js";/g;
let match;

while ((match = importRegex.exec(contentCode)) !== null) {
  const chunkFile = path.join(distDir, 'chunks', match[2] + '.js');
  if (fs.existsSync(chunkFile)) {
    const chunkCode = fs.readFileSync(chunkFile, 'utf8');
    // Replace the import with the chunk code
    contentCode = contentCode.replace(match[0], chunkCode + ';');
  }
}

fs.writeFileSync(contentPath, contentCode);
console.log('✓ Inlined chunks into content.js');
