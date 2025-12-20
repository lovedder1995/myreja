#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

async function importMeriyah() {
  try {
    return await import('../dist/meriyah.mjs');
  } catch {
    throw new Error('No se encontró `dist/meriyah.mjs`. Ejecutá `bun run build` y reintentá.');
  }
}

async function importTypescript() {
  try {
    return await import('typescript');
  } catch {
    throw new Error('No se encontró `typescript`. Instalalo y reintentá.');
  }
}

async function loadForbiddenWords() {
  const fallback = new Set(['this']);
  const binPath = fileURLToPath(import.meta.url);
  const tokenFilePath = path.resolve(path.dirname(binPath), '..', 'src', 'token.ts');

  let content;
  try {
    content = await fs.readFile(tokenFilePath, 'utf8');
  } catch {
    return fallback;
  }

  const forbidden = new Set();
  const entryRegExp = /^\s*([A-Za-z_$][\w$]*):\s*Token\.[A-Za-z0-9_$]+,\s*\/\/\s*Prohibida\b/gm;
  for (const match of content.matchAll(entryRegExp)) {
    forbidden.add(match[1]);
  }

  return forbidden.size > 0 ? forbidden : fallback;
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

function isSkippableIdentifierContext(parent, key) {
  if (!parent || typeof parent !== 'object') return false;

  if (parent.type === 'MemberExpression' && key === 'property' && parent.computed === false) return true;
  if (parent.type === 'Property' && key === 'key' && parent.computed === false) return true;
  if (parent.type === 'MethodDefinition' && key === 'key' && parent.computed === false) return true;
  if (parent.type === 'PropertyDefinition' && key === 'key' && parent.computed === false) return true;
  if (parent.type === 'AccessorProperty' && key === 'key' && parent.computed === false) return true;

  return false;
}

function addFinding(findings, filePath, keyword, node, ruleId) {
  const line = node?.loc?.start?.line ?? 1;
  const column = node?.loc?.start?.column ?? 0;
  findings.push({
    filePath,
    line,
    column,
    keyword,
    ruleId,
  });
}

function collectForbiddenFindingsMeriyah(ast, filePath, forbiddenWords) {
  const findings = [];

  const visit = (node, parent, key) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, parent, key);
      return;
    }

    if (typeof node.type !== 'string') {
      for (const child of Object.values(node)) visit(child, node, undefined);
      return;
    }

    switch (node.type) {
      case 'ThisExpression': {
        if (forbiddenWords.has('this')) addFinding(findings, filePath, 'this', node, 'formatear/no-this');
        break;
      }
      case 'IfStatement': {
        if (forbiddenWords.has('if')) addFinding(findings, filePath, 'if', node, 'formatear/no-if');
        if (node.alternate && forbiddenWords.has('else')) {
          addFinding(findings, filePath, 'else', node.alternate, 'formatear/no-else');
        }
        break;
      }
      case 'ReturnStatement': {
        if (forbiddenWords.has('return')) addFinding(findings, filePath, 'return', node, 'formatear/no-return');
        break;
      }
      case 'VariableDeclaration': {
        if (node.kind === 'var' && forbiddenWords.has('var'))
          addFinding(findings, filePath, 'var', node, 'formatear/no-var');
        if (node.kind === 'let' && forbiddenWords.has('let'))
          addFinding(findings, filePath, 'let', node, 'formatear/no-let');
        if (node.kind === 'const' && forbiddenWords.has('const'))
          addFinding(findings, filePath, 'const', node, 'formatear/no-const');
        break;
      }
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement': {
        if (forbiddenWords.has('for')) addFinding(findings, filePath, 'for', node, 'formatear/no-for');
        if (node.type === 'ForInStatement' && forbiddenWords.has('in'))
          addFinding(findings, filePath, 'in', node, 'formatear/no-in');
        if (node.type === 'ForOfStatement' && forbiddenWords.has('of'))
          addFinding(findings, filePath, 'of', node, 'formatear/no-of');
        break;
      }
      case 'WhileStatement': {
        if (forbiddenWords.has('while')) addFinding(findings, filePath, 'while', node, 'formatear/no-while');
        break;
      }
      case 'DoWhileStatement': {
        if (forbiddenWords.has('do')) addFinding(findings, filePath, 'do', node, 'formatear/no-do');
        break;
      }
      case 'SwitchStatement': {
        if (forbiddenWords.has('switch')) addFinding(findings, filePath, 'switch', node, 'formatear/no-switch');
        break;
      }
      case 'SwitchCase': {
        if (node.test && forbiddenWords.has('case')) addFinding(findings, filePath, 'case', node, 'formatear/no-case');
        if (!node.test && forbiddenWords.has('default'))
          addFinding(findings, filePath, 'default', node, 'formatear/no-default');
        break;
      }
      case 'BreakStatement': {
        if (forbiddenWords.has('break')) addFinding(findings, filePath, 'break', node, 'formatear/no-break');
        break;
      }
      case 'ContinueStatement': {
        if (forbiddenWords.has('continue')) addFinding(findings, filePath, 'continue', node, 'formatear/no-continue');
        break;
      }
      case 'TryStatement': {
        if (forbiddenWords.has('try')) addFinding(findings, filePath, 'try', node, 'formatear/no-try');
        if (node.finalizer && forbiddenWords.has('finally')) {
          addFinding(findings, filePath, 'finally', node.finalizer, 'formatear/no-finally');
        }
        break;
      }
      case 'CatchClause': {
        if (forbiddenWords.has('catch')) addFinding(findings, filePath, 'catch', node, 'formatear/no-catch');
        break;
      }
      case 'ThrowStatement': {
        if (forbiddenWords.has('throw')) addFinding(findings, filePath, 'throw', node, 'formatear/no-throw');
        break;
      }
      case 'NewExpression': {
        if (forbiddenWords.has('new')) addFinding(findings, filePath, 'new', node, 'formatear/no-new');
        break;
      }
      case 'UnaryExpression': {
        const op = node.operator;
        if (op === 'typeof' && forbiddenWords.has('typeof'))
          addFinding(findings, filePath, 'typeof', node, 'formatear/no-typeof');
        if (op === 'void' && forbiddenWords.has('void'))
          addFinding(findings, filePath, 'void', node, 'formatear/no-void');
        if (op === 'delete' && forbiddenWords.has('delete'))
          addFinding(findings, filePath, 'delete', node, 'formatear/no-delete');
        break;
      }
      case 'BinaryExpression': {
        const op = node.operator;
        if (op === 'in' && forbiddenWords.has('in')) addFinding(findings, filePath, 'in', node, 'formatear/no-in');
        if (op === 'instanceof' && forbiddenWords.has('instanceof'))
          addFinding(findings, filePath, 'instanceof', node, 'formatear/no-instanceof');
        break;
      }
      case 'FunctionDeclaration':
      case 'FunctionExpression': {
        if (forbiddenWords.has('function')) addFinding(findings, filePath, 'function', node, 'formatear/no-function');
        if (node.async === true && forbiddenWords.has('async'))
          addFinding(findings, filePath, 'async', node, 'formatear/no-async');
        break;
      }
      case 'ArrowFunctionExpression': {
        if (node.async === true && forbiddenWords.has('async'))
          addFinding(findings, filePath, 'async', node, 'formatear/no-async');
        break;
      }
      case 'AwaitExpression': {
        if (forbiddenWords.has('await')) addFinding(findings, filePath, 'await', node, 'formatear/no-await');
        break;
      }
      case 'YieldExpression': {
        if (forbiddenWords.has('yield')) addFinding(findings, filePath, 'yield', node, 'formatear/no-yield');
        break;
      }
      case 'ClassDeclaration':
      case 'ClassExpression': {
        if (forbiddenWords.has('class')) addFinding(findings, filePath, 'class', node, 'formatear/no-class');
        if (node.superClass && forbiddenWords.has('extends'))
          addFinding(findings, filePath, 'extends', node.superClass, 'formatear/no-extends');
        break;
      }
      case 'Super': {
        if (forbiddenWords.has('super')) addFinding(findings, filePath, 'super', node, 'formatear/no-super');
        break;
      }
      case 'ImportDeclaration':
      case 'ImportExpression': {
        if (forbiddenWords.has('import')) addFinding(findings, filePath, 'import', node, 'formatear/no-import');
        break;
      }
      case 'ExportNamedDeclaration':
      case 'ExportDefaultDeclaration':
      case 'ExportAllDeclaration': {
        if (forbiddenWords.has('export')) addFinding(findings, filePath, 'export', node, 'formatear/no-export');
        break;
      }
      case 'MetaProperty': {
        if (node.meta?.name === 'new' && node.property?.name === 'target' && forbiddenWords.has('target')) {
          addFinding(findings, filePath, 'target', node, 'formatear/no-target');
        }
        if (node.meta?.name === 'import' && node.property?.name === 'meta' && forbiddenWords.has('meta')) {
          addFinding(findings, filePath, 'meta', node, 'formatear/no-meta');
        }
        break;
      }
      case 'WithStatement': {
        if (forbiddenWords.has('with')) addFinding(findings, filePath, 'with', node, 'formatear/no-with');
        break;
      }
      case 'DebuggerStatement': {
        if (forbiddenWords.has('debugger')) addFinding(findings, filePath, 'debugger', node, 'formatear/no-debugger');
        break;
      }
      case 'Identifier': {
        if (
          typeof node.name === 'string' &&
          forbiddenWords.has(node.name) &&
          !isSkippableIdentifierContext(parent, key)
        ) {
          addFinding(findings, filePath, node.name, node, `formatear/no-${node.name}`);
        }
        break;
      }
      default: {
        break;
      }
    }

    for (const [childKey, child] of Object.entries(node)) {
      if (childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end') continue;
      visit(child, node, childKey);
    }
  };

  visit(ast, null, undefined);
  return findings;
}

function createTsFinding(findings, filePath, keyword, ruleId, sourceFile, pos) {
  const lc = sourceFile.getLineAndCharacterOfPosition(pos);
  findings.push({
    filePath,
    line: lc.line + 1,
    column: lc.character,
    keyword,
    ruleId,
  });
}

function isSkippableTsIdentifierContext(parent, node, ts) {
  if (!parent) return false;

  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isMethodDeclaration(parent) && parent.name === node) return true;
  if (ts.isMethodSignature(parent) && parent.name === node) return true;
  if (ts.isPropertyDeclaration(parent) && parent.name === node) return true;
  if (ts.isPropertySignature(parent) && parent.name === node) return true;
  if (ts.isGetAccessorDeclaration(parent) && parent.name === node) return true;
  if (ts.isSetAccessorDeclaration(parent) && parent.name === node) return true;
  if (ts.isShorthandPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isEnumMember(parent) && parent.name === node) return true;

  return false;
}

function collectForbiddenFindingsTypescript(sourceFile, filePath, forbiddenWords, ts) {
  const findings = [];

  const addKeywordNode = (keyword, node, ruleId) => {
    createTsFinding(findings, filePath, keyword, ruleId, sourceFile, node.getStart(sourceFile));
  };

  const addModifier = (keyword, modifier, ruleId) => {
    createTsFinding(findings, filePath, keyword, ruleId, sourceFile, modifier.getStart(sourceFile));
  };

  const visit = (node, parent) => {
    switch (node.kind) {
      case ts.SyntaxKind.ThisKeyword: {
        if (forbiddenWords.has('this')) addKeywordNode('this', node, 'formatear/no-this');
        break;
      }
      case ts.SyntaxKind.IfStatement: {
        if (forbiddenWords.has('if')) addKeywordNode('if', node, 'formatear/no-if');
        if (node.elseStatement && forbiddenWords.has('else'))
          addKeywordNode('else', node.elseStatement, 'formatear/no-else');
        break;
      }
      case ts.SyntaxKind.ReturnStatement: {
        if (forbiddenWords.has('return')) addKeywordNode('return', node, 'formatear/no-return');
        break;
      }
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement: {
        if (forbiddenWords.has('for')) addKeywordNode('for', node, 'formatear/no-for');
        if (node.kind === ts.SyntaxKind.ForInStatement && forbiddenWords.has('in'))
          addKeywordNode('in', node, 'formatear/no-in');
        if (node.kind === ts.SyntaxKind.ForOfStatement && forbiddenWords.has('of'))
          addKeywordNode('of', node, 'formatear/no-of');
        break;
      }
      case ts.SyntaxKind.WhileStatement: {
        if (forbiddenWords.has('while')) addKeywordNode('while', node, 'formatear/no-while');
        break;
      }
      case ts.SyntaxKind.DoStatement: {
        if (forbiddenWords.has('do')) addKeywordNode('do', node, 'formatear/no-do');
        break;
      }
      case ts.SyntaxKind.SwitchStatement: {
        if (forbiddenWords.has('switch')) addKeywordNode('switch', node, 'formatear/no-switch');
        break;
      }
      case ts.SyntaxKind.CaseClause: {
        if (forbiddenWords.has('case')) addKeywordNode('case', node, 'formatear/no-case');
        break;
      }
      case ts.SyntaxKind.DefaultClause: {
        if (forbiddenWords.has('default')) addKeywordNode('default', node, 'formatear/no-default');
        break;
      }
      case ts.SyntaxKind.BreakStatement: {
        if (forbiddenWords.has('break')) addKeywordNode('break', node, 'formatear/no-break');
        break;
      }
      case ts.SyntaxKind.ContinueStatement: {
        if (forbiddenWords.has('continue')) addKeywordNode('continue', node, 'formatear/no-continue');
        break;
      }
      case ts.SyntaxKind.TryStatement: {
        if (forbiddenWords.has('try')) addKeywordNode('try', node, 'formatear/no-try');
        if (node.finallyBlock && forbiddenWords.has('finally'))
          addKeywordNode('finally', node.finallyBlock, 'formatear/no-finally');
        break;
      }
      case ts.SyntaxKind.CatchClause: {
        if (forbiddenWords.has('catch')) addKeywordNode('catch', node, 'formatear/no-catch');
        break;
      }
      case ts.SyntaxKind.ThrowStatement: {
        if (forbiddenWords.has('throw')) addKeywordNode('throw', node, 'formatear/no-throw');
        break;
      }
      case ts.SyntaxKind.NewExpression: {
        if (forbiddenWords.has('new')) addKeywordNode('new', node, 'formatear/no-new');
        break;
      }
      case ts.SyntaxKind.TypeOfExpression: {
        if (forbiddenWords.has('typeof')) addKeywordNode('typeof', node, 'formatear/no-typeof');
        break;
      }
      case ts.SyntaxKind.VoidExpression: {
        if (forbiddenWords.has('void')) addKeywordNode('void', node, 'formatear/no-void');
        break;
      }
      case ts.SyntaxKind.DeleteExpression: {
        if (forbiddenWords.has('delete')) addKeywordNode('delete', node, 'formatear/no-delete');
        break;
      }
      case ts.SyntaxKind.BinaryExpression: {
        const operatorToken = node.operatorToken?.kind;
        if (operatorToken === ts.SyntaxKind.InKeyword && forbiddenWords.has('in'))
          addKeywordNode('in', node, 'formatear/no-in');
        if (operatorToken === ts.SyntaxKind.InstanceOfKeyword && forbiddenWords.has('instanceof'))
          addKeywordNode('instanceof', node, 'formatear/no-instanceof');
        break;
      }
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.FunctionExpression: {
        if (forbiddenWords.has('function')) addKeywordNode('function', node, 'formatear/no-function');
        break;
      }
      case ts.SyntaxKind.ClassDeclaration:
      case ts.SyntaxKind.ClassExpression: {
        if (forbiddenWords.has('class')) addKeywordNode('class', node, 'formatear/no-class');
        break;
      }
      case ts.SyntaxKind.SuperKeyword: {
        if (forbiddenWords.has('super')) addKeywordNode('super', node, 'formatear/no-super');
        break;
      }
      case ts.SyntaxKind.AwaitExpression: {
        if (forbiddenWords.has('await')) addKeywordNode('await', node, 'formatear/no-await');
        break;
      }
      case ts.SyntaxKind.YieldExpression: {
        if (forbiddenWords.has('yield')) addKeywordNode('yield', node, 'formatear/no-yield');
        break;
      }
      case ts.SyntaxKind.InterfaceDeclaration: {
        if (forbiddenWords.has('interface')) addKeywordNode('interface', node, 'formatear/no-interface');
        break;
      }
      case ts.SyntaxKind.EnumDeclaration: {
        if (forbiddenWords.has('enum')) addKeywordNode('enum', node, 'formatear/no-enum');
        break;
      }
      case ts.SyntaxKind.MetaProperty: {
        const { keywordToken } = node;
        const name = node.name?.escapedText;
        if (keywordToken === ts.SyntaxKind.NewKeyword && name === 'target' && forbiddenWords.has('target')) {
          addKeywordNode('target', node, 'formatear/no-target');
        }
        if (keywordToken === ts.SyntaxKind.ImportKeyword && name === 'meta' && forbiddenWords.has('meta')) {
          addKeywordNode('meta', node, 'formatear/no-meta');
        }
        break;
      }
      case ts.SyntaxKind.AsExpression: {
        if (forbiddenWords.has('as')) addKeywordNode('as', node, 'formatear/no-as');
        break;
      }
      case ts.SyntaxKind.WithStatement: {
        if (forbiddenWords.has('with')) addKeywordNode('with', node, 'formatear/no-with');
        break;
      }
      case ts.SyntaxKind.DebuggerStatement: {
        if (forbiddenWords.has('debugger')) addKeywordNode('debugger', node, 'formatear/no-debugger');
        break;
      }
      case ts.SyntaxKind.VariableStatement: {
        const flags = node.declarationList?.flags ?? 0;
        if (forbiddenWords.has('const') && (flags & ts.NodeFlags.Const) !== 0)
          addKeywordNode('const', node, 'formatear/no-const');
        if (forbiddenWords.has('let') && (flags & ts.NodeFlags.Let) !== 0)
          addKeywordNode('let', node, 'formatear/no-let');
        if (forbiddenWords.has('var') && (flags & (ts.NodeFlags.Const | ts.NodeFlags.Let)) === 0)
          addKeywordNode('var', node, 'formatear/no-var');
        break;
      }
      case ts.SyntaxKind.Constructor: {
        if (forbiddenWords.has('constructor')) addKeywordNode('constructor', node, 'formatear/no-constructor');
        break;
      }
      case ts.SyntaxKind.Identifier: {
        const name = node.escapedText;
        if (typeof name === 'string' && forbiddenWords.has(name) && !isSkippableTsIdentifierContext(parent, node, ts)) {
          addKeywordNode(name, node, `formatear/no-${name}`);
        }
        break;
      }
      default: {
        break;
      }
    }

    const { modifiers } = node;
    if (modifiers && modifiers.length) {
      for (const modifier of modifiers) {
        switch (modifier.kind) {
          case ts.SyntaxKind.PublicKeyword: {
            if (forbiddenWords.has('public')) addModifier('public', modifier, 'formatear/no-public');
            break;
          }
          case ts.SyntaxKind.PrivateKeyword: {
            if (forbiddenWords.has('private')) addModifier('private', modifier, 'formatear/no-private');
            break;
          }
          case ts.SyntaxKind.ProtectedKeyword: {
            if (forbiddenWords.has('protected')) addModifier('protected', modifier, 'formatear/no-protected');
            break;
          }
          case ts.SyntaxKind.StaticKeyword: {
            if (forbiddenWords.has('static')) addModifier('static', modifier, 'formatear/no-static');
            break;
          }
          case ts.SyntaxKind.AsyncKeyword: {
            if (forbiddenWords.has('async')) addModifier('async', modifier, 'formatear/no-async');
            break;
          }
          case ts.SyntaxKind.AccessorKeyword: {
            if (forbiddenWords.has('accessor')) addModifier('accessor', modifier, 'formatear/no-accessor');
            break;
          }
          default: {
            break;
          }
        }
      }
    }

    if (node.heritageClauses && node.heritageClauses.length) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword && forbiddenWords.has('extends')) {
          addKeywordNode('extends', clause, 'formatear/no-extends');
        }
        if (clause.token === ts.SyntaxKind.ImplementsKeyword && forbiddenWords.has('implements')) {
          addKeywordNode('implements', clause, 'formatear/no-implements');
        }
      }
    }

    ts.forEachChild(node, (child) => visit(child, node));
  };

  visit(sourceFile, null);
  return findings;
}

async function parseFileMeriyah(filePath, parse) {
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

  return ast;
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

  const forbiddenWords = await loadForbiddenWords();

  let parseErrorCount = 0;
  let issueCount = 0;

  let parse;
  let ts;
  try {
    ({ parse } = await importMeriyah());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return 2;
  }

  for (const filePath of files) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      let findings;

      if (ext === '.ts' || ext === '.tsx' || ext === '.mts' || ext === '.cts') {
        if (!ts) ts = await importTypescript();
        const sourceText = await fs.readFile(filePath, 'utf8');
        const scriptKind =
          ext === '.tsx'
            ? ts.ScriptKind.TSX
            : ext === '.mts'
              ? ts.ScriptKind.TS
              : ext === '.cts'
                ? ts.ScriptKind.TS
                : ts.ScriptKind.TS;
        const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind);
        findings = collectForbiddenFindingsTypescript(sourceFile, filePath, forbiddenWords, ts);
      } else {
        const ast = await parseFileMeriyah(filePath, parse);
        findings = collectForbiddenFindingsMeriyah(ast, filePath, forbiddenWords);
      }

      for (const finding of findings) {
        issueCount += 1;
        const normalize = (value) => {
          const str = String(value);
          let out = '';
          for (let i = 0; i < str.length; i += 1) {
            const code = str.charCodeAt(i);
            if (code <= 31 || code === 127) continue;
            out += str[i];
          }
          return out;
        };
        const filePath = normalize(finding.filePath);
        const keyword = normalize(finding.keyword);
        const ruleIdValue =
          typeof finding.ruleId === 'string' && finding.ruleId.length > 0 ? finding.ruleId : 'formatear/unknown';
        const ruleId = normalize(ruleIdValue);
        process.stdout.write(
          `${filePath}:${finding.line}:${finding.column}  error  No se debe usar la palabra «${keyword}»  ${ruleId}\n`,
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
