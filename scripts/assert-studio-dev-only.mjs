import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const roots = ['contracts', 'harness', 'test', 'scripts', '.github/workflows', 'src', 'frontend'];
const rootFiles = ['package.json', 'frontend-sdk-smoke.ts', '.env.example'];
const extensions = new Set(['.py', '.mjs', '.js', '.ts', '.tsx', '.jsx', '.json', '.yml', '.yaml', '.toml', '.env']);
const forbidden = [
  ['stable chain ID 61999', /\b61999\b/g],
  ['stable chain hex ID 0xf22f', /\b0xf22f\b/gi],
  ['stable Studionet preset', /\bstudionet\b/gi],
  ['stable Studio RPC', /https:\/\/studio\.genlayer\.com\/api/gi],
  ['stable explorer', /https:\/\/genlayer-explorer\.vercel\.app/gi],
];

async function filesUnder(path) {
  const result = [];
  let entries;
  try { entries = await readdir(path, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return result; throw error; }
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(child));
    else if (extensions.has(entry.name.slice(entry.name.lastIndexOf('.')) || entry.name)) result.push(child);
  }
  return result;
}

const candidates = [];
for (const root of roots) {
  candidates.push(...(await filesUnder(root)).filter((file) => !file.endsWith('assert-studio-dev-only.mjs')));
}
for (const file of rootFiles) {
  try { await readFile(file); candidates.push(file); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}

const errors = [];
for (const file of candidates) {
  const content = await readFile(file, 'utf8');
  for (const [description, pattern] of forbidden) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) errors.push(`${relative('.', file)} contains forbidden ${description}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Studio Dev-only guard passed (${candidates.length} runtime/config files scanned).`);
}
