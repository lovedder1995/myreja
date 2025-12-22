#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

async function importMeriyah() {
    try {
        return await import('../dist/meriyah.mjs')

    } catch {
        throw new Error('No se encontró `dist/meriyah.mjs`. Ejecutá `bun run build` y reintentá.')

    }
}

async function importTypescript() {
    try {
        return await import('typescript')

    } catch {
        throw new Error('No se encontró `typescript`. Instalalo y reintentá.')

    }
}

async function loadForbiddenWords() {
    let fallback = new Set(['this'])


    let scriptPath = process.argv[1]


    if (typeof scriptPath !== 'string' || scriptPath.length === 0) {
        scriptPath = process.cwd()

    }

    let tokenFilePath = path.resolve(path.dirname(path.resolve(scriptPath)), '..', 'src', 'token.ts')


    let content


    try {
        content = await fs.readFile(tokenFilePath, 'utf8')

    } catch {
        return fallback

    }

    let forbidden = new Set()


    let entryRegExp = /^\s*([A-Za-z_$][\w$]*):\s*Token\.[A-Za-z0-9_$]+,\s*\/\/\s*Prohibida\b/gm


    Array.from(content.matchAll(entryRegExp)).forEach(function (match) {
        forbidden.add(match[1])

    })


    if (forbidden.size > 0) {
        return forbidden

    }

    return fallback

}

function printHelp() {
    process.stdout.write(`Uso:
  meriyah --formatear <archivo|directorio> [...]
`)

}

function isPathLike(value) {
    return typeof value === 'string' && value.length > 0

}

async function pathKind(p) {
    try {
        let stats = await fs.stat(p)


        if (stats.isDirectory()) {
            return 'dir'

        }

        if (stats.isFile()) {
            return 'file'

        }

        return 'other'

    } catch {
        return 'missing'

    }
}

async function collectFiles(inputPath, out) {
    let kind = await pathKind(inputPath)


    if (kind === 'file') {
        out.add(path.resolve(inputPath))


        return

    }
    if (kind !== 'dir') {
        return

    }

    let entries = await fs.readdir(inputPath, { withFileTypes: true })


    await Promise.all(
    entries.map(async function (entry) {
        let fullPath = path.join(inputPath, entry.name)


        if (entry.isDirectory()) {
            let isSkipped = entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage'


            if (isSkipped) {
                return

            }

            await collectFiles(fullPath, out)


            return

        }

        if (!entry.isFile()) {
            return

        }

        if (!/\.(?:[cm]?[jt]sx?|mjs|cjs|mts|cts)$/.test(entry.name)) {
            return

        }

        out.add(path.resolve(fullPath))

    }),
    )

}

function isSkippableIdentifierContext(parent, key) {
    if (!parent || typeof parent !== 'object') {
        return false

    }

    if (parent.type === 'MemberExpression' && key === 'property' && parent.computed === false) {
        return true

    }

    if (parent.type === 'Property' && key === 'key' && parent.computed === false) {
        return true

    }

    if (parent.type === 'MethodDefinition' && key === 'key' && parent.computed === false) {
        return true

    }

    if (parent.type === 'PropertyDefinition' && key === 'key' && parent.computed === false) {
        return true

    }

    if (parent.type === 'AccessorProperty' && key === 'key' && parent.computed === false) {
        return true

    }

    return false

}

function addFinding(findings, filePath, keyword, node, ruleId) {
    let line = node?.loc?.start?.line ?? 1


    let column = node?.loc?.start?.column ?? 0


    findings.push({
        filePath,
        line,
        column,
        keyword,
        ruleId,
    })

}

function addFindingAtLoc(findings, filePath, keyword, loc, ruleId) {
    let line = loc?.start?.line ?? 1


    let column = loc?.start?.column ?? 0


    findings.push({
        filePath,
        line,
        column,
        keyword,
        ruleId,
    })

}

function applyReplacements(sourceText, replacements) {
    if (!replacements.length) {
        return sourceText

    }

    let sorted = replacements
    .slice()
    .sort(function (a, b) {
        return b.start - a.start

    })
    .filter(function (rep) {
        return (
        typeof rep?.start === 'number' &&
        typeof rep?.end === 'number' &&
        rep.start >= 0 &&
        rep.end >= rep.start &&
        typeof rep?.text === 'string'
        )

    })


    let out = sourceText


    let lastStart = out.length + 1


    sorted.forEach(function (rep) {
        if (rep.end > lastStart) {
            return

        }

        out = out.slice(0, rep.start) + rep.text + out.slice(rep.end)


        lastStart = rep.start

    })


    return out

}

function stripTrailingWhitespace(sourceText) {
    if (typeof sourceText !== 'string' || sourceText.length === 0) {
        return sourceText

    }

    let out = sourceText.replace(/[ \t]+(?=\r?\n)/g, '')
    out = out.replace(/[ \t]+(?=\r)/g, '')
    out = out.replace(/[ \t]+$/g, '')

    return out

}

function convertTabsToFourSpacesOutsideTokens(sourceText, spans) {
    if (typeof sourceText !== 'string' || sourceText.length === 0) {
        return sourceText

    }

    if (!sourceText.includes('\t')) {
        return sourceText

    }

    if (!Array.isArray(spans) || spans.length === 0) {
        return sourceText.replace(/\t/g, '    ')

    }

    let len = sourceText.length


    let sorted = spans
    .slice()
    .filter(function (span) {
        return (
        span &&
        typeof span.start === 'number' &&
        typeof span.end === 'number' &&
        Number.isFinite(span.start) &&
        Number.isFinite(span.end)
        )

    })
    .map(function (span) {
        let start = Math.max(0, Math.min(len, span.start))
        let end = Math.max(start, Math.min(len, span.end))


        return { start, end }

    })
    .sort(function (a, b) {
        return a.start - b.start

    })


    let merged = []


    sorted.forEach(function (span) {
        if (merged.length === 0) {
            merged.push(span)


            return

        }

        let last = merged[merged.length - 1]


        if (span.start > last.end) {
            merged.push(span)


            return

        }

        if (span.end > last.end) {
            last.end = span.end

        }
    })


    let out = ''


    let cursor = 0


    merged.forEach(function (span) {
        if (span.start > cursor) {
            out += sourceText.slice(cursor, span.start).replace(/\t/g, '    ')

        }

        out += sourceText.slice(span.start, span.end)
        cursor = span.end

    })


    if (cursor < len) {
        out += sourceText.slice(cursor).replace(/\t/g, '    ')

    }

    return out

}

function mergeSpans(spans, len) {
    if (!Array.isArray(spans) || spans.length === 0) {
        return []

    }

    let sorted = spans
    .slice()
    .filter(function (span) {
        return (
        span &&
        typeof span.start === 'number' &&
        typeof span.end === 'number' &&
        Number.isFinite(span.start) &&
        Number.isFinite(span.end)
        )

    })
    .map(function (span) {
        let start = Math.max(0, Math.min(len, span.start))
        let end = Math.max(start, Math.min(len, span.end))


        return { start, end }

    })
    .sort(function (a, b) {
        return a.start - b.start

    })

    let merged = []


    sorted.forEach(function (span) {
        if (merged.length === 0) {
            merged.push(span)


            return

        }

        let last = merged[merged.length - 1]


        if (span.start > last.end) {
            merged.push(span)


            return

        }

        if (span.end > last.end) {
            last.end = span.end

        }
    })

    return merged

}

function isInsideMergedSpans(index, merged) {
    function search(lo, hi) {
        if (lo > hi) {
            return false

        }

        let mid = (lo + hi) >> 1
        let span = merged[mid]


        if (index < span.start) {
            return search(lo, mid - 1)

        }

        if (index >= span.end) {
            return search(mid + 1, hi)

        }

        return true

    }

    return search(0, merged.length - 1)

}

function reindentFourSpacesOutsideTokens(sourceText, tokenSpans, braceEvents) {
    if (typeof sourceText !== 'string' || sourceText.length === 0) {
        return sourceText

    }

    let len = sourceText.length


    let mergedTokenSpans = mergeSpans(tokenSpans, len)


    let events = Array.isArray(braceEvents)
    ? braceEvents
    .slice()
    .filter(function (e) {
        return e && typeof e.pos === 'number' && Number.isFinite(e.pos) && (e.delta === 1 || e.delta === -1)

    })
    .map(function (e) {
        let pos = Math.max(0, Math.min(len, e.pos))


        return { pos, delta: e.delta }

    })
    .sort(function (a, b) {
        return a.pos - b.pos

    })
    : []


    let out = ''

    let eventPos = []
    let eventPrefix = []


    events.forEach(function (e, index) {
        eventPos.push(e.pos)


        if (index === 0) {
            eventPrefix.push(e.delta)


            return

        }

        eventPrefix.push(eventPrefix[index - 1] + e.delta)

    })

    function upperBound(arr, value) {
        function search(lo, hi) {
            if (lo > hi) {
                return lo

            }

            let mid = (lo + hi) >> 1


            if (arr[mid] < value) {
                return search(mid + 1, hi)

            }

            return search(lo, mid - 1)

        }

        return search(0, arr.length - 1)

    }

    function depthAtPos(pos) {
        if (eventPos.length === 0) {
            return 0

        }

        let idx = upperBound(eventPos, pos)


        if (idx <= 0) {
            return 0

        }

        let depth = eventPrefix[idx - 1]


        if (depth < 0) {
            return 0

        }

        return depth

    }

    function splitLineSegment(segment) {
        if (segment.endsWith('\r\n')) {
            return { lineText: segment.slice(0, -2), lineBreak: '\r\n' }

        }

        if (segment.endsWith('\n')) {
            return { lineText: segment.slice(0, -1), lineBreak: '\n' }

        }

        if (segment.endsWith('\r')) {
            return { lineText: segment.slice(0, -1), lineBreak: '\r' }

        }

        return { lineText: segment, lineBreak: '' }

    }

    let segments = sourceText.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) || []


    let cursor = 0


    segments.forEach(function (segment) {
        if (!segment) {
            return

        }

        let parts = splitLineSegment(segment)
        let { lineText, lineBreak } = parts


        let lineStart = cursor
        cursor += segment.length


        if (lineText.trim().length === 0) {
            out += lineBreak


            return

        }

        if (isInsideMergedSpans(lineStart, mergedTokenSpans)) {
            out += lineText + lineBreak


            return

        }

        let content = lineText.replace(/^[ \t]+/, '')


        if (content.length === 0) {
            out += lineBreak


            return

        }

        let depth = depthAtPos(lineStart)
        let closeMatch = content.match(/^}+/)
        let leadingCloseCount = closeMatch ? closeMatch[0].length : 0


        let indentLevel = depth - leadingCloseCount


        if (indentLevel < 0) {
            indentLevel = 0

        }

        out += ' '.repeat(indentLevel * 4) + content + lineBreak

    })

    return out

}

function isInsideAnySpan(index, spans) {
    return spans.some(function (span) {
        return index >= span.start && index < span.end

    })

}

function collectEmptyStatementRangesMeriyah(ast) {
    let ranges = []


    function visit(node, parent, key) {
        if (!node || typeof node !== 'object') {
            return

        }

        if (Array.isArray(node)) {
            node.forEach(function (item) {
                visit(item, parent, key)

            })


            return

        }

        if (typeof node.type !== 'string') {
            Object.values(node).forEach(function (child) {
                visit(child, node, undefined)

            })


            return

        }

        if (
        node.type === 'EmptyStatement' &&
        typeof node.start === 'number' &&
        typeof node.end === 'number' &&
        node.end > node.start
        ) {
            ranges.push({ start: node.start, end: node.end })

        }

        Object.entries(node).forEach(function (pair) {
            let childKey = pair[0]


            if (childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end') {
                return

            }

            visit(pair[1], node, childKey)

        })

    }

    visit(ast, null, undefined)


    return ranges

}

function collectForHeaderSpansFromMeriyahTokens(tokens) {
    let spans = []


    function scanFrom(i) {
        if (i >= tokens.length) {
            return spans

        }

        let token = tokens[i]


        if (!token || token.type !== 'Keyword' || token.text !== 'for') {
            return scanFrom(i + 1)

        }

        let j = i + 1


        if (tokens[j] && tokens[j].type === 'Keyword' && tokens[j].text === 'await') {
            j += 1

        }

        let openParenToken = tokens[j]


        if (!openParenToken || openParenToken.type !== 'Punctuator' || openParenToken.text !== '(') {
            return scanFrom(i + 1)

        }

        let { start } = openParenToken


        function scanParen(k, depth) {
            if (k >= tokens.length) {
                return scanFrom(i + 1)

            }

            let token = tokens[k]


            let nextDepth = depth


            if (token.type === 'Punctuator' && token.text === '(') {
                nextDepth += 1

            }

            if (token.type === 'Punctuator' && token.text === ')') {
                nextDepth -= 1

            }

            if (token.type === 'Punctuator' && token.text === ')' && nextDepth === 0) {
                spans.push({ start, end: token.end })


                return scanFrom(k + 1)

            }

            return scanParen(k + 1, nextDepth)

        }

        return scanParen(j, 0)

    }

    return scanFrom(0)

}

function collectForbiddenFindingsMeriyah(ast, filePath, forbiddenWords) {
    let findings = []


    function visit(node, parent, key) {
        if (!node || typeof node !== 'object') {
            return

        }

        if (Array.isArray(node)) {
            node.forEach(function (item) {
                visit(item, parent, key)

            })


            return

        }

        if (typeof node.type !== 'string') {
            Object.values(node).forEach(function (child) {
                visit(child, node, undefined)

            })


            return

        }

        let { type: nodeType } = node


        if (nodeType === 'ThisExpression') {
            if (forbiddenWords.has('this')) {
                addFinding(findings, filePath, 'this', node, 'formatear/no-this')

            }
        }

        if (nodeType === 'IfStatement') {
            if (forbiddenWords.has('if')) {
                addFinding(findings, filePath, 'if', node, 'formatear/no-if')

            }

            if (node.alternate && forbiddenWords.has('else')) {
                addFinding(findings, filePath, 'else', node.alternate, 'formatear/no-else')

            }
        }

        if (nodeType === 'ReturnStatement') {
            if (forbiddenWords.has('return')) {
                addFinding(findings, filePath, 'return', node, 'formatear/no-return')

            }
        }

        if (nodeType === 'VariableDeclaration') {
            if (node.kind === 'var' && forbiddenWords.has('var')) {
                addFinding(findings, filePath, 'var', node, 'formatear/no-var')

            }

            if (node.kind === 'let' && forbiddenWords.has('let')) {
                addFinding(findings, filePath, 'let', node, 'formatear/no-let')

            }

            if (node.kind === 'const' && forbiddenWords.has('const')) {
                addFinding(findings, filePath, 'const', node, 'formatear/no-const')

            }
        }

        if (nodeType === 'ForStatement' || nodeType === 'ForInStatement' || nodeType === 'ForOfStatement') {
            if (forbiddenWords.has('for')) {
                addFinding(findings, filePath, 'for', node, 'formatear/no-for')

            }

            if (nodeType === 'ForInStatement' && forbiddenWords.has('in')) {
                addFinding(findings, filePath, 'in', node, 'formatear/no-in')

            }

            if (nodeType === 'ForOfStatement' && forbiddenWords.has('of')) {
                addFinding(findings, filePath, 'of', node, 'formatear/no-of')

            }
        }

        if (nodeType === 'WhileStatement') {
            if (forbiddenWords.has('while')) {
                addFinding(findings, filePath, 'while', node, 'formatear/no-while')

            }
        }

        if (nodeType === 'DoWhileStatement') {
            if (forbiddenWords.has('do')) {
                addFinding(findings, filePath, 'do', node, 'formatear/no-do')

            }
        }

        if (nodeType === 'SwitchStatement') {
            if (forbiddenWords.has('switch')) {
                addFinding(findings, filePath, 'switch', node, 'formatear/no-switch')

            }
        }

        if (nodeType === 'SwitchCase') {
            if (node.test && forbiddenWords.has('case')) {
                addFinding(findings, filePath, 'case', node, 'formatear/no-case')

            }

            if (!node.test && forbiddenWords.has('default')) {
                addFinding(findings, filePath, 'default', node, 'formatear/no-default')

            }
        }

        if (nodeType === 'BreakStatement') {
            if (forbiddenWords.has('break')) {
                addFinding(findings, filePath, 'break', node, 'formatear/no-break')

            }
        }

        if (nodeType === 'ContinueStatement') {
            if (forbiddenWords.has('continue')) {
                addFinding(findings, filePath, 'continue', node, 'formatear/no-continue')

            }
        }

        if (nodeType === 'TryStatement') {
            if (forbiddenWords.has('try')) {
                addFinding(findings, filePath, 'try', node, 'formatear/no-try')

            }

            if (node.finalizer && forbiddenWords.has('finally')) {
                addFinding(findings, filePath, 'finally', node.finalizer, 'formatear/no-finally')

            }
        }

        if (nodeType === 'CatchClause') {
            if (forbiddenWords.has('catch')) {
                addFinding(findings, filePath, 'catch', node, 'formatear/no-catch')

            }
        }

        if (nodeType === 'ThrowStatement') {
            if (forbiddenWords.has('throw')) {
                addFinding(findings, filePath, 'throw', node, 'formatear/no-throw')

            }
        }

        if (nodeType === 'NewExpression') {
            if (forbiddenWords.has('new')) {
                addFinding(findings, filePath, 'new', node, 'formatear/no-new')

            }
        }

        if (nodeType === 'UnaryExpression') {
            let { operator: op } = node


            if (op === 'typeof' && forbiddenWords.has('typeof')) {
                addFinding(findings, filePath, 'typeof', node, 'formatear/no-typeof')

            }

            if (op === 'void' && forbiddenWords.has('void')) {
                addFinding(findings, filePath, 'void', node, 'formatear/no-void')

            }

            if (op === 'delete' && forbiddenWords.has('delete')) {
                addFinding(findings, filePath, 'delete', node, 'formatear/no-delete')

            }
        }

        if (nodeType === 'BinaryExpression') {
            let { operator: op } = node


            if (op === 'in' && forbiddenWords.has('in')) {
                addFinding(findings, filePath, 'in', node, 'formatear/no-in')

            }

            if (op === 'instanceof' && forbiddenWords.has('instanceof')) {
                addFinding(findings, filePath, 'instanceof', node, 'formatear/no-instanceof')

            }
        }

        if (nodeType === 'FunctionDeclaration' || nodeType === 'FunctionExpression') {
            if (forbiddenWords.has('function')) {
                addFinding(findings, filePath, 'function', node, 'formatear/no-function')

            }

            if (node.async === true && forbiddenWords.has('async')) {
                addFinding(findings, filePath, 'async', node, 'formatear/no-async')

            }
        }

        if (nodeType === 'ArrowFunctionExpression') {
            if (node.async === true && forbiddenWords.has('async')) {
                addFinding(findings, filePath, 'async', node, 'formatear/no-async')

            }
        }

        if (nodeType === 'AwaitExpression') {
            if (forbiddenWords.has('await')) {
                addFinding(findings, filePath, 'await', node, 'formatear/no-await')

            }
        }

        if (nodeType === 'YieldExpression') {
            if (forbiddenWords.has('yield')) {
                addFinding(findings, filePath, 'yield', node, 'formatear/no-yield')

            }
        }

        if (nodeType === 'ClassDeclaration' || nodeType === 'ClassExpression') {
            if (forbiddenWords.has('class')) {
                addFinding(findings, filePath, 'class', node, 'formatear/no-class')

            }

            if (node.superClass && forbiddenWords.has('extends')) {
                addFinding(findings, filePath, 'extends', node.superClass, 'formatear/no-extends')

            }
        }

        if (nodeType === 'Super') {
            if (forbiddenWords.has('super')) {
                addFinding(findings, filePath, 'super', node, 'formatear/no-super')

            }
        }

        if (nodeType === 'ImportDeclaration' || nodeType === 'ImportExpression') {
            if (forbiddenWords.has('import')) {
                addFinding(findings, filePath, 'import', node, 'formatear/no-import')

            }
        }

        if (
        nodeType === 'ExportNamedDeclaration' ||
        nodeType === 'ExportDefaultDeclaration' ||
        nodeType === 'ExportAllDeclaration'
        ) {
            if (forbiddenWords.has('export')) {
                addFinding(findings, filePath, 'export', node, 'formatear/no-export')

            }
        }

        if (nodeType === 'MetaProperty') {
            let metaNode = node['meta']


            let propertyNode = node['property']


            let metaName = metaNode && metaNode.name


            let propertyName = propertyNode && propertyNode.name


            if (metaName === 'new' && propertyName === 'target' && forbiddenWords.has('target')) {
                addFinding(findings, filePath, 'target', node, 'formatear/no-target')

            }

            if (metaName === 'import' && propertyName === 'meta' && forbiddenWords.has('meta')) {
                addFinding(findings, filePath, 'meta', node, 'formatear/no-meta')

            }
        }

        if (nodeType === 'WithStatement') {
            if (forbiddenWords.has('with')) {
                addFinding(findings, filePath, 'with', node, 'formatear/no-with')

            }
        }

        if (nodeType === 'DebuggerStatement') {
            if (forbiddenWords.has('debugger')) {
                addFinding(findings, filePath, 'debugger', node, 'formatear/no-debugger')

            }
        }

        if (nodeType === 'Identifier') {
            if (
            typeof node.name === 'string' &&
            forbiddenWords.has(node.name) &&
            !isSkippableIdentifierContext(parent, key)
            ) {
                addFinding(findings, filePath, node.name, node, `formatear/no-${node.name}`)

            }
        }

        Object.entries(node).forEach(function (pair) {
            let childKey = pair[0]


            if (childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end') {
                return

            }

            visit(pair[1], node, childKey)

        })

    }

    visit(ast, null, undefined)


    return findings

}

function collectConditionSingleVariableFindingsMeriyah(ast, filePath) {
    let findings = []


    function checkTest(node) {
        if (!node || typeof node !== 'object') {
            return

        }

        let { test } = node


        if (!test || typeof test !== 'object') {
            return

        }

        if (test.type === 'Identifier') {
            return

        }

        addFinding(findings, filePath, 'condicion', test, 'formatear/condition-single-variable')

    }

    function visit(node) {
        if (!node || typeof node !== 'object') {
            return

        }

        if (Array.isArray(node)) {
            node.forEach(visit)


            return

        }

        if (typeof node.type === 'string') {
            let { type } = node


            if (
            type === 'IfStatement' ||
            type === 'WhileStatement' ||
            type === 'DoWhileStatement' ||
            type === 'ForStatement'
            ) {
                checkTest(node)

            }
        }

        Object.entries(node).forEach(function (pair) {
            let key = pair[0]


            if (key === 'loc' || key === 'range' || key === 'start' || key === 'end') {
                return

            }

            visit(pair[1])

        })

    }

    visit(ast)


    return findings

}

function createTsFinding(findings, filePath, keyword, ruleId, sourceFile, pos) {
    let lc = sourceFile.getLineAndCharacterOfPosition(pos)


    findings.push({
        filePath,
        line: lc.line + 1,
        column: lc.character,
        keyword,
        ruleId,
    })

}

function isSkippableTsIdentifierContext(parent, node, ts) {
    if (!parent) {
        return false

    }

    if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
        return true

    }

    if (ts.isPropertyAssignment(parent) && parent.name === node) {
        return true

    }

    if (ts.isMethodDeclaration(parent) && parent.name === node) {
        return true

    }

    if (ts.isMethodSignature(parent) && parent.name === node) {
        return true

    }

    if (ts.isPropertyDeclaration(parent) && parent.name === node) {
        return true

    }

    if (ts.isPropertySignature(parent) && parent.name === node) {
        return true

    }

    if (ts.isGetAccessorDeclaration(parent) && parent.name === node) {
        return true

    }

    if (ts.isSetAccessorDeclaration(parent) && parent.name === node) {
        return true

    }

    if (ts.isShorthandPropertyAssignment(parent) && parent.name === node) {
        return true

    }

    if (ts.isEnumMember(parent) && parent.name === node) {
        return true

    }

    return false

}

function collectForbiddenFindingsTypescript(sourceFile, filePath, forbiddenWords, ts) {
    let findings = []


    function addKeywordNode(keyword, node, ruleId) {
        createTsFinding(findings, filePath, keyword, ruleId, sourceFile, node.getStart(sourceFile))

    }

    function addModifier(keyword, modifier, ruleId) {
        createTsFinding(findings, filePath, keyword, ruleId, sourceFile, modifier.getStart(sourceFile))

    }

    function visit(node, parent) {
        let { kind } = node


        if (kind === ts.SyntaxKind.ThisKeyword) {
            if (forbiddenWords.has('this')) {
                addKeywordNode('this', node, 'formatear/no-this')

            }
        }

        if (kind === ts.SyntaxKind.IfStatement) {
            if (forbiddenWords.has('if')) {
                addKeywordNode('if', node, 'formatear/no-if')

            }

            if (node.elseStatement && forbiddenWords.has('else')) {
                addKeywordNode('else', node.elseStatement, 'formatear/no-else')

            }
        }

        if (kind === ts.SyntaxKind.ReturnStatement) {
            if (forbiddenWords.has('return')) {
                addKeywordNode('return', node, 'formatear/no-return')

            }
        }

        if (
        kind === ts.SyntaxKind.ForStatement ||
        kind === ts.SyntaxKind.ForInStatement ||
        kind === ts.SyntaxKind.ForOfStatement
        ) {
            if (forbiddenWords.has('for')) {
                addKeywordNode('for', node, 'formatear/no-for')

            }

            if (kind === ts.SyntaxKind.ForInStatement && forbiddenWords.has('in')) {
                addKeywordNode('in', node, 'formatear/no-in')

            }

            if (kind === ts.SyntaxKind.ForOfStatement && forbiddenWords.has('of')) {
                addKeywordNode('of', node, 'formatear/no-of')

            }
        }

        if (kind === ts.SyntaxKind.WhileStatement) {
            if (forbiddenWords.has('while')) {
                addKeywordNode('while', node, 'formatear/no-while')

            }
        }

        if (kind === ts.SyntaxKind.DoStatement) {
            if (forbiddenWords.has('do')) {
                addKeywordNode('do', node, 'formatear/no-do')

            }
        }

        if (kind === ts.SyntaxKind.SwitchStatement) {
            if (forbiddenWords.has('switch')) {
                addKeywordNode('switch', node, 'formatear/no-switch')

            }
        }

        if (kind === ts.SyntaxKind.CaseClause) {
            if (forbiddenWords.has('case')) {
                addKeywordNode('case', node, 'formatear/no-case')

            }
        }

        if (kind === ts.SyntaxKind.DefaultClause) {
            if (forbiddenWords.has('default')) {
                addKeywordNode('default', node, 'formatear/no-default')

            }
        }

        if (kind === ts.SyntaxKind.BreakStatement) {
            if (forbiddenWords.has('break')) {
                addKeywordNode('break', node, 'formatear/no-break')

            }
        }

        if (kind === ts.SyntaxKind.ContinueStatement) {
            if (forbiddenWords.has('continue')) {
                addKeywordNode('continue', node, 'formatear/no-continue')

            }
        }

        if (kind === ts.SyntaxKind.TryStatement) {
            if (forbiddenWords.has('try')) {
                addKeywordNode('try', node, 'formatear/no-try')

            }

            if (node.finallyBlock && forbiddenWords.has('finally')) {
                addKeywordNode('finally', node.finallyBlock, 'formatear/no-finally')

            }
        }

        if (kind === ts.SyntaxKind.CatchClause) {
            if (forbiddenWords.has('catch')) {
                addKeywordNode('catch', node, 'formatear/no-catch')

            }
        }

        if (kind === ts.SyntaxKind.ThrowStatement) {
            if (forbiddenWords.has('throw')) {
                addKeywordNode('throw', node, 'formatear/no-throw')

            }
        }

        if (kind === ts.SyntaxKind.NewExpression) {
            if (forbiddenWords.has('new')) {
                addKeywordNode('new', node, 'formatear/no-new')

            }
        }

        if (kind === ts.SyntaxKind.TypeOfExpression) {
            if (forbiddenWords.has('typeof')) {
                addKeywordNode('typeof', node, 'formatear/no-typeof')

            }
        }

        if (kind === ts.SyntaxKind.VoidExpression) {
            if (forbiddenWords.has('void')) {
                addKeywordNode('void', node, 'formatear/no-void')

            }
        }

        if (kind === ts.SyntaxKind.DeleteExpression) {
            if (forbiddenWords.has('delete')) {
                addKeywordNode('delete', node, 'formatear/no-delete')

            }
        }

        if (kind === ts.SyntaxKind.BinaryExpression) {
            let { operatorToken } = node


            let { kind: operatorKind } = operatorToken || {}


            if (operatorKind === ts.SyntaxKind.InKeyword && forbiddenWords.has('in')) {
                addKeywordNode('in', node, 'formatear/no-in')

            }

            if (operatorKind === ts.SyntaxKind.InstanceOfKeyword && forbiddenWords.has('instanceof')) {
                addKeywordNode('instanceof', node, 'formatear/no-instanceof')

            }
        }

        if (kind === ts.SyntaxKind.FunctionDeclaration || kind === ts.SyntaxKind.FunctionExpression) {
            if (forbiddenWords.has('function')) {
                addKeywordNode('function', node, 'formatear/no-function')

            }
        }

        if (kind === ts.SyntaxKind.ClassDeclaration || kind === ts.SyntaxKind.ClassExpression) {
            if (forbiddenWords.has('class')) {
                addKeywordNode('class', node, 'formatear/no-class')

            }
        }

        if (kind === ts.SyntaxKind.SuperKeyword) {
            if (forbiddenWords.has('super')) {
                addKeywordNode('super', node, 'formatear/no-super')

            }
        }

        if (kind === ts.SyntaxKind.AwaitExpression) {
            if (forbiddenWords.has('await')) {
                addKeywordNode('await', node, 'formatear/no-await')

            }
        }

        if (kind === ts.SyntaxKind.YieldExpression) {
            if (forbiddenWords.has('yield')) {
                addKeywordNode('yield', node, 'formatear/no-yield')

            }
        }

        if (kind === ts.SyntaxKind.InterfaceDeclaration) {
            if (forbiddenWords.has('interface')) {
                addKeywordNode('interface', node, 'formatear/no-interface')

            }
        }

        if (kind === ts.SyntaxKind.EnumDeclaration) {
            if (forbiddenWords.has('enum')) {
                addKeywordNode('enum', node, 'formatear/no-enum')

            }
        }

        if (kind === ts.SyntaxKind.MetaProperty) {
            let { keywordToken, name: nameNode } = node


            let { escapedText: name } = nameNode || {}


            if (keywordToken === ts.SyntaxKind.NewKeyword && name === 'target' && forbiddenWords.has('target')) {
                addKeywordNode('target', node, 'formatear/no-target')

            }

            if (keywordToken === ts.SyntaxKind.ImportKeyword && name === 'meta' && forbiddenWords.has('meta')) {
                addKeywordNode('meta', node, 'formatear/no-meta')

            }
        }

        if (kind === ts.SyntaxKind.AsExpression) {
            if (forbiddenWords.has('as')) {
                addKeywordNode('as', node, 'formatear/no-as')

            }
        }

        if (kind === ts.SyntaxKind.WithStatement) {
            if (forbiddenWords.has('with')) {
                addKeywordNode('with', node, 'formatear/no-with')

            }
        }

        if (kind === ts.SyntaxKind.DebuggerStatement) {
            if (forbiddenWords.has('debugger')) {
                addKeywordNode('debugger', node, 'formatear/no-debugger')

            }
        }

        if (kind === ts.SyntaxKind.VariableStatement) {
            let { declarationList: declList } = node


            let { flags = 0 } = declList || {}


            if (forbiddenWords.has('const') && (flags & ts.NodeFlags.Const) !== 0) {
                addKeywordNode('const', node, 'formatear/no-const')

            }

            if (forbiddenWords.has('let') && (flags & ts.NodeFlags.Let) !== 0) {
                addKeywordNode('let', node, 'formatear/no-let')

            }

            if (forbiddenWords.has('var') && (flags & (ts.NodeFlags.Const | ts.NodeFlags.Let)) === 0) {
                addKeywordNode('var', node, 'formatear/no-var')

            }
        }

        if (kind === ts.SyntaxKind.Constructor) {
            if (forbiddenWords.has('constructor')) {
                addKeywordNode('constructor', node, 'formatear/no-constructor')

            }
        }

        if (kind === ts.SyntaxKind.Identifier) {
            let { escapedText: name } = node


            if (typeof name === 'string' && forbiddenWords.has(name) && !isSkippableTsIdentifierContext(parent, node, ts)) {
                addKeywordNode(name, node, `formatear/no-${name}`)

            }
        }

        let { modifiers } = node


        if (modifiers && modifiers.length) {
            modifiers.forEach(function (modifier) {
                let { kind: modifierKind } = modifier


                if (modifierKind === ts.SyntaxKind.PublicKeyword) {
                    if (forbiddenWords.has('public')) {
                        addModifier('public', modifier, 'formatear/no-public')

                    }

                    return

                }
                if (modifierKind === ts.SyntaxKind.PrivateKeyword) {
                    if (forbiddenWords.has('private')) {
                        addModifier('private', modifier, 'formatear/no-private')

                    }

                    return

                }
                if (modifierKind === ts.SyntaxKind.ProtectedKeyword) {
                    if (forbiddenWords.has('protected')) {
                        addModifier('protected', modifier, 'formatear/no-protected')

                    }

                    return

                }
                if (modifierKind === ts.SyntaxKind.StaticKeyword) {
                    if (forbiddenWords.has('static')) {
                        addModifier('static', modifier, 'formatear/no-static')

                    }

                    return

                }
                if (modifierKind === ts.SyntaxKind.AsyncKeyword) {
                    if (forbiddenWords.has('async')) {
                        addModifier('async', modifier, 'formatear/no-async')

                    }

                    return

                }
                if (modifierKind === ts.SyntaxKind.AccessorKeyword) {
                    if (forbiddenWords.has('accessor')) {
                        addModifier('accessor', modifier, 'formatear/no-accessor')

                    }
                }
            })

        }

        let { heritageClauses } = node


        if (heritageClauses && heritageClauses.length) {
            heritageClauses.forEach(function (clause) {
                if (clause.token === ts.SyntaxKind.ExtendsKeyword && forbiddenWords.has('extends')) {
                    addKeywordNode('extends', clause, 'formatear/no-extends')

                }

                if (clause.token === ts.SyntaxKind.ImplementsKeyword && forbiddenWords.has('implements')) {
                    addKeywordNode('implements', clause, 'formatear/no-implements')

                }
            })

        }

        ts.forEachChild(node, function (child) {
            visit(child, node)

        })

    }

    visit(sourceFile, null)


    return findings

}

function collectConditionSingleVariableFindingsTypescript(sourceFile, filePath, ts) {
    let findings = []


    function addExpressionFinding(expr) {
        if (!expr || typeof expr !== 'object') {
            return

        }

        if (expr.kind === ts.SyntaxKind.Identifier) {
            return

        }

        createTsFinding(
        findings,
        filePath,
        'condicion',
        'formatear/condition-single-variable',
        sourceFile,
        expr.getStart(sourceFile),
        )

    }

    function visit(node) {
        let { kind } = node


        if (kind === ts.SyntaxKind.IfStatement) {
            addExpressionFinding(node.expression)

        }

        if (kind === ts.SyntaxKind.WhileStatement) {
            addExpressionFinding(node.expression)

        }

        if (kind === ts.SyntaxKind.DoStatement) {
            addExpressionFinding(node.expression)

        }

        if (kind === ts.SyntaxKind.ForStatement) {
            if (node.condition) {
                addExpressionFinding(node.condition)

            }
        }

        ts.forEachChild(node, visit)

    }

    visit(sourceFile)


    return findings

}

function parseSourceMeriyah(parse, sourceText) {
    let parseOptions = { loc: true, ranges: true, next: true, jsx: true, webcompat: true }


    let tokens = []


    let onToken = function (type, start, end, loc) {
        tokens.push({
            type,
            start,
            end,
            loc,
            text: sourceText.slice(start, end),
        })

    }


    let ast


    let moduleError


    try {
        ast = parse(sourceText, { ...parseOptions, sourceType: 'module', onToken })

    } catch (error) {
        moduleError = error

    }

    if (!ast) {
        try {
            ast = parse(sourceText, { ...parseOptions, sourceType: 'script', onToken })

        } catch {
            let err = moduleError instanceof Error ? moduleError : new Error(String(moduleError))


            throw err

        }
    }

    return { ast, tokens }

}

function fixSemicolonsMeriyah(filePath, parse, sourceText) {
    let { ast, tokens } = parseSourceMeriyah(parse, sourceText)


    let forHeaderSpans = collectForHeaderSpansFromMeriyahTokens(tokens)


    let emptyStatementRanges = collectEmptyStatementRangesMeriyah(ast)


    let emptyStartSet = new Set()


    emptyStatementRanges.forEach(function (r) {
        emptyStartSet.add(r.start)

    })


    let replacements = []


    emptyStatementRanges.forEach(function (range) {
        replacements.push({ start: range.start, end: range.end, text: '{}' })

    })


    let unfixableFindings = []


    tokens.forEach(function (t) {
        if (t.text !== ';') {
            return

        }

        if (emptyStartSet.has(t.start)) {
            return

        }

        if (isInsideAnySpan(t.start, forHeaderSpans)) {
            addFindingAtLoc(unfixableFindings, filePath, ';', t.loc, 'formatear/no-semicolon')


            return

        }

        replacements.push({ start: t.start, end: t.end, text: '\n' })

    })


    let fixedText = applyReplacements(sourceText, replacements)


    return { fixedText, unfixableFindings }

}

function fixVarConstToLetMeriyah(filePath, parse, sourceText) {
    let { tokens } = parseSourceMeriyah(parse, sourceText)


    let replacements = []


    tokens.forEach(function (t) {
        if (t.type !== 'Keyword') {
            return

        }

        if (t.text !== 'var' && t.text !== 'const') {
            return

        }

        if (typeof t.start !== 'number' || typeof t.end !== 'number' || t.end < t.start) {
            return

        }

        replacements.push({ start: t.start, end: t.end, text: 'let' })

    })


    let fixedText = applyReplacements(sourceText, replacements)


    return { fixedText, unfixableFindings: [] }

}

function fixArrowFunctionsToFunctionsMeriyah(filePath, parse, sourceText) {
    let { ast, tokens } = parseSourceMeriyah(parse, sourceText)


    let replacements = []


    let unfixableFindings = []


    let arrowTokens = tokens.filter(function (t) {
        return t.type === 'Punctuator' && t.text === '=>'

    })


    function convertArrowFunction(node) {
        if (!node || typeof node !== 'object') {
            return

        }

        if (node.type !== 'ArrowFunctionExpression') {
            return

        }

        let arrowToken = arrowTokens.find(function (t) {
            return typeof t.start === 'number' && t.start >= node.start && t.end <= node.end

        })


        if (!arrowToken) {
            addFinding(unfixableFindings, filePath, '=>', node, 'formatear/no-arrow-function')


            return

        }

        let headText = sourceText.slice(node.start, arrowToken.start).trimEnd()


        if (node.async === true) {
            headText = headText.replace(/^\s*async\b\s*/, '')

        }

        let paramsText = headText.trim()


        if (!paramsText.startsWith('(')) {
            paramsText = `(${paramsText})`

        }

        let functionPrefix = node.async === true ? 'async function ' : 'function '


        let bodyText


        if (node.body && node.body.type === 'BlockStatement') {
            bodyText = sourceText.slice(node.body.start, node.body.end)

        }

        if (!bodyText && node.body && typeof node.body.start === 'number' && typeof node.body.end === 'number') {
            let expressionText = sourceText.slice(node.body.start, node.body.end)


            bodyText = `{ return ${expressionText} }`

        }

        if (!bodyText) {
            addFinding(unfixableFindings, filePath, '=>', node, 'formatear/no-arrow-function')


            return

        }

        replacements.push({
            start: node.start,
            end: node.end,
            text: `${functionPrefix}${paramsText} ${bodyText}`,
        })

    }

    function visit(node) {
        if (!node || typeof node !== 'object') {
            return

        }

        if (Array.isArray(node)) {
            node.forEach(function (item) {
                visit(item)

            })


            return

        }

        if (typeof node.type !== 'string') {
            Object.values(node).forEach(function (child) {
                visit(child)

            })


            return

        }

        if (node.type === 'ArrowFunctionExpression') {
            convertArrowFunction(node)

        }

        Object.entries(node).forEach(function (pair) {
            let childKey = pair[0]


            if (childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end') {
                return

            }

            visit(pair[1])

        })

    }

    visit(ast)


    let fixedText = applyReplacements(sourceText, replacements)


    return { fixedText, unfixableFindings }

}

function fixMissingBracesIfMeriyah(filePath, parse, sourceText) {
    let { ast } = parseSourceMeriyah(parse, sourceText)


    let replacements = []


    let unfixableFindings = []


    function wrapStatement(stmt) {
        if (!stmt || typeof stmt !== 'object') {
            return

        }

        if (stmt.type === 'BlockStatement') {
            return

        }

        if (typeof stmt.start !== 'number' || typeof stmt.end !== 'number' || stmt.end < stmt.start) {
            addFinding(unfixableFindings, filePath, '{', stmt, 'formatear/require-braces')


            return

        }

        replacements.push({ start: stmt.start, end: stmt.start, text: '{ ' })


        replacements.push({ start: stmt.end, end: stmt.end, text: ' }' })

    }

    function visit(node) {
        if (!node || typeof node !== 'object') {
            return

        }

        if (Array.isArray(node)) {
            node.forEach(function (item) {
                visit(item)

            })


            return

        }

        if (typeof node.type !== 'string') {
            Object.values(node).forEach(function (child) {
                visit(child)

            })


            return

        }

        if (node.type === 'IfStatement') {
            wrapStatement(node.consequent)


            if (node.alternate) {
                wrapStatement(node.alternate)

            }
        }

        Object.entries(node).forEach(function (pair) {
            let childKey = pair[0]


            if (childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end') {
                return

            }

            visit(pair[1])

        })

    }

    visit(ast)


    let fixedText = applyReplacements(sourceText, replacements)


    return { fixedText, unfixableFindings }

}

function collectEmptyStatementRangesTypescript(sourceFile, ts) {
    let ranges = []


    function visit(node) {
        if (node.kind === ts.SyntaxKind.EmptyStatement) {
            let start = node.getStart(sourceFile)


            let end = node.getEnd()


            if (typeof start === 'number' && typeof end === 'number' && end > start) {
                ranges.push({ start, end })

            }
        }
        ts.forEachChild(node, visit)

    }

    visit(sourceFile)


    return ranges

}

function collectForHeaderSpansFromTsTokens(tokens, ts) {
    let spans = []


    function scanFrom(i) {
        if (i >= tokens.length) {
            return spans

        }

        if (tokens[i].kind !== ts.SyntaxKind.ForKeyword) {
            return scanFrom(i + 1)

        }

        let j = i + 1


        if (tokens[j] && tokens[j].kind === ts.SyntaxKind.AwaitKeyword) {
            j += 1

        }

        let openParenToken = tokens[j]


        if (!openParenToken || openParenToken.kind !== ts.SyntaxKind.OpenParenToken) {
            return scanFrom(i + 1)

        }

        let start = openParenToken.pos


        function scanParen(k, depth) {
            if (k >= tokens.length) {
                return scanFrom(i + 1)

            }

            let tk = tokens[k]


            let nextDepth = depth


            if (tk.kind === ts.SyntaxKind.OpenParenToken) {
                nextDepth += 1

            }

            if (tk.kind === ts.SyntaxKind.CloseParenToken) {
                nextDepth -= 1

            }

            if (tk.kind === ts.SyntaxKind.CloseParenToken && nextDepth === 0) {
                spans.push({ start, end: tk.end })


                return scanFrom(k + 1)

            }

            return scanParen(k + 1, nextDepth)

        }

        return scanParen(j, 0)

    }

    return scanFrom(0)

}

function scanTokensTypescript(ts, sourceText, isTsx) {
    let scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard,
    sourceText,
    )


    let tokens = []


    function scanNext() {
        let kind = scanner.scan()


        if (kind === ts.SyntaxKind.EndOfFileToken) {
            return tokens

        }

        let pos = scanner.getTokenPos()


        let end = scanner.getTextPos()


        tokens.push({ kind, pos, end, text: sourceText.slice(pos, end) })


        return scanNext()

    }

    return scanNext()

}

function fixSemicolonsTypescript(filePath, ts, sourceText, ext) {
    let scriptKind = ts.ScriptKind.TS


    if (ext === '.tsx') {
        scriptKind = ts.ScriptKind.TSX

    }

    let sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind)


    let tokens = scanTokensTypescript(ts, sourceText, ext === '.tsx')


    let forHeaderSpans = collectForHeaderSpansFromTsTokens(tokens, ts)


    let emptyStatementRanges = collectEmptyStatementRangesTypescript(sourceFile, ts)


    let emptyStartSet = new Set()


    emptyStatementRanges.forEach(function (r) {
        emptyStartSet.add(r.start)

    })


    let replacements = []


    emptyStatementRanges.forEach(function (range) {
        replacements.push({ start: range.start, end: range.end, text: '{}' })

    })


    let unfixableFindings = []


    tokens.forEach(function (t) {
        if (t.kind !== ts.SyntaxKind.SemicolonToken) {
            return

        }

        if (emptyStartSet.has(t.pos)) {
            return

        }

        if (isInsideAnySpan(t.pos, forHeaderSpans)) {
            let lc = sourceFile.getLineAndCharacterOfPosition(t.pos)


            unfixableFindings.push({
                filePath,
                line: lc.line + 1,
                column: lc.character,
                keyword: ';',
                ruleId: 'formatear/no-semicolon',
            })


            return

        }

        replacements.push({ start: t.pos, end: t.end, text: '\n' })

    })


    let fixedText = applyReplacements(sourceText, replacements)


    return { fixedText, unfixableFindings }

}

function fixVarConstToLetTypescript(filePath, ts, sourceText, ext) {
    let tokens = scanTokensTypescript(ts, sourceText, ext === '.tsx')


    let replacements = []


    tokens.forEach(function (t) {
        if (t.kind !== ts.SyntaxKind.VarKeyword && t.kind !== ts.SyntaxKind.ConstKeyword) {
            return

        }

        if (typeof t.pos !== 'number' || typeof t.end !== 'number' || t.end < t.pos) {
            return

        }

        replacements.push({ start: t.pos, end: t.end, text: 'let' })

    })


    let fixedText = applyReplacements(sourceText, replacements)


    return { fixedText, unfixableFindings: [] }

}

function fixArrowFunctionsToFunctionsTypescript(filePath, ts, sourceText, ext) {
    let scriptKind = ts.ScriptKind.TS


    if (ext === '.tsx') {
        scriptKind = ts.ScriptKind.TSX

    }

    let sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind)


    let replacements = []


    let unfixableFindings = []


    function visit(node) {
        if (node.kind === ts.SyntaxKind.ArrowFunction) {
            let start = node.getStart(sourceFile)


            let end = node.getEnd()


            if (typeof start !== 'number' || typeof end !== 'number' || end < start) {
                return

            }

            let arrowToken = node.equalsGreaterThanToken


            let arrowPos = arrowToken ? arrowToken.getStart(sourceFile) : -1


            if (typeof arrowPos !== 'number' || arrowPos < start) {
                let lc = sourceFile.getLineAndCharacterOfPosition(start)


                unfixableFindings.push({
                    filePath,
                    line: lc.line + 1,
                    column: lc.character,
                    keyword: '=>',
                    ruleId: 'formatear/no-arrow-function',
                })


                return

            }

            let headText = sourceText.slice(start, arrowPos).trimEnd()


            let isAsync =
            Array.isArray(node.modifiers) &&
            node.modifiers.some(function (m) {
                return m.kind === ts.SyntaxKind.AsyncKeyword

            })


            if (isAsync) {
                headText = headText.replace(/^\s*async\b\s*/, '')

            }

            let paramsText = headText.trim()


            if (!paramsText.startsWith('(')) {
                paramsText = `(${paramsText})`

            }

            let functionPrefix = isAsync ? 'async function ' : 'function '


            let bodyText


            if (node.body.kind === ts.SyntaxKind.Block) {
                bodyText = sourceText.slice(node.body.getStart(sourceFile), node.body.getEnd())

            }

            if (!bodyText) {
                let bodyStart = node.body.getStart(sourceFile)


                let bodyEnd = node.body.getEnd()


                let exprText = sourceText.slice(bodyStart, bodyEnd)


                bodyText = `{ return ${exprText} }`

            }

            replacements.push({ start, end, text: `${functionPrefix}${paramsText} ${bodyText}` })


            return

        }

        ts.forEachChild(node, visit)

    }

    visit(sourceFile)


    let fixedText = applyReplacements(sourceText, replacements)


    return { fixedText, unfixableFindings }

}

function fixMissingBracesIfTypescript(filePath, ts, sourceText, ext) {
    let scriptKind = ts.ScriptKind.TS


    if (ext === '.tsx') {
        scriptKind = ts.ScriptKind.TSX

    }

    let sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind)


    let replacements = []


    let unfixableFindings = []


    function wrapStatement(stmt) {
        if (!stmt) {
            return

        }

        if (stmt.kind === ts.SyntaxKind.Block) {
            return

        }

        let start = stmt.getStart(sourceFile)


        let end = stmt.getEnd()


        if (typeof start !== 'number' || typeof end !== 'number' || end < start) {
            let lc = sourceFile.getLineAndCharacterOfPosition(typeof start === 'number' ? start : 0)


            unfixableFindings.push({
                filePath,
                line: lc.line + 1,
                column: lc.character,
                keyword: '{',
                ruleId: 'formatear/require-braces',
            })


            return

        }

        replacements.push({ start, end: start, text: '{ ' })


        replacements.push({ start: end, end, text: ' }' })

    }

    function visit(node) {
        if (node.kind === ts.SyntaxKind.IfStatement) {
            wrapStatement(node.thenStatement)


            if (node.elseStatement) {
                wrapStatement(node.elseStatement)

            }
        }

        ts.forEachChild(node, visit)

    }

    visit(sourceFile)


    let fixedText = applyReplacements(sourceText, replacements)


    return { fixedText, unfixableFindings }

}

async function run(argv) {
    if (argv.includes('--help') || argv.includes('-h')) {
        printHelp()


        return 0

    }

    let formatearIndex = argv.indexOf('--formatear')


    if (formatearIndex === -1) {
        printHelp()


        return 2

    }

    let inputPaths = argv.slice(formatearIndex + 1).filter(isPathLike)


    if (inputPaths.length === 0) {
        printHelp()


        return 2

    }

    let fileSet = new Set()


    await Promise.all(
    inputPaths.map(async function (inputPath) {
        await collectFiles(inputPath, fileSet)

    }),
    )


    let files = Array.from(fileSet).sort(function (a, b) {
        return a.localeCompare(b)

    })


    if (files.length === 0) {
        process.stderr.write('No se encontraron archivos para analizar.\n')


        return 2

    }

    let forbiddenWords = await loadForbiddenWords()


    let parseErrorCount = 0


    let issueCount = 0


    let parse


    let ts


    try {
        let meriyahModule = await importMeriyah()


        parse = meriyahModule.parse

    } catch (error) {
        let message = error instanceof Error ? error.message : String(error)


        process.stderr.write(`${message}\n`)


        return 2

    }

    function normalize(value) {
        let str = String(value)


        return Array.from(str)
        .filter(function (ch) {
            let code = ch.charCodeAt(0)


            return !(code <= 31 || code === 127)

        })
        .join('')

    }

    async function analyzeOne(inputFilePath) {
        try {
            let ext = path.extname(inputFilePath).toLowerCase()


            let isTsFile = ext === '.ts' || ext === '.tsx' || ext === '.mts' || ext === '.cts'


            let findings
            let conditionFindings = []


            if (isTsFile) {
                if (!ts) {
                    ts = await importTypescript()

                }

                let sourceText = await fs.readFile(inputFilePath, 'utf8')

                let tokensForTabs = scanTokensTypescript(ts, sourceText, ext === '.tsx')


                let tabFixedText = convertTabsToFourSpacesOutsideTokens(
                sourceText,
                tokensForTabs.map(function (t) {
                    return { start: t.pos, end: t.end }

                }),
                )


                if (tabFixedText !== sourceText) {
                    await fs.writeFile(inputFilePath, tabFixedText, 'utf8')


                    sourceText = tabFixedText

                }


                let fixed = fixSemicolonsTypescript(inputFilePath, ts, sourceText, ext)


                if (fixed.fixedText !== sourceText) {
                    await fs.writeFile(inputFilePath, fixed.fixedText, 'utf8')


                    sourceText = fixed.fixedText

                }

                fixed.unfixableFindings.forEach(function (finding) {
                    issueCount += 1


                    let normalizedFilePath = normalize(finding.filePath)


                    process.stdout.write(
                    `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente ';' en la cabecera de un for  formatear/no-semicolon\n`,
                    )

                })


                let varConstFixed = fixVarConstToLetTypescript(inputFilePath, ts, sourceText, ext)


                if (varConstFixed.fixedText !== sourceText) {
                    await fs.writeFile(inputFilePath, varConstFixed.fixedText, 'utf8')


                    sourceText = varConstFixed.fixedText

                }

                let arrowFixed = fixArrowFunctionsToFunctionsTypescript(inputFilePath, ts, sourceText, ext)


                if (arrowFixed.fixedText !== sourceText) {
                    await fs.writeFile(inputFilePath, arrowFixed.fixedText, 'utf8')


                    sourceText = arrowFixed.fixedText

                }

                arrowFixed.unfixableFindings.forEach(function (finding) {
                    issueCount += 1


                    let normalizedFilePath = normalize(finding.filePath)


                    process.stdout.write(
                    `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente una función de flecha  formatear/no-arrow-function\n`,
                    )

                })


                let bracesFixed = fixMissingBracesIfTypescript(inputFilePath, ts, sourceText, ext)


                if (bracesFixed.fixedText !== sourceText) {
                    await fs.writeFile(inputFilePath, bracesFixed.fixedText, 'utf8')


                    sourceText = bracesFixed.fixedText

                }

                bracesFixed.unfixableFindings.forEach(function (finding) {
                    issueCount += 1


                    let normalizedFilePath = normalize(finding.filePath)


                    process.stdout.write(
                    `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente el uso de llaves en un if  formatear/require-braces\n`,
                    )

                })

                let tokensForIndent = scanTokensTypescript(ts, sourceText, ext === '.tsx')


                let reindentedText = reindentFourSpacesOutsideTokens(
                sourceText,
                tokensForIndent.map(function (t) {
                    return { start: t.pos, end: t.end }

                }),
                tokensForIndent
                .filter(function (t) {
                    return t.text === '{' || t.text === '}'

                })
                .map(function (t) {
                    return { pos: t.pos, delta: t.text === '{' ? 1 : -1 }

                }),
                )


                if (reindentedText !== sourceText) {
                    await fs.writeFile(inputFilePath, reindentedText, 'utf8')


                    sourceText = reindentedText

                }

                let noTrailingWhitespaceText = stripTrailingWhitespace(sourceText)


                if (noTrailingWhitespaceText !== sourceText) {
                    await fs.writeFile(inputFilePath, noTrailingWhitespaceText, 'utf8')


                    sourceText = noTrailingWhitespaceText

                }


                let scriptKind = ts.ScriptKind.TS


                if (ext === '.tsx') {
                    scriptKind = ts.ScriptKind.TSX

                }

                let sourceFile = ts.createSourceFile(inputFilePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind)


                conditionFindings = collectConditionSingleVariableFindingsTypescript(sourceFile, inputFilePath, ts)


                findings = collectForbiddenFindingsTypescript(sourceFile, inputFilePath, forbiddenWords, ts)

            }

            if (!isTsFile) {
                let sourceText = await fs.readFile(inputFilePath, 'utf8')

                let parsedForTabs = parseSourceMeriyah(parse, sourceText)


                let tabFixedText = convertTabsToFourSpacesOutsideTokens(
                sourceText,
                parsedForTabs.tokens.map(function (t) {
                    return { start: t.start, end: t.end }

                }),
                )


                if (tabFixedText !== sourceText) {
                    await fs.writeFile(inputFilePath, tabFixedText, 'utf8')


                    sourceText = tabFixedText

                }


                let fixed = fixSemicolonsMeriyah(inputFilePath, parse, sourceText)


                if (fixed.fixedText !== sourceText) {
                    await fs.writeFile(inputFilePath, fixed.fixedText, 'utf8')


                    sourceText = fixed.fixedText

                }

                fixed.unfixableFindings.forEach(function (finding) {
                    issueCount += 1


                    let normalizedFilePath = normalize(finding.filePath)


                    process.stdout.write(
                    `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente ';' en la cabecera de un for  formatear/no-semicolon\n`,
                    )

                })


                let varConstFixed = fixVarConstToLetMeriyah(inputFilePath, parse, sourceText)


                if (varConstFixed.fixedText !== sourceText) {
                    await fs.writeFile(inputFilePath, varConstFixed.fixedText, 'utf8')


                    sourceText = varConstFixed.fixedText

                }

                let arrowFixed = fixArrowFunctionsToFunctionsMeriyah(inputFilePath, parse, sourceText)


                if (arrowFixed.fixedText !== sourceText) {
                    await fs.writeFile(inputFilePath, arrowFixed.fixedText, 'utf8')


                    sourceText = arrowFixed.fixedText

                }

                arrowFixed.unfixableFindings.forEach(function (finding) {
                    issueCount += 1


                    let normalizedFilePath = normalize(finding.filePath)


                    process.stdout.write(
                    `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente una función de flecha  formatear/no-arrow-function\n`,
                    )

                })


                let bracesFixed = fixMissingBracesIfMeriyah(inputFilePath, parse, sourceText)


                if (bracesFixed.fixedText !== sourceText) {
                    await fs.writeFile(inputFilePath, bracesFixed.fixedText, 'utf8')


                    sourceText = bracesFixed.fixedText

                }

                bracesFixed.unfixableFindings.forEach(function (finding) {
                    issueCount += 1


                    let normalizedFilePath = normalize(finding.filePath)


                    process.stdout.write(
                    `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente el uso de llaves en un if  formatear/require-braces\n`,
                    )

                })

                let parsedForIndent = parseSourceMeriyah(parse, sourceText)


                let reindentedText = reindentFourSpacesOutsideTokens(
                sourceText,
                parsedForIndent.tokens.map(function (t) {
                    return { start: t.start, end: t.end }

                }),
                parsedForIndent.tokens
                .filter(function (t) {
                    return t.text === '{' || t.text === '}'

                })
                .map(function (t) {
                    return { pos: t.start, delta: t.text === '{' ? 1 : -1 }

                }),
                )


                if (reindentedText !== sourceText) {
                    await fs.writeFile(inputFilePath, reindentedText, 'utf8')


                    sourceText = reindentedText

                }

                let noTrailingWhitespaceText = stripTrailingWhitespace(sourceText)


                if (noTrailingWhitespaceText !== sourceText) {
                    await fs.writeFile(inputFilePath, noTrailingWhitespaceText, 'utf8')


                    sourceText = noTrailingWhitespaceText

                }


                let parsed = parseSourceMeriyah(parse, sourceText)


                conditionFindings = collectConditionSingleVariableFindingsMeriyah(parsed.ast, inputFilePath)


                findings = collectForbiddenFindingsMeriyah(parsed.ast, inputFilePath, forbiddenWords)

            }

            findings.forEach(function (finding) {
                issueCount += 1


                let normalizedFilePath = normalize(finding.filePath)


                let keyword = normalize(finding.keyword)


                let ruleIdValue =
                typeof finding.ruleId === 'string' && finding.ruleId.length > 0 ? finding.ruleId : 'formatear/unknown'


                let ruleId = normalize(ruleIdValue)


                process.stdout.write(
                `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se debe usar la palabra «${keyword}»  ${ruleId}\n`,
                )

            })

            conditionFindings.forEach(function (finding) {
                issueCount += 1


                let normalizedFilePath = normalize(finding.filePath)


                process.stdout.write(
                `${normalizedFilePath}:${finding.line}:${finding.column}  error  La condición debe ser una sola variable  formatear/condition-single-variable\n`,
                )

            })

        } catch (error) {
            parseErrorCount += 1


            let message = error instanceof Error ? error.message : String(error)


            process.stderr.write(`${inputFilePath}  error  ${message}\n`)

        }
    }

    await files.reduce(function (prev, inputFilePath) {
        return prev.then(function () {
            return analyzeOne(inputFilePath)

        })

    }, Promise.resolve())


    if (parseErrorCount > 0) {
        return 2

    }

    return issueCount > 0 ? 1 : 0

}

let exitCode = await run(process.argv.slice(2))


process.exitCode = exitCode
