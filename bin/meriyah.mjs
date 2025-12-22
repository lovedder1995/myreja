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


    let esScriptPathInvalido = typeof scriptPath !== 'string' || scriptPath.length === 0


    if (esScriptPathInvalido) {
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


    let hayPalabrasProhibidas = forbidden.size > 0


    if (hayPalabrasProhibidas) {
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


        let esDirectorio = stats.isDirectory()


        if (esDirectorio) {
            return 'dir'

        }

        let esArchivo = stats.isFile()


        if (esArchivo) {
            return 'file'

        }

        return 'other'

    } catch {
        return 'missing'

    }
}

async function collectFiles(inputPath, out) {
    let kind = await pathKind(inputPath)


    let esArchivo = kind === 'file'


    if (esArchivo) {
        out.add(path.resolve(inputPath))


        return

    }
    let noEsDirectorio = kind !== 'dir'


    if (noEsDirectorio) {
        return

    }

    let entries = await fs.readdir(inputPath, { withFileTypes: true })


    await Promise.all(
    entries.map(async function (entry) {
        let fullPath = path.join(inputPath, entry.name)


        let esDirectorio = entry.isDirectory()


        if (esDirectorio) {
            let esSaltado = entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage'


            if (esSaltado) {
                return

            }

            await collectFiles(fullPath, out)


            return

        }

        let noEsArchivo = !entry.isFile()


        if (noEsArchivo) {
            return

        }

        let noEsExtensionSoportada = !/\.(?:[cm]?[jt]sx?|mjs|cjs|mts|cts)$/.test(entry.name)


        if (noEsExtensionSoportada) {
            return

        }

        out.add(path.resolve(fullPath))

    }),
    )

}

function isSkippableIdentifierContext(parent, key) {
    let noEsNodoPadre = !parent || typeof parent !== 'object'


    if (noEsNodoPadre) {
        return false

    }

    let esPropiedadDeMemberExpression =
    parent.type === 'MemberExpression' && key === 'property' && parent.computed === false


    if (esPropiedadDeMemberExpression) {
        return true

    }

    let esClaveDeProperty = parent.type === 'Property' && key === 'key' && parent.computed === false


    if (esClaveDeProperty) {
        return true

    }

    let esClaveDeMethodDefinition =
    parent.type === 'MethodDefinition' && key === 'key' && parent.computed === false


    if (esClaveDeMethodDefinition) {
        return true

    }

    let esClaveDePropertyDefinition =
    parent.type === 'PropertyDefinition' && key === 'key' && parent.computed === false


    if (esClaveDePropertyDefinition) {
        return true

    }

    let esClaveDeAccessorProperty =
    parent.type === 'AccessorProperty' && key === 'key' && parent.computed === false


    if (esClaveDeAccessorProperty) {
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
    let noHayReemplazos = !replacements.length


    if (noHayReemplazos) {
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
        let solapaConReemplazoPrevio = rep.end > lastStart


        if (solapaConReemplazoPrevio) {
            return

        }

        out = out.slice(0, rep.start) + rep.text + out.slice(rep.end)


        lastStart = rep.start

    })


    return out

}

function stripTrailingWhitespace(sourceText) {
    let noEsTextoValido = typeof sourceText !== 'string' || sourceText.length === 0


    if (noEsTextoValido) {
        return sourceText

    }

    let out = sourceText.replace(/[ \t]+(?=\r?\n)/g, '')
    out = out.replace(/[ \t]+(?=\r)/g, '')
    out = out.replace(/[ \t]+$/g, '')

    return out

}

function convertTabsToFourSpacesOutsideTokens(sourceText, spans) {
    let noEsTextoValido = typeof sourceText !== 'string' || sourceText.length === 0


    if (noEsTextoValido) {
        return sourceText

    }

    let noHayTabs = !sourceText.includes('\t')


    if (noHayTabs) {
        return sourceText

    }

    let noHayTramos = !Array.isArray(spans) || spans.length === 0


    if (noHayTramos) {
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
        let noHayTramosAcumulados = merged.length === 0


        if (noHayTramosAcumulados) {
            merged.push(span)


            return

        }

        let last = merged[merged.length - 1]


        let empiezaDespuesDelFinal = span.start > last.end


        if (empiezaDespuesDelFinal) {
            merged.push(span)


            return

        }

        let extiendeElFinal = span.end > last.end


        if (extiendeElFinal) {
            last.end = span.end

        }
    })


    let out = ''


    let cursor = 0


    merged.forEach(function (span) {
        let hayTextoAntesDelTramo = span.start > cursor


        if (hayTextoAntesDelTramo) {
            out += sourceText.slice(cursor, span.start).replace(/\t/g, '    ')

        }

        out += sourceText.slice(span.start, span.end)
        cursor = span.end

    })


    let quedaTextoPorProcesar = cursor < len


    if (quedaTextoPorProcesar) {
        out += sourceText.slice(cursor).replace(/\t/g, '    ')

    }

    return out

}

function mergeSpans(spans, len) {
    let noHayTramos = !Array.isArray(spans) || spans.length === 0


    if (noHayTramos) {
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
        let noHayTramosAcumulados = merged.length === 0


        if (noHayTramosAcumulados) {
            merged.push(span)


            return

        }

        let last = merged[merged.length - 1]


        let empiezaDespuesDelFinal = span.start > last.end


        if (empiezaDespuesDelFinal) {
            merged.push(span)


            return

        }

        let extiendeElFinal = span.end > last.end


        if (extiendeElFinal) {
            last.end = span.end

        }
    })

    return merged

}

function isInsideMergedSpans(index, merged) {
    function search(lo, hi) {
        let rangoVacio = lo > hi


        if (rangoVacio) {
            return false

        }

        let mid = (lo + hi) >> 1
        let span = merged[mid]


        let estaAntesDelTramo = index < span.start


        if (estaAntesDelTramo) {
            return search(lo, mid - 1)

        }

        let estaDespuesDelTramo = index >= span.end


        if (estaDespuesDelTramo) {
            return search(mid + 1, hi)

        }

        return true

    }

    return search(0, merged.length - 1)

}

function reindentFourSpacesOutsideTokens(sourceText, tokenSpans, braceEvents) {
    let noEsTextoValido = typeof sourceText !== 'string' || sourceText.length === 0


    if (noEsTextoValido) {
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


        let esPrimerEvento = index === 0


        if (esPrimerEvento) {
            eventPrefix.push(e.delta)


            return

        }

        eventPrefix.push(eventPrefix[index - 1] + e.delta)

    })

    function upperBound(arr, value) {
        function search(lo, hi) {
            let rangoVacio = lo > hi


            if (rangoVacio) {
                return lo

            }

            let mid = (lo + hi) >> 1


            let estaPorDebajoDelValor = arr[mid] < value


            if (estaPorDebajoDelValor) {
                return search(mid + 1, hi)

            }

            return search(lo, mid - 1)

        }

        return search(0, arr.length - 1)

    }

    function depthAtPos(pos) {
        let noHayEventos = eventPos.length === 0


        if (noHayEventos) {
            return 0

        }

        let idx = upperBound(eventPos, pos)


        let noHayEventoAnterior = idx <= 0


        if (noHayEventoAnterior) {
            return 0

        }

        let depth = eventPrefix[idx - 1]


        let profundidadNegativa = depth < 0


        if (profundidadNegativa) {
            return 0

        }

        return depth

    }

    function splitLineSegment(segment) {
        let terminaConCrLf = segment.endsWith('\r\n')


        if (terminaConCrLf) {
            return { lineText: segment.slice(0, -2), lineBreak: '\r\n' }

        }

        let terminaConLf = segment.endsWith('\n')


        if (terminaConLf) {
            return { lineText: segment.slice(0, -1), lineBreak: '\n' }

        }

        let terminaConCr = segment.endsWith('\r')


        if (terminaConCr) {
            return { lineText: segment.slice(0, -1), lineBreak: '\r' }

        }

        return { lineText: segment, lineBreak: '' }

    }

    let segments = sourceText.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) || []


    let cursor = 0


    segments.forEach(function (segment) {
        let noHaySegmento = !segment


        if (noHaySegmento) {
            return

        }

        let parts = splitLineSegment(segment)
        let { lineText, lineBreak } = parts


        let lineStart = cursor
        cursor += segment.length


        let esLineaVacia = lineText.trim().length === 0


        if (esLineaVacia) {
            out += lineBreak


            return

        }

        let estaDentroDeTramosToken = isInsideMergedSpans(lineStart, mergedTokenSpans)


        if (estaDentroDeTramosToken) {
            out += lineText + lineBreak


            return

        }

        let content = lineText.replace(/^[ \t]+/, '')


        let noHayContenido = content.length === 0


        if (noHayContenido) {
            out += lineBreak


            return

        }

        let depth = depthAtPos(lineStart)
        let closeMatch = content.match(/^}+/)
        let leadingCloseCount = closeMatch ? closeMatch[0].length : 0


        let indentLevel = depth - leadingCloseCount


        let nivelDeSangriaNegativo = indentLevel < 0


        if (nivelDeSangriaNegativo) {
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
        let noEsNodo = !node || typeof node !== 'object'


        if (noEsNodo) {
            return

        }

        let esListaDeNodos = Array.isArray(node)


        if (esListaDeNodos) {
            node.forEach(function (item) {
                visit(item, parent, key)

            })


            return

        }

        let noTieneTipoValido = typeof node.type !== 'string'


        if (noTieneTipoValido) {
            Object.values(node).forEach(function (child) {
                visit(child, node, undefined)

            })


            return

        }

        let esEmptyStatementConRango =
        node.type === 'EmptyStatement' &&
        typeof node.start === 'number' &&
        typeof node.end === 'number' &&
        node.end > node.start


        if (esEmptyStatementConRango) {
            ranges.push({ start: node.start, end: node.end })

        }

        Object.entries(node).forEach(function (pair) {
            let childKey = pair[0]


            let esClaveIgnorable = childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end'


            if (esClaveIgnorable) {
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
        let excedeLongitudDeTokens = i >= tokens.length


        if (excedeLongitudDeTokens) {
            return spans

        }

        let token = tokens[i]


        let noEsFor = !token || token.type !== 'Keyword' || token.text !== 'for'


        if (noEsFor) {
            return scanFrom(i + 1)

        }

        let j = i + 1


        let hayAwait =
        tokens[j] && tokens[j].type === 'Keyword' && tokens[j].text === 'await'


        if (hayAwait) {
            j += 1

        }

        let openParenToken = tokens[j]


        let noHayParentesisDeApertura =
        !openParenToken || openParenToken.type !== 'Punctuator' || openParenToken.text !== '('


        if (noHayParentesisDeApertura) {
            return scanFrom(i + 1)

        }

        let { start } = openParenToken


        function scanParen(k, depth) {
            let excedeLongitudDeTokens = k >= tokens.length


            if (excedeLongitudDeTokens) {
                return scanFrom(i + 1)

            }

            let token = tokens[k]


            let nextDepth = depth


            let abreParentesis = token.type === 'Punctuator' && token.text === '('


            if (abreParentesis) {
                nextDepth += 1

            }

            let cierraParentesis = token.type === 'Punctuator' && token.text === ')'


            if (cierraParentesis) {
                nextDepth -= 1

            }

            let terminaElEncabezado = token.type === 'Punctuator' && token.text === ')' && nextDepth === 0


            if (terminaElEncabezado) {
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
        let noEsNodo = !node || typeof node !== 'object'


        if (noEsNodo) {
            return

        }

        let esListaDeNodos = Array.isArray(node)


        if (esListaDeNodos) {
            node.forEach(function (item) {
                visit(item, parent, key)

            })


            return

        }

        let noTieneTipoValido = typeof node.type !== 'string'


        if (noTieneTipoValido) {
            Object.values(node).forEach(function (child) {
                visit(child, node, undefined)

            })


            return

        }

        let { type: nodeType } = node


        let esThisExpression = nodeType === 'ThisExpression'


        if (esThisExpression) {
            let estaThisProhibido = forbiddenWords.has('this')


            if (estaThisProhibido) {
                addFinding(findings, filePath, 'this', node, 'formatear/no-this')

            }
        }

        let esIfStatement = nodeType === 'IfStatement'


        if (esIfStatement) {
            let estaIfProhibido = forbiddenWords.has('if')


            if (estaIfProhibido) {
                addFinding(findings, filePath, 'if', node, 'formatear/no-if')

            }

            let tieneAlternate = Boolean(node.alternate)
            let estaElseProhibido = forbiddenWords.has('else')
            let debeMarcarElse = tieneAlternate && estaElseProhibido


            if (debeMarcarElse) {
                addFinding(findings, filePath, 'else', node.alternate, 'formatear/no-else')

            }
        }

        let esReturnStatement = nodeType === 'ReturnStatement'


        if (esReturnStatement) {
            let estaReturnProhibido = forbiddenWords.has('return')


            if (estaReturnProhibido) {
                addFinding(findings, filePath, 'return', node, 'formatear/no-return')

            }
        }

        let esVariableDeclaration = nodeType === 'VariableDeclaration'


        if (esVariableDeclaration) {
            let esVar = node.kind === 'var'
            let esLet = node.kind === 'let'
            let esConst = node.kind === 'const'
            let estaVarProhibido = forbiddenWords.has('var')
            let estaLetProhibido = forbiddenWords.has('let')
            let estaConstProhibido = forbiddenWords.has('const')
            let debeMarcarVar = esVar && estaVarProhibido
            let debeMarcarLet = esLet && estaLetProhibido
            let debeMarcarConst = esConst && estaConstProhibido


            if (debeMarcarVar) {
                addFinding(findings, filePath, 'var', node, 'formatear/no-var')

            }

            if (debeMarcarLet) {
                addFinding(findings, filePath, 'let', node, 'formatear/no-let')

            }

            if (debeMarcarConst) {
                addFinding(findings, filePath, 'const', node, 'formatear/no-const')

            }
        }

        let esForStatement = nodeType === 'ForStatement'
        let esForInStatement = nodeType === 'ForInStatement'
        let esForOfStatement = nodeType === 'ForOfStatement'
        let esAlgunFor = esForStatement || esForInStatement || esForOfStatement


        if (esAlgunFor) {
            let estaForProhibido = forbiddenWords.has('for')


            if (estaForProhibido) {
                addFinding(findings, filePath, 'for', node, 'formatear/no-for')

            }

            let estaInProhibido = forbiddenWords.has('in')
            let estaOfProhibido = forbiddenWords.has('of')
            let debeMarcarIn = esForInStatement && estaInProhibido
            let debeMarcarOf = esForOfStatement && estaOfProhibido


            if (debeMarcarIn) {
                addFinding(findings, filePath, 'in', node, 'formatear/no-in')

            }

            if (debeMarcarOf) {
                addFinding(findings, filePath, 'of', node, 'formatear/no-of')

            }
        }

        let esWhileStatement = nodeType === 'WhileStatement'


        if (esWhileStatement) {
            let estaWhileProhibido = forbiddenWords.has('while')


            if (estaWhileProhibido) {
                addFinding(findings, filePath, 'while', node, 'formatear/no-while')

            }
        }

        let esDoWhileStatement = nodeType === 'DoWhileStatement'


        if (esDoWhileStatement) {
            let estaDoProhibido = forbiddenWords.has('do')


            if (estaDoProhibido) {
                addFinding(findings, filePath, 'do', node, 'formatear/no-do')

            }
        }

        let esSwitchStatement = nodeType === 'SwitchStatement'


        if (esSwitchStatement) {
            let estaSwitchProhibido = forbiddenWords.has('switch')


            if (estaSwitchProhibido) {
                addFinding(findings, filePath, 'switch', node, 'formatear/no-switch')

            }
        }

        let esSwitchCase = nodeType === 'SwitchCase'


        if (esSwitchCase) {
            let tieneTest = Boolean(node.test)
            let estaCaseProhibido = forbiddenWords.has('case')
            let estaDefaultProhibido = forbiddenWords.has('default')
            let debeMarcarCase = tieneTest && estaCaseProhibido
            let debeMarcarDefault = !tieneTest && estaDefaultProhibido


            if (debeMarcarCase) {
                addFinding(findings, filePath, 'case', node, 'formatear/no-case')

            }

            if (debeMarcarDefault) {
                addFinding(findings, filePath, 'default', node, 'formatear/no-default')

            }
        }

        let esBreakStatement = nodeType === 'BreakStatement'


        if (esBreakStatement) {
            let estaBreakProhibido = forbiddenWords.has('break')


            if (estaBreakProhibido) {
                addFinding(findings, filePath, 'break', node, 'formatear/no-break')

            }
        }

        let esContinueStatement = nodeType === 'ContinueStatement'


        if (esContinueStatement) {
            let estaContinueProhibido = forbiddenWords.has('continue')


            if (estaContinueProhibido) {
                addFinding(findings, filePath, 'continue', node, 'formatear/no-continue')

            }
        }

        let esTryStatement = nodeType === 'TryStatement'


        if (esTryStatement) {
            let estaTryProhibido = forbiddenWords.has('try')


            if (estaTryProhibido) {
                addFinding(findings, filePath, 'try', node, 'formatear/no-try')

            }

            let tieneFinalizer = Boolean(node.finalizer)
            let estaFinallyProhibido = forbiddenWords.has('finally')
            let debeMarcarFinally = tieneFinalizer && estaFinallyProhibido


            if (debeMarcarFinally) {
                addFinding(findings, filePath, 'finally', node.finalizer, 'formatear/no-finally')

            }
        }

        let esCatchClause = nodeType === 'CatchClause'


        if (esCatchClause) {
            let estaCatchProhibido = forbiddenWords.has('catch')


            if (estaCatchProhibido) {
                addFinding(findings, filePath, 'catch', node, 'formatear/no-catch')

            }
        }

        let esThrowStatement = nodeType === 'ThrowStatement'


        if (esThrowStatement) {
            let estaThrowProhibido = forbiddenWords.has('throw')


            if (estaThrowProhibido) {
                addFinding(findings, filePath, 'throw', node, 'formatear/no-throw')

            }
        }

        let esNewExpression = nodeType === 'NewExpression'


        if (esNewExpression) {
            let estaNewProhibido = forbiddenWords.has('new')


            if (estaNewProhibido) {
                addFinding(findings, filePath, 'new', node, 'formatear/no-new')

            }
        }

        let esUnaryExpression = nodeType === 'UnaryExpression'


        if (esUnaryExpression) {
            let { operator: op } = node


            let esTypeof = op === 'typeof'
            let esVoid = op === 'void'
            let esDelete = op === 'delete'
            let estaTypeofProhibido = forbiddenWords.has('typeof')
            let estaVoidProhibido = forbiddenWords.has('void')
            let estaDeleteProhibido = forbiddenWords.has('delete')
            let debeMarcarTypeof = esTypeof && estaTypeofProhibido
            let debeMarcarVoid = esVoid && estaVoidProhibido
            let debeMarcarDelete = esDelete && estaDeleteProhibido


            if (debeMarcarTypeof) {
                addFinding(findings, filePath, 'typeof', node, 'formatear/no-typeof')

            }

            if (debeMarcarVoid) {
                addFinding(findings, filePath, 'void', node, 'formatear/no-void')

            }

            if (debeMarcarDelete) {
                addFinding(findings, filePath, 'delete', node, 'formatear/no-delete')

            }
        }

        let esBinaryExpression = nodeType === 'BinaryExpression'


        if (esBinaryExpression) {
            let { operator: op } = node


            let esIn = op === 'in'
            let esInstanceof = op === 'instanceof'
            let estaInProhibido = forbiddenWords.has('in')
            let estaInstanceofProhibido = forbiddenWords.has('instanceof')
            let debeMarcarIn = esIn && estaInProhibido
            let debeMarcarInstanceof = esInstanceof && estaInstanceofProhibido


            if (debeMarcarIn) {
                addFinding(findings, filePath, 'in', node, 'formatear/no-in')

            }

            if (debeMarcarInstanceof) {
                addFinding(findings, filePath, 'instanceof', node, 'formatear/no-instanceof')

            }
        }

        let esFunctionDeclaration = nodeType === 'FunctionDeclaration'
        let esFunctionExpression = nodeType === 'FunctionExpression'
        let esAlgunFunction = esFunctionDeclaration || esFunctionExpression


        if (esAlgunFunction) {
            let estaFunctionProhibido = forbiddenWords.has('function')


            if (estaFunctionProhibido) {
                addFinding(findings, filePath, 'function', node, 'formatear/no-function')

            }

            let esAsync = node.async === true
            let estaAsyncProhibido = forbiddenWords.has('async')
            let debeMarcarAsync = esAsync && estaAsyncProhibido


            if (debeMarcarAsync) {
                addFinding(findings, filePath, 'async', node, 'formatear/no-async')

            }
        }

        let esArrowFunctionExpression = nodeType === 'ArrowFunctionExpression'


        if (esArrowFunctionExpression) {
            let esAsync = node.async === true
            let estaAsyncProhibido = forbiddenWords.has('async')
            let debeMarcarAsync = esAsync && estaAsyncProhibido


            if (debeMarcarAsync) {
                addFinding(findings, filePath, 'async', node, 'formatear/no-async')

            }
        }

        let esAwaitExpression = nodeType === 'AwaitExpression'


        if (esAwaitExpression) {
            let estaAwaitProhibido = forbiddenWords.has('await')


            if (estaAwaitProhibido) {
                addFinding(findings, filePath, 'await', node, 'formatear/no-await')

            }
        }

        let esYieldExpression = nodeType === 'YieldExpression'


        if (esYieldExpression) {
            let estaYieldProhibido = forbiddenWords.has('yield')


            if (estaYieldProhibido) {
                addFinding(findings, filePath, 'yield', node, 'formatear/no-yield')

            }
        }

        let esClassDeclaration = nodeType === 'ClassDeclaration'
        let esClassExpression = nodeType === 'ClassExpression'
        let esAlgunaClase = esClassDeclaration || esClassExpression


        if (esAlgunaClase) {
            let estaClassProhibido = forbiddenWords.has('class')


            if (estaClassProhibido) {
                addFinding(findings, filePath, 'class', node, 'formatear/no-class')

            }

            let tieneSuperClase = Boolean(node.superClass)
            let estaExtendsProhibido = forbiddenWords.has('extends')
            let debeMarcarExtends = tieneSuperClase && estaExtendsProhibido


            if (debeMarcarExtends) {
                addFinding(findings, filePath, 'extends', node.superClass, 'formatear/no-extends')

            }
        }

        let esSuper = nodeType === 'Super'


        if (esSuper) {
            let estaSuperProhibido = forbiddenWords.has('super')


            if (estaSuperProhibido) {
                addFinding(findings, filePath, 'super', node, 'formatear/no-super')

            }
        }

        let esImportDeclaration = nodeType === 'ImportDeclaration'
        let esImportExpression = nodeType === 'ImportExpression'
        let esAlgunImport = esImportDeclaration || esImportExpression


        if (esAlgunImport) {
            let estaImportProhibido = forbiddenWords.has('import')


            if (estaImportProhibido) {
                addFinding(findings, filePath, 'import', node, 'formatear/no-import')

            }
        }

        let esExportNamedDeclaration = nodeType === 'ExportNamedDeclaration'
        let esExportDefaultDeclaration = nodeType === 'ExportDefaultDeclaration'
        let esExportAllDeclaration = nodeType === 'ExportAllDeclaration'
        let esAlgunExport = esExportNamedDeclaration || esExportDefaultDeclaration || esExportAllDeclaration


        if (esAlgunExport) {
            let estaExportProhibido = forbiddenWords.has('export')


            if (estaExportProhibido) {
                addFinding(findings, filePath, 'export', node, 'formatear/no-export')

            }
        }

        let esMetaProperty = nodeType === 'MetaProperty'


        if (esMetaProperty) {
            let metaNode = node['meta']


            let propertyNode = node['property']


            let metaName = metaNode && metaNode.name


            let propertyName = propertyNode && propertyNode.name


            let esNewTarget = metaName === 'new' && propertyName === 'target'
            let estaTargetProhibido = forbiddenWords.has('target')
            let debeMarcarTarget = esNewTarget && estaTargetProhibido


            if (debeMarcarTarget) {
                addFinding(findings, filePath, 'target', node, 'formatear/no-target')

            }

            let esImportMeta = metaName === 'import' && propertyName === 'meta'
            let estaMetaProhibido = forbiddenWords.has('meta')
            let debeMarcarMeta = esImportMeta && estaMetaProhibido


            if (debeMarcarMeta) {
                addFinding(findings, filePath, 'meta', node, 'formatear/no-meta')

            }
        }

        let esWithStatement = nodeType === 'WithStatement'


        if (esWithStatement) {
            let estaWithProhibido = forbiddenWords.has('with')


            if (estaWithProhibido) {
                addFinding(findings, filePath, 'with', node, 'formatear/no-with')

            }
        }

        let esDebuggerStatement = nodeType === 'DebuggerStatement'


        if (esDebuggerStatement) {
            let estaDebuggerProhibido = forbiddenWords.has('debugger')


            if (estaDebuggerProhibido) {
                addFinding(findings, filePath, 'debugger', node, 'formatear/no-debugger')

            }
        }

        let esIdentifier = nodeType === 'Identifier'


        if (esIdentifier) {
            let nombreIdentificador = node.name
            let esNombreString = typeof nombreIdentificador === 'string'
            let esNombreProhibido = esNombreString && forbiddenWords.has(nombreIdentificador)
            let esContextoOmitible = isSkippableIdentifierContext(parent, key)
            let debeMarcarIdentificador = esNombreProhibido && !esContextoOmitible


            if (debeMarcarIdentificador) {
                addFinding(
                findings,
                filePath,
                nombreIdentificador,
                node,
                `formatear/no-${nombreIdentificador}`,
                )

            }
        }

        Object.entries(node).forEach(function (pair) {
            let childKey = pair[0]


            let esClaveIgnorable = childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end'


            if (esClaveIgnorable) {
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
        let noEsNodo = !node || typeof node !== 'object'


        if (noEsNodo) {
            return

        }

        let { test } = node


        let noEsTestValido = !test || typeof test !== 'object'


        if (noEsTestValido) {
            return

        }

        let esIdentificador = test.type === 'Identifier'


        if (esIdentificador) {
            return

        }

        addFinding(findings, filePath, 'condicion', test, 'formatear/condition-single-variable')

    }

    function visit(node) {
        let noEsNodo = !node || typeof node !== 'object'


        if (noEsNodo) {
            return

        }

        let esListaDeNodos = Array.isArray(node)


        if (esListaDeNodos) {
            node.forEach(visit)


            return

        }

        let tieneTipoString = typeof node.type === 'string'


        if (tieneTipoString) {
            let { type } = node


            let esNodoConCondicion =
            type === 'IfStatement' ||
            type === 'WhileStatement' ||
            type === 'DoWhileStatement' ||
            type === 'ForStatement'


            if (esNodoConCondicion) {
                checkTest(node)

            }
        }

        Object.entries(node).forEach(function (pair) {
            let key = pair[0]


            let esClaveIgnorable = key === 'loc' || key === 'range' || key === 'start' || key === 'end'


            if (esClaveIgnorable) {
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
    let noHayNodoPadre = !parent


    if (noHayNodoPadre) {
        return false

    }

    let esPropertyAccessExpression = ts.isPropertyAccessExpression(parent)
    let esNombreDePropertyAccessExpression = esPropertyAccessExpression && parent.name === node


    if (esNombreDePropertyAccessExpression) {
        return true

    }

    let esPropertyAssignment = ts.isPropertyAssignment(parent)
    let esNombreDePropertyAssignment = esPropertyAssignment && parent.name === node


    if (esNombreDePropertyAssignment) {
        return true

    }

    let esMethodDeclaration = ts.isMethodDeclaration(parent)
    let esNombreDeMethodDeclaration = esMethodDeclaration && parent.name === node


    if (esNombreDeMethodDeclaration) {
        return true

    }

    let esMethodSignature = ts.isMethodSignature(parent)
    let esNombreDeMethodSignature = esMethodSignature && parent.name === node


    if (esNombreDeMethodSignature) {
        return true

    }

    let esPropertyDeclaration = ts.isPropertyDeclaration(parent)
    let esNombreDePropertyDeclaration = esPropertyDeclaration && parent.name === node


    if (esNombreDePropertyDeclaration) {
        return true

    }

    let esPropertySignature = ts.isPropertySignature(parent)
    let esNombreDePropertySignature = esPropertySignature && parent.name === node


    if (esNombreDePropertySignature) {
        return true

    }

    let esGetAccessorDeclaration = ts.isGetAccessorDeclaration(parent)
    let esNombreDeGetAccessorDeclaration = esGetAccessorDeclaration && parent.name === node


    if (esNombreDeGetAccessorDeclaration) {
        return true

    }

    let esSetAccessorDeclaration = ts.isSetAccessorDeclaration(parent)
    let esNombreDeSetAccessorDeclaration = esSetAccessorDeclaration && parent.name === node


    if (esNombreDeSetAccessorDeclaration) {
        return true

    }

    let esShorthandPropertyAssignment = ts.isShorthandPropertyAssignment(parent)
    let esNombreDeShorthandPropertyAssignment = esShorthandPropertyAssignment && parent.name === node


    if (esNombreDeShorthandPropertyAssignment) {
        return true

    }

    let esEnumMember = ts.isEnumMember(parent)
    let esNombreDeEnumMember = esEnumMember && parent.name === node


    if (esNombreDeEnumMember) {
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


        let esThisKeyword = kind === ts.SyntaxKind.ThisKeyword


        if (esThisKeyword) {
            let estaThisProhibido = forbiddenWords.has('this')


            if (estaThisProhibido) {
                addKeywordNode('this', node, 'formatear/no-this')

            }
        }

        let esIfStatement = kind === ts.SyntaxKind.IfStatement


        if (esIfStatement) {
            let estaIfProhibido = forbiddenWords.has('if')


            if (estaIfProhibido) {
                addKeywordNode('if', node, 'formatear/no-if')

            }

            let hayElseStatement = Boolean(node.elseStatement)
            let estaElseProhibido = forbiddenWords.has('else')
            let debeMarcarElse = hayElseStatement && estaElseProhibido


            if (debeMarcarElse) {
                addKeywordNode('else', node.elseStatement, 'formatear/no-else')

            }
        }

        let esReturnStatement = kind === ts.SyntaxKind.ReturnStatement


        if (esReturnStatement) {
            let estaReturnProhibido = forbiddenWords.has('return')


            if (estaReturnProhibido) {
                addKeywordNode('return', node, 'formatear/no-return')

            }
        }

        let esForStatement = kind === ts.SyntaxKind.ForStatement
        let esForInStatement = kind === ts.SyntaxKind.ForInStatement
        let esForOfStatement = kind === ts.SyntaxKind.ForOfStatement
        let esAlgunFor = esForStatement || esForInStatement || esForOfStatement


        if (esAlgunFor) {
            let estaForProhibido = forbiddenWords.has('for')


            if (estaForProhibido) {
                addKeywordNode('for', node, 'formatear/no-for')

            }

            let estaInProhibido = forbiddenWords.has('in')
            let debeMarcarIn = esForInStatement && estaInProhibido


            if (debeMarcarIn) {
                addKeywordNode('in', node, 'formatear/no-in')

            }

            let estaOfProhibido = forbiddenWords.has('of')
            let debeMarcarOf = esForOfStatement && estaOfProhibido


            if (debeMarcarOf) {
                addKeywordNode('of', node, 'formatear/no-of')

            }
        }

        let esWhileStatement = kind === ts.SyntaxKind.WhileStatement


        if (esWhileStatement) {
            let estaWhileProhibido = forbiddenWords.has('while')


            if (estaWhileProhibido) {
                addKeywordNode('while', node, 'formatear/no-while')

            }
        }

        let esDoStatement = kind === ts.SyntaxKind.DoStatement


        if (esDoStatement) {
            let estaDoProhibido = forbiddenWords.has('do')


            if (estaDoProhibido) {
                addKeywordNode('do', node, 'formatear/no-do')

            }
        }

        let esSwitchStatement = kind === ts.SyntaxKind.SwitchStatement


        if (esSwitchStatement) {
            let estaSwitchProhibido = forbiddenWords.has('switch')


            if (estaSwitchProhibido) {
                addKeywordNode('switch', node, 'formatear/no-switch')

            }
        }

        let esCaseClause = kind === ts.SyntaxKind.CaseClause


        if (esCaseClause) {
            let estaCaseProhibido = forbiddenWords.has('case')


            if (estaCaseProhibido) {
                addKeywordNode('case', node, 'formatear/no-case')

            }
        }

        let esDefaultClause = kind === ts.SyntaxKind.DefaultClause


        if (esDefaultClause) {
            let estaDefaultProhibido = forbiddenWords.has('default')


            if (estaDefaultProhibido) {
                addKeywordNode('default', node, 'formatear/no-default')

            }
        }

        let esBreakStatement = kind === ts.SyntaxKind.BreakStatement


        if (esBreakStatement) {
            let estaBreakProhibido = forbiddenWords.has('break')


            if (estaBreakProhibido) {
                addKeywordNode('break', node, 'formatear/no-break')

            }
        }

        let esContinueStatement = kind === ts.SyntaxKind.ContinueStatement


        if (esContinueStatement) {
            let estaContinueProhibido = forbiddenWords.has('continue')


            if (estaContinueProhibido) {
                addKeywordNode('continue', node, 'formatear/no-continue')

            }
        }

        let esTryStatement = kind === ts.SyntaxKind.TryStatement


        if (esTryStatement) {
            let estaTryProhibido = forbiddenWords.has('try')


            if (estaTryProhibido) {
                addKeywordNode('try', node, 'formatear/no-try')

            }

            let hayFinallyBlock = Boolean(node.finallyBlock)
            let estaFinallyProhibido = forbiddenWords.has('finally')
            let debeMarcarFinally = hayFinallyBlock && estaFinallyProhibido


            if (debeMarcarFinally) {
                addKeywordNode('finally', node.finallyBlock, 'formatear/no-finally')

            }
        }

        let esCatchClause = kind === ts.SyntaxKind.CatchClause


        if (esCatchClause) {
            let estaCatchProhibido = forbiddenWords.has('catch')


            if (estaCatchProhibido) {
                addKeywordNode('catch', node, 'formatear/no-catch')

            }
        }

        let esThrowStatement = kind === ts.SyntaxKind.ThrowStatement


        if (esThrowStatement) {
            let estaThrowProhibido = forbiddenWords.has('throw')


            if (estaThrowProhibido) {
                addKeywordNode('throw', node, 'formatear/no-throw')

            }
        }

        let esNewExpression = kind === ts.SyntaxKind.NewExpression


        if (esNewExpression) {
            let estaNewProhibido = forbiddenWords.has('new')


            if (estaNewProhibido) {
                addKeywordNode('new', node, 'formatear/no-new')

            }
        }

        let esTypeOfExpression = kind === ts.SyntaxKind.TypeOfExpression


        if (esTypeOfExpression) {
            let estaTypeofProhibido = forbiddenWords.has('typeof')


            if (estaTypeofProhibido) {
                addKeywordNode('typeof', node, 'formatear/no-typeof')

            }
        }

        let esVoidExpression = kind === ts.SyntaxKind.VoidExpression


        if (esVoidExpression) {
            let estaVoidProhibido = forbiddenWords.has('void')


            if (estaVoidProhibido) {
                addKeywordNode('void', node, 'formatear/no-void')

            }
        }

        let esDeleteExpression = kind === ts.SyntaxKind.DeleteExpression


        if (esDeleteExpression) {
            let estaDeleteProhibido = forbiddenWords.has('delete')


            if (estaDeleteProhibido) {
                addKeywordNode('delete', node, 'formatear/no-delete')

            }
        }

        let esBinaryExpression = kind === ts.SyntaxKind.BinaryExpression


        if (esBinaryExpression) {
            let { operatorToken } = node


            let { kind: operatorKind } = operatorToken || {}


            let esInKeyword = operatorKind === ts.SyntaxKind.InKeyword
            let estaInProhibido = forbiddenWords.has('in')
            let debeMarcarIn = esInKeyword && estaInProhibido


            if (debeMarcarIn) {
                addKeywordNode('in', node, 'formatear/no-in')

            }

            let esInstanceOfKeyword = operatorKind === ts.SyntaxKind.InstanceOfKeyword
            let estaInstanceofProhibido = forbiddenWords.has('instanceof')
            let debeMarcarInstanceof = esInstanceOfKeyword && estaInstanceofProhibido


            if (debeMarcarInstanceof) {
                addKeywordNode('instanceof', node, 'formatear/no-instanceof')

            }
        }

        let esFunctionDeclaration = kind === ts.SyntaxKind.FunctionDeclaration
        let esFunctionExpression = kind === ts.SyntaxKind.FunctionExpression
        let esAlgunaFuncion = esFunctionDeclaration || esFunctionExpression


        if (esAlgunaFuncion) {
            let estaFunctionProhibido = forbiddenWords.has('function')


            if (estaFunctionProhibido) {
                addKeywordNode('function', node, 'formatear/no-function')

            }
        }

        let esClassDeclaration = kind === ts.SyntaxKind.ClassDeclaration
        let esClassExpression = kind === ts.SyntaxKind.ClassExpression
        let esAlgunaClase = esClassDeclaration || esClassExpression


        if (esAlgunaClase) {
            let estaClassProhibido = forbiddenWords.has('class')


            if (estaClassProhibido) {
                addKeywordNode('class', node, 'formatear/no-class')

            }
        }

        let esSuperKeyword = kind === ts.SyntaxKind.SuperKeyword


        if (esSuperKeyword) {
            let estaSuperProhibido = forbiddenWords.has('super')


            if (estaSuperProhibido) {
                addKeywordNode('super', node, 'formatear/no-super')

            }
        }

        let esAwaitExpression = kind === ts.SyntaxKind.AwaitExpression


        if (esAwaitExpression) {
            let estaAwaitProhibido = forbiddenWords.has('await')


            if (estaAwaitProhibido) {
                addKeywordNode('await', node, 'formatear/no-await')

            }
        }

        let esYieldExpression = kind === ts.SyntaxKind.YieldExpression


        if (esYieldExpression) {
            let estaYieldProhibido = forbiddenWords.has('yield')


            if (estaYieldProhibido) {
                addKeywordNode('yield', node, 'formatear/no-yield')

            }
        }

        let esInterfaceDeclaration = kind === ts.SyntaxKind.InterfaceDeclaration


        if (esInterfaceDeclaration) {
            let estaInterfaceProhibido = forbiddenWords.has('interface')


            if (estaInterfaceProhibido) {
                addKeywordNode('interface', node, 'formatear/no-interface')

            }
        }

        let esEnumDeclaration = kind === ts.SyntaxKind.EnumDeclaration


        if (esEnumDeclaration) {
            let estaEnumProhibido = forbiddenWords.has('enum')


            if (estaEnumProhibido) {
                addKeywordNode('enum', node, 'formatear/no-enum')

            }
        }

        let esMetaProperty = kind === ts.SyntaxKind.MetaProperty


        if (esMetaProperty) {
            let { keywordToken, name: nameNode } = node


            let { escapedText: name } = nameNode || {}


            let esNewKeyword = keywordToken === ts.SyntaxKind.NewKeyword
            let esNombreTarget = name === 'target'
            let estaTargetProhibido = forbiddenWords.has('target')
            let debeMarcarTarget = esNewKeyword && esNombreTarget && estaTargetProhibido


            if (debeMarcarTarget) {
                addKeywordNode('target', node, 'formatear/no-target')

            }

            let esImportKeyword = keywordToken === ts.SyntaxKind.ImportKeyword
            let esNombreMeta = name === 'meta'
            let estaMetaProhibido = forbiddenWords.has('meta')
            let debeMarcarMeta = esImportKeyword && esNombreMeta && estaMetaProhibido


            if (debeMarcarMeta) {
                addKeywordNode('meta', node, 'formatear/no-meta')

            }
        }

        let esAsExpression = kind === ts.SyntaxKind.AsExpression


        if (esAsExpression) {
            let estaAsProhibido = forbiddenWords.has('as')


            if (estaAsProhibido) {
                addKeywordNode('as', node, 'formatear/no-as')

            }
        }

        let esWithStatement = kind === ts.SyntaxKind.WithStatement


        if (esWithStatement) {
            let estaWithProhibido = forbiddenWords.has('with')


            if (estaWithProhibido) {
                addKeywordNode('with', node, 'formatear/no-with')

            }
        }

        let esDebuggerStatement = kind === ts.SyntaxKind.DebuggerStatement


        if (esDebuggerStatement) {
            let estaDebuggerProhibido = forbiddenWords.has('debugger')


            if (estaDebuggerProhibido) {
                addKeywordNode('debugger', node, 'formatear/no-debugger')

            }
        }

        let esVariableStatement = kind === ts.SyntaxKind.VariableStatement


        if (esVariableStatement) {
            let { declarationList: declList } = node


            let { flags = 0 } = declList || {}


            let estaConstProhibido = forbiddenWords.has('const')
            let tieneFlagConst = (flags & ts.NodeFlags.Const) !== 0
            let debeMarcarConst = estaConstProhibido && tieneFlagConst


            if (debeMarcarConst) {
                addKeywordNode('const', node, 'formatear/no-const')

            }

            let estaLetProhibido = forbiddenWords.has('let')
            let tieneFlagLet = (flags & ts.NodeFlags.Let) !== 0
            let debeMarcarLet = estaLetProhibido && tieneFlagLet


            if (debeMarcarLet) {
                addKeywordNode('let', node, 'formatear/no-let')

            }

            let estaVarProhibido = forbiddenWords.has('var')
            let tieneFlagConstOLet = (flags & (ts.NodeFlags.Const | ts.NodeFlags.Let)) !== 0
            let debeMarcarVar = estaVarProhibido && !tieneFlagConstOLet


            if (debeMarcarVar) {
                addKeywordNode('var', node, 'formatear/no-var')

            }
        }

        let esConstructor = kind === ts.SyntaxKind.Constructor


        if (esConstructor) {
            let estaConstructorProhibido = forbiddenWords.has('constructor')


            if (estaConstructorProhibido) {
                addKeywordNode('constructor', node, 'formatear/no-constructor')

            }
        }

        let esIdentifier = kind === ts.SyntaxKind.Identifier


        if (esIdentifier) {
            let { escapedText: name } = node


            let esNombreString = typeof name === 'string'
            let esNombreProhibido = esNombreString && forbiddenWords.has(name)
            let esContextoOmitible = isSkippableTsIdentifierContext(parent, node, ts)
            let debeMarcarIdentificador = esNombreProhibido && !esContextoOmitible


            if (debeMarcarIdentificador) {
                addKeywordNode(name, node, `formatear/no-${name}`)

            }
        }

        let { modifiers } = node


        let hayModificadores = Boolean(modifiers && modifiers.length)


        if (hayModificadores) {
            modifiers.forEach(function (modifier) {
                let { kind: modifierKind } = modifier


                let esPublicKeyword = modifierKind === ts.SyntaxKind.PublicKeyword


                if (esPublicKeyword) {
                    let estaPublicProhibido = forbiddenWords.has('public')


                    if (estaPublicProhibido) {
                        addModifier('public', modifier, 'formatear/no-public')

                    }

                    return

                }
                let esPrivateKeyword = modifierKind === ts.SyntaxKind.PrivateKeyword


                if (esPrivateKeyword) {
                    let estaPrivateProhibido = forbiddenWords.has('private')


                    if (estaPrivateProhibido) {
                        addModifier('private', modifier, 'formatear/no-private')

                    }

                    return

                }
                let esProtectedKeyword = modifierKind === ts.SyntaxKind.ProtectedKeyword


                if (esProtectedKeyword) {
                    let estaProtectedProhibido = forbiddenWords.has('protected')


                    if (estaProtectedProhibido) {
                        addModifier('protected', modifier, 'formatear/no-protected')

                    }

                    return

                }
                let esStaticKeyword = modifierKind === ts.SyntaxKind.StaticKeyword


                if (esStaticKeyword) {
                    let estaStaticProhibido = forbiddenWords.has('static')


                    if (estaStaticProhibido) {
                        addModifier('static', modifier, 'formatear/no-static')

                    }

                    return

                }
                let esAsyncKeyword = modifierKind === ts.SyntaxKind.AsyncKeyword


                if (esAsyncKeyword) {
                    let estaAsyncProhibido = forbiddenWords.has('async')


                    if (estaAsyncProhibido) {
                        addModifier('async', modifier, 'formatear/no-async')

                    }

                    return

                }
                let esAccessorKeyword = modifierKind === ts.SyntaxKind.AccessorKeyword


                if (esAccessorKeyword) {
                    let estaAccessorProhibido = forbiddenWords.has('accessor')


                    if (estaAccessorProhibido) {
                        addModifier('accessor', modifier, 'formatear/no-accessor')

                    }
                }
            })

        }

        let { heritageClauses } = node


        let hayHeritageClauses = Boolean(heritageClauses && heritageClauses.length)


        if (hayHeritageClauses) {
            heritageClauses.forEach(function (clause) {
                let esExtendsKeyword = clause.token === ts.SyntaxKind.ExtendsKeyword
                let estaExtendsProhibido = forbiddenWords.has('extends')
                let debeMarcarExtends = esExtendsKeyword && estaExtendsProhibido


                if (debeMarcarExtends) {
                    addKeywordNode('extends', clause, 'formatear/no-extends')

                }

                let esImplementsKeyword = clause.token === ts.SyntaxKind.ImplementsKeyword
                let estaImplementsProhibido = forbiddenWords.has('implements')
                let debeMarcarImplements = esImplementsKeyword && estaImplementsProhibido


                if (debeMarcarImplements) {
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
        let noEsExpresion = !expr || typeof expr !== 'object'


        if (noEsExpresion) {
            return

        }

        let esIdentificador = expr.kind === ts.SyntaxKind.Identifier


        if (esIdentificador) {
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


        let esIfStatement = kind === ts.SyntaxKind.IfStatement


        if (esIfStatement) {
            addExpressionFinding(node.expression)

        }

        let esWhileStatement = kind === ts.SyntaxKind.WhileStatement


        if (esWhileStatement) {
            addExpressionFinding(node.expression)

        }

        let esDoStatement = kind === ts.SyntaxKind.DoStatement


        if (esDoStatement) {
            addExpressionFinding(node.expression)

        }

        let esForStatement = kind === ts.SyntaxKind.ForStatement


        if (esForStatement) {
            let hayCondicion = Boolean(node.condition)


            if (hayCondicion) {
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

    let noHayAst = !ast


    if (noHayAst) {
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
        let noEsPuntoYComa = t.text !== ';'


        if (noEsPuntoYComa) {
            return

        }

        let esVacioDeSentencia = emptyStartSet.has(t.start)


        if (esVacioDeSentencia) {
            return

        }

        let estaEnCabeceraDeFor = isInsideAnySpan(t.start, forHeaderSpans)


        if (estaEnCabeceraDeFor) {
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
        let noEsKeyword = t.type !== 'Keyword'


        if (noEsKeyword) {
            return

        }

        let esVar = t.text === 'var'
        let esConst = t.text === 'const'
        let noEsVarNiConst = !esVar && !esConst


        if (noEsVarNiConst) {
            return

        }

        let rangoInvalido = typeof t.start !== 'number' || typeof t.end !== 'number' || t.end < t.start


        if (rangoInvalido) {
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
        let noEsNodo = !node || typeof node !== 'object'


        if (noEsNodo) {
            return

        }

        let noEsArrowFunctionExpression = node.type !== 'ArrowFunctionExpression'


        if (noEsArrowFunctionExpression) {
            return

        }

        let arrowToken = arrowTokens.find(function (t) {
            return typeof t.start === 'number' && t.start >= node.start && t.end <= node.end

        })


        let noHayArrowToken = !arrowToken


        if (noHayArrowToken) {
            addFinding(unfixableFindings, filePath, '=>', node, 'formatear/no-arrow-function')


            return

        }

        let headText = sourceText.slice(node.start, arrowToken.start).trimEnd()


        let esAsync = node.async === true


        if (esAsync) {
            headText = headText.replace(/^\s*async\b\s*/, '')

        }

        let paramsText = headText.trim()


        let paramsNoTieneParentesis = !paramsText.startsWith('(')


        if (paramsNoTieneParentesis) {
            paramsText = `(${paramsText})`

        }

        let functionPrefix = node.async === true ? 'async function ' : 'function '


        let bodyText


        let tieneBody = Boolean(node.body)
        let esBlockStatement = tieneBody && node.body.type === 'BlockStatement'


        if (esBlockStatement) {
            bodyText = sourceText.slice(node.body.start, node.body.end)

        }

        let noHayBodyText = !bodyText
        let tieneRangoBody = tieneBody && typeof node.body.start === 'number' && typeof node.body.end === 'number'
        let debeGenerarBodyReturn = noHayBodyText && tieneRangoBody


        if (debeGenerarBodyReturn) {
            let expressionText = sourceText.slice(node.body.start, node.body.end)


            bodyText = `{ return ${expressionText} }`

        }

        let sigueSinBodyText = !bodyText


        if (sigueSinBodyText) {
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
        let noEsNodo = !node || typeof node !== 'object'


        if (noEsNodo) {
            return

        }

        let esArreglo = Array.isArray(node)


        if (esArreglo) {
            node.forEach(function (item) {
                visit(item)

            })


            return

        }

        let noTieneTipo = typeof node.type !== 'string'


        if (noTieneTipo) {
            Object.values(node).forEach(function (child) {
                visit(child)

            })


            return

        }

        let esArrowFunctionExpression = node.type === 'ArrowFunctionExpression'


        if (esArrowFunctionExpression) {
            convertArrowFunction(node)

        }

        Object.entries(node).forEach(function (pair) {
            let childKey = pair[0]


            let esClaveDeUbicacion = childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end'


            if (esClaveDeUbicacion) {
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
        let noEsStmtValido = !stmt || typeof stmt !== 'object'


        if (noEsStmtValido) {
            return

        }

        let esBloque = stmt.type === 'BlockStatement'


        if (esBloque) {
            return

        }

        let rangoInvalido = typeof stmt.start !== 'number' || typeof stmt.end !== 'number' || stmt.end < stmt.start


        if (rangoInvalido) {
            addFinding(unfixableFindings, filePath, '{', stmt, 'formatear/require-braces')


            return

        }

        replacements.push({ start: stmt.start, end: stmt.start, text: '{ ' })


        replacements.push({ start: stmt.end, end: stmt.end, text: ' }' })

    }

    function visit(node) {
        let noEsNodo = !node || typeof node !== 'object'


        if (noEsNodo) {
            return

        }

        let esArreglo = Array.isArray(node)


        if (esArreglo) {
            node.forEach(function (item) {
                visit(item)

            })


            return

        }

        let noTieneTipo = typeof node.type !== 'string'


        if (noTieneTipo) {
            Object.values(node).forEach(function (child) {
                visit(child)

            })


            return

        }

        let esIfStatement = node.type === 'IfStatement'


        if (esIfStatement) {
            wrapStatement(node.consequent)


            let tieneAlternativa = Boolean(node.alternate)


            if (tieneAlternativa) {
                wrapStatement(node.alternate)

            }
        }

        Object.entries(node).forEach(function (pair) {
            let childKey = pair[0]


            let esClaveDeUbicacion = childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end'


            if (esClaveDeUbicacion) {
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
        let esEmptyStatement = node.kind === ts.SyntaxKind.EmptyStatement


        if (esEmptyStatement) {
            let start = node.getStart(sourceFile)


            let end = node.getEnd()


            let rangoValido = typeof start === 'number' && typeof end === 'number' && end > start


            if (rangoValido) {
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
        let excedeLongitudDeTokens = i >= tokens.length


        if (excedeLongitudDeTokens) {
            return spans

        }

        let noEsFor = tokens[i].kind !== ts.SyntaxKind.ForKeyword


        if (noEsFor) {
            return scanFrom(i + 1)

        }

        let j = i + 1


        let hayAwait = tokens[j] && tokens[j].kind === ts.SyntaxKind.AwaitKeyword


        if (hayAwait) {
            j += 1

        }

        let openParenToken = tokens[j]


        let noHayParentesisDeApertura =
        !openParenToken || openParenToken.kind !== ts.SyntaxKind.OpenParenToken


        if (noHayParentesisDeApertura) {
            return scanFrom(i + 1)

        }

        let start = openParenToken.pos


        function scanParen(k, depth) {
            let excedeLongitudDeTokens = k >= tokens.length


            if (excedeLongitudDeTokens) {
                return scanFrom(i + 1)

            }

            let tk = tokens[k]


            let nextDepth = depth


            let abreParentesis = tk.kind === ts.SyntaxKind.OpenParenToken


            if (abreParentesis) {
                nextDepth += 1

            }

            let cierraParentesis = tk.kind === ts.SyntaxKind.CloseParenToken


            if (cierraParentesis) {
                nextDepth -= 1

            }

            let terminaElEncabezado = tk.kind === ts.SyntaxKind.CloseParenToken && nextDepth === 0


            if (terminaElEncabezado) {
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


        let finDeArchivo = kind === ts.SyntaxKind.EndOfFileToken


        if (finDeArchivo) {
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


    let esTsx = ext === '.tsx'


    if (esTsx) {
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
        let noEsPuntoYComa = t.kind !== ts.SyntaxKind.SemicolonToken


        if (noEsPuntoYComa) {
            return

        }

        let esEmptyStatement = emptyStartSet.has(t.pos)


        if (esEmptyStatement) {
            return

        }

        let estaDentroDeEncabezadoDeFor = isInsideAnySpan(t.pos, forHeaderSpans)


        if (estaDentroDeEncabezadoDeFor) {
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
        let noEsVarNiConst = t.kind !== ts.SyntaxKind.VarKeyword && t.kind !== ts.SyntaxKind.ConstKeyword


        if (noEsVarNiConst) {
            return

        }

        let rangoInvalido = typeof t.pos !== 'number' || typeof t.end !== 'number' || t.end < t.pos


        if (rangoInvalido) {
            return

        }

        replacements.push({ start: t.pos, end: t.end, text: 'let' })

    })


    let fixedText = applyReplacements(sourceText, replacements)


    return { fixedText, unfixableFindings: [] }

}

function fixArrowFunctionsToFunctionsTypescript(filePath, ts, sourceText, ext) {
    let scriptKind = ts.ScriptKind.TS


    let esTsx = ext === '.tsx'


    if (esTsx) {
        scriptKind = ts.ScriptKind.TSX

    }

    let sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind)


    let replacements = []


    let unfixableFindings = []


    function visit(node) {
        let esArrowFunction = node.kind === ts.SyntaxKind.ArrowFunction


        if (esArrowFunction) {
            let start = node.getStart(sourceFile)


            let end = node.getEnd()


            let rangoInvalido = typeof start !== 'number' || typeof end !== 'number' || end < start


            if (rangoInvalido) {
                return

            }

            let arrowToken = node.equalsGreaterThanToken


            let arrowPos = arrowToken ? arrowToken.getStart(sourceFile) : -1


            let posicionDeFlechaInvalida = typeof arrowPos !== 'number' || arrowPos < start


            if (posicionDeFlechaInvalida) {
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


            let faltanParentesisEnParametros = !paramsText.startsWith('(')


            if (faltanParentesisEnParametros) {
                paramsText = `(${paramsText})`

            }

            let functionPrefix = isAsync ? 'async function ' : 'function '


            let bodyText


            let esBloque = node.body.kind === ts.SyntaxKind.Block


            if (esBloque) {
                bodyText = sourceText.slice(node.body.getStart(sourceFile), node.body.getEnd())

            }

            let faltaCuerpo = !bodyText


            if (faltaCuerpo) {
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


    let esTsx = ext === '.tsx'


    if (esTsx) {
        scriptKind = ts.ScriptKind.TSX

    }

    let sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind)


    let replacements = []


    let unfixableFindings = []


    function wrapStatement(stmt) {
        let noHaySentencia = !stmt


        if (noHaySentencia) {
            return

        }

        let yaTieneBloque = stmt.kind === ts.SyntaxKind.Block


        if (yaTieneBloque) {
            return

        }

        let start = stmt.getStart(sourceFile)


        let end = stmt.getEnd()


        let rangoInvalido = typeof start !== 'number' || typeof end !== 'number' || end < start


        if (rangoInvalido) {
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
        let esIfStatement = node.kind === ts.SyntaxKind.IfStatement


        if (esIfStatement) {
            wrapStatement(node.thenStatement)


            let tieneElseStatement = Boolean(node.elseStatement)


            if (tieneElseStatement) {
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
    let pidioAyuda = argv.includes('--help') || argv.includes('-h')


    if (pidioAyuda) {
        printHelp()


        return 0

    }

    let formatearIndex = argv.indexOf('--formatear')


    let faltaFlagFormatear = formatearIndex === -1


    if (faltaFlagFormatear) {
        printHelp()


        return 2

    }

    let inputPaths = argv.slice(formatearIndex + 1).filter(isPathLike)


    let noHayRutasDeEntrada = inputPaths.length === 0


    if (noHayRutasDeEntrada) {
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


    let noHayArchivos = files.length === 0


    if (noHayArchivos) {
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
                let noHayTypescript = !ts


                if (noHayTypescript) {
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


                let huboCambiosDeTabs = tabFixedText !== sourceText


                if (huboCambiosDeTabs) {
                    await fs.writeFile(inputFilePath, tabFixedText, 'utf8')


                    sourceText = tabFixedText

                }


                let fixed = fixSemicolonsTypescript(inputFilePath, ts, sourceText, ext)


                let huboCambiosDePuntoYComa = fixed.fixedText !== sourceText


                if (huboCambiosDePuntoYComa) {
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


                let huboCambiosVarConst = varConstFixed.fixedText !== sourceText


                if (huboCambiosVarConst) {
                    await fs.writeFile(inputFilePath, varConstFixed.fixedText, 'utf8')


                    sourceText = varConstFixed.fixedText

                }

                let arrowFixed = fixArrowFunctionsToFunctionsTypescript(inputFilePath, ts, sourceText, ext)


                let huboCambiosDeArrows = arrowFixed.fixedText !== sourceText


                if (huboCambiosDeArrows) {
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


                let huboCambiosDeLlaves = bracesFixed.fixedText !== sourceText


                if (huboCambiosDeLlaves) {
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


                let huboCambiosDeIndentacion = reindentedText !== sourceText


                if (huboCambiosDeIndentacion) {
                    await fs.writeFile(inputFilePath, reindentedText, 'utf8')


                    sourceText = reindentedText

                }

                let noTrailingWhitespaceText = stripTrailingWhitespace(sourceText)


                let huboCambiosDeEspaciosFinales = noTrailingWhitespaceText !== sourceText


                if (huboCambiosDeEspaciosFinales) {
                    await fs.writeFile(inputFilePath, noTrailingWhitespaceText, 'utf8')


                    sourceText = noTrailingWhitespaceText

                }


                let scriptKind = ts.ScriptKind.TS


                let esTsx = ext === '.tsx'


                if (esTsx) {
                    scriptKind = ts.ScriptKind.TSX

                }

                let sourceFile = ts.createSourceFile(inputFilePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind)


                conditionFindings = collectConditionSingleVariableFindingsTypescript(sourceFile, inputFilePath, ts)


                findings = collectForbiddenFindingsTypescript(sourceFile, inputFilePath, forbiddenWords, ts)

            }

            let noEsTsFile = !isTsFile


            if (noEsTsFile) {
                let sourceText = await fs.readFile(inputFilePath, 'utf8')

                let parsedForTabs = parseSourceMeriyah(parse, sourceText)


                let tabFixedText = convertTabsToFourSpacesOutsideTokens(
                sourceText,
                parsedForTabs.tokens.map(function (t) {
                    return { start: t.start, end: t.end }

                }),
                )


                let huboCambiosDeTabs = tabFixedText !== sourceText


                if (huboCambiosDeTabs) {
                    await fs.writeFile(inputFilePath, tabFixedText, 'utf8')


                    sourceText = tabFixedText

                }


                let fixed = fixSemicolonsMeriyah(inputFilePath, parse, sourceText)


                let huboCambiosDePuntoYComa = fixed.fixedText !== sourceText


                if (huboCambiosDePuntoYComa) {
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


                let huboCambiosVarConst = varConstFixed.fixedText !== sourceText


                if (huboCambiosVarConst) {
                    await fs.writeFile(inputFilePath, varConstFixed.fixedText, 'utf8')


                    sourceText = varConstFixed.fixedText

                }

                let arrowFixed = fixArrowFunctionsToFunctionsMeriyah(inputFilePath, parse, sourceText)


                let huboCambiosDeArrows = arrowFixed.fixedText !== sourceText


                if (huboCambiosDeArrows) {
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


                let huboCambiosDeLlaves = bracesFixed.fixedText !== sourceText


                if (huboCambiosDeLlaves) {
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


                let huboCambiosDeIndentacion = reindentedText !== sourceText


                if (huboCambiosDeIndentacion) {
                    await fs.writeFile(inputFilePath, reindentedText, 'utf8')


                    sourceText = reindentedText

                }

                let noTrailingWhitespaceText = stripTrailingWhitespace(sourceText)


                let huboCambiosDeEspaciosFinales = noTrailingWhitespaceText !== sourceText


                if (huboCambiosDeEspaciosFinales) {
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


    let huboErroresDeParseo = parseErrorCount > 0


    if (huboErroresDeParseo) {
        return 2

    }

    return issueCount > 0 ? 1 : 0

}

let exitCode = await run(process.argv.slice(2))


process.exitCode = exitCode
