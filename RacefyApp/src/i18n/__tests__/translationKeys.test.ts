import fs from 'fs';
import path from 'path';
import en from '../locales/en.json';
import pl from '../locales/pl.json';

type Tree = Record<string, unknown>;

const SRC = path.resolve(__dirname, '../..');
const PLURAL_SUFFIXES = ['one', 'other', 'few', 'many', 'zero', 'two'];

/**
 * `t('a.b.c')` and `t('a.b.c', { … })`, but not `t('a.b.c', 'Fallback')` —
 * a call with an inline default renders that default when the key is absent,
 * so it is not a broken string.
 */
const CALL = /\bt\(\s*'([a-zA-Z0-9_.]+)'\s*(\)|,\s*\{)/g;

function resolve(tree: Tree, key: string): unknown {
  let node: unknown = tree;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    const record = node as Tree;
    if (part in record) {
      node = record[part];
      continue;
    }
    const plural = PLURAL_SUFFIXES.map((s) => `${part}_${s}`).find((k) => k in record);
    if (!plural) return undefined;
    node = record[plural];
  }
  return node;
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function usedKeys(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of sourceFiles(SRC)) {
    const code = fs.readFileSync(file, 'utf8');
    for (const match of code.matchAll(CALL)) {
      const key = match[1];
      if (key.includes('.') && !found.has(key)) found.set(key, path.relative(SRC, file));
    }
  }
  return found;
}

/**
 * Guards the two ways a translation silently breaks: a key nobody added, and a
 * key someone overwrote with a differently-shaped value. Both render as raw
 * text on screen — `strengthPlans.resume.title` once shipped as the literal
 * "Wznów: {{name}}" because a new namespace landed on top of an old one.
 */
describe('translation keys', () => {
  const keys = usedKeys();

  it('finds keys to check at all (guards the scanner itself)', () => {
    expect(keys.size).toBeGreaterThan(200);
  });

  it('every key used without a fallback exists in English', () => {
    const missing = [...keys].filter(([key]) => resolve(en as Tree, key) === undefined);
    expect(missing.map(([key, file]) => `${key} (${file})`)).toEqual([]);
  });

  it('every key used without a fallback exists in Polish', () => {
    const missing = [...keys].filter(([key]) => resolve(pl as Tree, key) === undefined);
    expect(missing.map(([key, file]) => `${key} (${file})`)).toEqual([]);
  });

  // Arrays are legitimate — a few call sites ask for one with `returnObjects`.
  // A plain object means the key names a namespace, which renders as "[object
  // Object]" or as the raw key depending on the call.
  it('never resolves to a group of keys', () => {
    const namespaces = [...keys].filter(([key]) => {
      const value = resolve(en as Tree, key);
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    });
    expect(namespaces.map(([key, file]) => `${key} (${file})`)).toEqual([]);
  });
});
