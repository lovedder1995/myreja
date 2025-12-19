#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

async function importMeriyah() {
  try {
    return await import('../dist/meriyah.mjs');
  } catch {
    throw new Error('No se encontró `dist/meriyah.mjs`. Ejecutá `bun run build` y reintentá.');
  }
}

function printHelp() {
  process.stdout.write(`Uso:
  meriyah --formatear <archivo|directorio> [...]

Reglas:
  - No se debe usar la palabra «this»

Salida:
  Imprime un error por cada uso de \`this\` como expresión y retorna exit code 1 si encuentra alguno.
`);
}

function isPathLike(value) {
  return typeof value === 'string' && value.length > 0;
}

async function pathKind(p) {
  try {
    const stats = await fs.stat(p);
    if (stats.isDirectory()) return 'dir';
    if (stats.isFile()) return 'file';
    return 'other';
  } catch {
    return 'missing';
  }
}

async function collectFiles(inputPath, out) {
  const kind = await pathKind(inputPath);
  if (kind === 'file') {
    out.add(path.resolve(inputPath));
    return;
  }
  if (kind !== 'dir') return;

  const entries = await fs.readdir(inputPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(inputPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') continue;
      await collectFiles(fullPath, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(?:[cm]?[jt]sx?|mjs|cjs|mts|cts)$/.test(entry.name)) continue;
    out.add(path.resolve(fullPath));
  }
}

function* walkNode(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) yield* walkNode(item);
    return;
  }

  if (typeof value.type === 'string') yield value;

  for (const child of Object.values(value)) {
    yield* walkNode(child);
  }
}

async function findThisExpressions(filePath, parse) {
  const sourceText = await fs.readFile(filePath, 'utf8');
  const parseOptions = { loc: true, next: true, jsx: true, webcompat: true };

  let ast;
  let moduleError;
  try {
    ast = parse(sourceText, { ...parseOptions, sourceType: 'module' });
  } catch (error) {
    moduleError = error;
  }

  if (!ast) {
    try {
      ast = parse(sourceText, { ...parseOptions, sourceType: 'script' });
    } catch {
      const err = moduleError instanceof Error ? moduleError : new Error(String(moduleError));
      throw err;
    }
  }

  const findings = [];
  for (const node of walkNode(ast)) {
    if (node.type !== 'ThisExpression') continue;
    const line = node.loc?.start?.line ?? 1;
    const column = node.loc?.start?.column ?? 0;
    findings.push({ line, column });
  }

  return findings;
}

async function run(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return 0;
  }

  const formatearIndex = argv.indexOf('--formatear');
  if (formatearIndex === -1) {
    printHelp();
    return 2;
  }

  const targets = argv.slice(formatearIndex + 1).filter(isPathLike);
  if (targets.length === 0) {
    printHelp();
    return 2;
  }

  const fileSet = new Set();
  for (const target of targets) {
    await collectFiles(target, fileSet);
  }

  const files = [...fileSet].sort((a, b) => a.localeCompare(b));
  if (files.length === 0) {
    process.stderr.write('No se encontraron archivos para analizar.\n');
    return 2;
  }

  let parseErrorCount = 0;
  let issueCount = 0;

  let parse;
  try {
    ({ parse } = await importMeriyah());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return 2;
  }

  for (const filePath of files) {
    try {
      const findings = await findThisExpressions(filePath, parse);
      for (const finding of findings) {
        issueCount += 1;
        process.stdout.write(
          `${filePath}:${finding.line}:${finding.column}  error  No se debe usar la palabra «this»  formatear/no-this\n`,
        );
      }
    } catch (error) {
      parseErrorCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${filePath}  error  ${message}\n`);
    }
  }

  if (parseErrorCount > 0) return 2;
  return issueCount > 0 ? 1 : 0;
}

const exitCode = await run(process.argv.slice(2));
process.exitCode = exitCode;
