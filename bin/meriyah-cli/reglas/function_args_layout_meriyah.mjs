import {
    applyReplacements,
    detectEol,
    findLineEndIndex,
    findLineIndent,
    findLineStartIndex
} from '../formatting.mjs'
import { parseSourceMeriyah } from './meriyah_parse.mjs'

export function fixFunctionArgumentsLayoutMeriyah(
    filePath,
    parse,
    sourceText
) {
    let noEsTextoValido = typeof sourceText !== 'string' || sourceText.length === 0

    if (
        noEsTextoValido
    ) {
        return {
            fixedText: sourceText
        }

    }

    let fixedText = sourceText
    let maxPasadas = 8
    let ast
    let tokens
    let eol

    function findLineIndentAt(
        index
    ) {
        let lineStart = findLineStartIndex(
            sourceText,
            index
        )

        let lineEnd = findLineEndIndex(
            sourceText,
            index
        )

        return findLineIndent(
            sourceText,
            lineStart,
            lineEnd
        )

    }

    function lowerBoundTokens(
        pos
    ) {
        function step(
            lo,
            hi
        ) {
            let seguir = lo < hi

            if (
                seguir
            ) {
                let mid = (lo + hi) >> 1

                let t = tokens[mid]

                let debeAvanzar = t.start < pos

                if (
                    debeAvanzar
                ) {
                    return step(
                        mid + 1,
                        hi
                    )
                }

                return step(
                    lo,
                    mid
                )
            }

            return lo
        }

        return step(
            0,
            tokens.length
        )

    }

    function upperBoundTokens(
        pos
    ) {
        function step(
            lo,
            hi
        ) {
            let seguir = lo < hi

            if (
                seguir
            ) {
                let mid = (lo + hi) >> 1

                let t = tokens[mid]

                let debeAvanzar = t.start <= pos

                if (
                    debeAvanzar
                ) {
                    return step(
                        mid + 1,
                        hi
                    )
                }

                return step(
                    lo,
                    mid
                )
            }

            return lo
        }

        return step(
            0,
            tokens.length
        )

    }

    function findOpenTokenIndex(
        fromPos,
        toPos,
        openChar
    ) {
        let startIndex = lowerBoundTokens(
            fromPos
        )

        let endIndex = upperBoundTokens(
            toPos
        )

        function scan(
            i
        ) {
            let seguir = i < endIndex

            if (
                seguir
            ) {
                let t = tokens[i]

                let esApertura = t && t.type === 'Punctuator' && t.text === openChar

                if (
                    esApertura
                ) {
                    return i
                }

                return scan(
                    i + 1
                )
            }

            return -1
        }

        return scan(
            startIndex
        )

    }

    function findMatchingCloseTokenIndex(
        openIndex,
        toPos,
        openChar,
        closeChar
    ) {
        let openIndexInvalido = openIndex < 0

        if (
            openIndexInvalido
        ) {
            return -1
        }

        let endIndex = upperBoundTokens(
            toPos
        )

        function scan(
            i,
            depth
        ) {
            let seguir = i < endIndex

            if (
                seguir
            ) {
                let t = tokens[i]

                let noHayToken = !t

                if (
                    noHayToken
                ) {
                    return scan(
                        i + 1,
                        depth
                    )
                }

                let esApertura = t.type === 'Punctuator' && t.text === openChar
                let esCierre = t.type === 'Punctuator' && t.text === closeChar

                let inc
let condicionTernario50604 = esApertura
if (
    condicionTernario50604
) {
                    inc = 1
}
let condicionTernario50604Negada = !condicionTernario50604
if (
    condicionTernario50604Negada
) {
                    inc = 0
}
                let dec
let condicionTernario50649 = esCierre
if (
    condicionTernario50649
) {
                    dec = 1
}
let condicionTernario50649Negada = !condicionTernario50649
if (
    condicionTernario50649Negada
) {
                    dec = 0
}

                let nextDepth = depth + inc - dec

                let nextDepthEsCero = nextDepth === 0

                let esCierreFinal = esCierre && nextDepthEsCero

                if (
                    esCierreFinal
                ) {
                    return i
                }

                return scan(
                    i + 1,
                    nextDepth
                )
            }

            return -1
        }

        return scan(
            openIndex,
            0
        )

    }

    function collectItemsFromNodeArray(
        nodeArray
    ) {
        let noEsArreglo = !Array.isArray(
            nodeArray
        ) || nodeArray.length === 0

        if (
            noEsArreglo
        ) {
            return []
        }

        let out = []

        nodeArray.forEach(
            function (
                item
            ) {
                let noEsNodo = !item || typeof item !== 'object'

                if (
                    noEsNodo
                ) {
                    return
                }

                let {
                    start,
                    end
                } = item

                let rangoInvalido = typeof start !== 'number' || typeof end !== 'number' || end < start

                if (
                    rangoInvalido
                ) {
                    return
                }

                out.push(
                    {
                        start,
                        end
                    }
                )

            }
        )

        return out

    }

    function onlyWhitespaceOrCommas(
        text
    ) {
        return !/[^\s,]/.test(
            text
        )
    }

    function buildListReplacement(
        openToken,
        closeToken,
        items,
        openChar,
        closeChar
    ) {
        let indent = findLineIndentAt(
            openToken.start
        )

        let desiredIndent = `${indent}    `

        function getLeadingWhitespaceLength(
            line
        ) {
            let match = /^[ \t]*/.exec(
                line
            )

            let condicionTernario52802 = match
if (
    condicionTernario52802
) {
                return match[0].length
}
let condicionTernario52802Negada = !condicionTernario52802
if (
    condicionTernario52802Negada
) {
                return 0
}
        }

        function normalizeMultilineItemText(
            text
        ) {
            let parts = String(
                text
            ).split(
                /\r\n|\n|\r/
            )

            let hasSecondLine = parts.length > 1

            if (
                hasSecondLine
            ) {
                let tailLines = parts
                .slice(
                    1
                )
                .filter(
                    function (
                        line
                    ) {
                        return line.trim().length > 0
                    }
                )

                let minIndent = tailLines.reduce(
                    function (
                        acc,
                        line
                    ) {
                        let current = getLeadingWhitespaceLength(
                            line
                        )

                        let esMenor = current < acc

                        if (
                            esMenor
                        ) {
                            return current
                        }

                        return acc
                    },
                    Number.POSITIVE_INFINITY
                )

                let noHayMin = !Number.isFinite(
                    minIndent
                ) || minIndent === Number.POSITIVE_INFINITY

                if (
                    noHayMin
                ) {
                    minIndent = 0
                }

                parts = parts.map(
                    function (
                        line,
                        index
                    ) {
                        let isFirst = index === 0

                        if (
                            isFirst
                        ) {
                            return line.trimEnd()
                        }

                        let leading = getLeadingWhitespaceLength(
                            line
                        )

                        let cut = Math.min(
                            minIndent,
                            leading
                        )

                        return line.slice(
                            cut
                        ).trimEnd()
                    }
                )

                return parts.join(
                    eol
                )
            }

            return parts.map(
                function (
                    line
                ) {
                    return line.trimEnd()
                }
            ).join(
                eol
            )
        }

        function indentTextBlock(
            text
        ) {
            return String(
                text
            ).split(
                /\r\n|\n|\r/
            ).map(
                function (
                    line
                ) {
                    return `${desiredIndent}${line}`
                }
            ).join(
                eol
            )
        }

        function appendCommaToLastLine(
            text
        ) {
            let parts = String(
                text
            ).split(
                eol
            )

            let lastIndex = parts.length - 1

            return parts.map(
                function (
                    line,
                    index
                ) {
                    let esUltima = index === lastIndex

                    if (
                        esUltima
                    ) {
                        return `${line},`
                    }

                    return line
                }
            ).join(
                eol
            )
        }

        let lines = items.map(
            function (
                item,
                index
            ) {
                let text = sourceText.slice(
                    item.start,
                    item.end
                ).trim()

                let esUltimo = index === items.length - 1

                let debeTenerComa = !esUltimo

                let normalized = normalizeMultilineItemText(
                    text
                )

                let indented = indentTextBlock(
                    normalized
                )

                if (
                    debeTenerComa
                ) {
                    return appendCommaToLastLine(
                        indented
                    )
                }

                return indented
            }
        )

        let out = `${openChar}${eol}${lines.join(
            eol
        )}${eol}${indent}${closeChar}`

        return {
            start: openToken.start,
            end: closeToken.end,
            text: out
        }

    }

    let candidates = []

    function maybeAddList(
        fromPos,
        toPos,
        items,
        openChar,
        closeChar
    ) {
        let noHayItems = !Array.isArray(
            items
        ) || items.length === 0

        if (
            noHayItems
        ) {
            return
        }

        let openIndex = findOpenTokenIndex(
            fromPos,
            toPos,
            openChar
        )

        let openIndexInvalido = openIndex < 0

        if (
            openIndexInvalido
        ) {
            return
        }

        let closeIndex = findMatchingCloseTokenIndex(
            openIndex,
            toPos,
            openChar,
            closeChar
        )

        let closeIndexInvalido = closeIndex < 0

        if (
            closeIndexInvalido
        ) {
            return
        }

        let openToken = tokens[openIndex]
        let closeToken = tokens[closeIndex]

        let faltanTokens = !openToken || !closeToken

        if (
            faltanTokens
        ) {
            return
        }

        let first = items[0]
        let last = items[items.length - 1]

        let headBetween = sourceText.slice(
            openToken.end,
            first.start
        )

        let tailBetween = sourceText.slice(
            last.end,
            closeToken.start
        )

        let headInvalido = !/^\s*$/.test(
            headBetween
        )

        if (
            headInvalido
        ) {
            return
        }

        let tailInvalido = !onlyWhitespaceOrCommas(
            tailBetween
        )

        if (
            tailInvalido
        ) {
            return
        }

        function checkGaps(
            i
        ) {
            let seguir = i < items.length - 1

            if (
                seguir
            ) {
                let gap = sourceText.slice(
                    items[i].end,
                    items[i + 1].start
                )

                let gapInvalido = !onlyWhitespaceOrCommas(
                    gap
                )

                if (
                    gapInvalido
                ) {
                    return false
                }

                return checkGaps(
                    i + 1
                )
            }

            return true
        }

        let gapsValidos = checkGaps(
            0
        )

        let gapsInvalidos = !gapsValidos

        if (
            gapsInvalidos
        ) {
            return
        }

        candidates.push(
            buildListReplacement(
                openToken,
                closeToken,
                items,
                openChar,
                closeChar
            )
        )

    }

    function visit(
        node
    ) {
        let noEsNodo = !node || typeof node !== 'object'

        if (
            noEsNodo
        ) {
            return
        }

        let esArreglo = Array.isArray(
            node
        )

        if (
            esArreglo
        ) {
            node.forEach(
                function (
                    item
                ) {
                    visit(
                        item
                    )

                }
            )

            return
        }

        let nodeType
let condicionTernario60841 = typeof node.type === 'string'
if (
    condicionTernario60841
) {
            nodeType = node.type
}
let condicionTernario60841Negada = !condicionTernario60841
if (
    condicionTernario60841Negada
) {
            nodeType = ''
}

        let esCallExpression = nodeType === 'CallExpression'

        if (
            esCallExpression
        ) {
            let {
                callee
            } = node

            let fromPos
let condicionTernario61094 = typeof callee?.end === 'number'
if (
    condicionTernario61094
) {
                fromPos = callee.end
}
let condicionTernario61094Negada = !condicionTernario61094
if (
    condicionTernario61094Negada
) {
                fromPos = node.start
}

            let items = collectItemsFromNodeArray(
                node.arguments
            )

            maybeAddList(
                fromPos,
                node.end,
                items,
                '(',
                ')'
            )
        }

        let esNewExpression = nodeType === 'NewExpression'

        if (
            esNewExpression
        ) {
            let {
                callee
            } = node

            let fromPos
let condicionTernario61618 = typeof callee?.end === 'number'
if (
    condicionTernario61618
) {
                fromPos = callee.end
}
let condicionTernario61618Negada = !condicionTernario61618
if (
    condicionTernario61618Negada
) {
                fromPos = node.start
}

            let items = collectItemsFromNodeArray(
                node.arguments
            )

            let hayItems = items.length > 0

            if (
                hayItems
            ) {
                maybeAddList(
                    fromPos,
                    node.end,
                    items,
                    '(',
                    ')'
                )
            }
        }

        let esFunctionDeclaration = nodeType === 'FunctionDeclaration'
        let esFunctionExpression = nodeType === 'FunctionExpression'
        let esArrowFunctionExpression = nodeType === 'ArrowFunctionExpression'

        let esAlgunaFuncion = esFunctionDeclaration || esFunctionExpression || esArrowFunctionExpression

        if (
            esAlgunaFuncion
        ) {
            let items = collectItemsFromNodeArray(
                node.params
            )

            let bodyStart
let condicionTernario62586 = typeof node.body?.start === 'number'
if (
    condicionTernario62586
) {
                bodyStart = node.body.start
}
let condicionTernario62586Negada = !condicionTernario62586
if (
    condicionTernario62586Negada
) {
                bodyStart = node.end
}

            maybeAddList(
                node.start,
                bodyStart,
                items,
                '(',
                ')'
            )
        }

        let esArrayExpression = nodeType === 'ArrayExpression'

        if (
            esArrayExpression
        ) {
            let {
                elements
            } = node

            let tieneHuecos = Array.isArray(
                elements
            ) && elements.some(
                function (
                    el
                ) {
                    return el === null
                }
            )

            let noTieneHuecos = !tieneHuecos

            if (
                noTieneHuecos
            ) {
                let items = collectItemsFromNodeArray(
                    elements
                )

                maybeAddList(
                    node.start,
                    node.end,
                    items,
                    '[',
                    ']'
                )
            }
        }

        let esArrayPattern = nodeType === 'ArrayPattern'

        if (
            esArrayPattern
        ) {
            let items = collectItemsFromNodeArray(
                node.elements
            )

            maybeAddList(
                node.start,
                node.end,
                items,
                '[',
                ']'
            )
        }

        let esObjectExpression = nodeType === 'ObjectExpression'

        if (
            esObjectExpression
        ) {
            let items = collectItemsFromNodeArray(
                node.properties
            )

            maybeAddList(
                node.start,
                node.end,
                items,
                '{',
                '}'
            )
        }

        let esObjectPattern = nodeType === 'ObjectPattern'

        if (
            esObjectPattern
        ) {
            let items = collectItemsFromNodeArray(
                node.properties
            )

            maybeAddList(
                node.start,
                node.end,
                items,
                '{',
                '}'
            )
        }

        Object.entries(
            node
        ).forEach(
            function (
                pair
            ) {
                let childKey = pair[0]

                let esClaveIgnorable = childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end'

                if (
                    esClaveIgnorable
                ) {
                    return
                }

                visit(
                    pair[1]
                )

            }
        )

    }

    function runPass(
        pasada,
        currentText
    ) {
        let llegoAlMax = pasada >= maxPasadas

        if (
            llegoAlMax
        ) {
            return currentText
        }

        sourceText = currentText
        candidates = []

        let parsed = parseSourceMeriyah(
            parse,
            sourceText
        )

        ast = parsed.ast
        tokens = parsed.tokens

        eol = detectEol(
            sourceText
        )

        visit(
            ast
        )

        let reemplazos = candidates.filter(
            function (
                rep
            ) {
                return sourceText.slice(
                    rep.start,
                    rep.end
                ) !== rep.text
            }
        )

        let noHayReemplazos = reemplazos.length === 0

        if (
            noHayReemplazos
        ) {
            return currentText
        }

        let sorted = reemplazos
        .slice()
        .sort(
            function (
                a,
                b
            ) {
                return a.start - b.start
            }
        )

        let nonOverlapping = []

        sorted.forEach(
            function (
                rep
            ) {
                let ultimo = nonOverlapping[nonOverlapping.length - 1]

                let noHayUltimo = !ultimo

                if (
                    noHayUltimo
                ) {
                    nonOverlapping.push(
                        rep
                    )
                    return
                }

                let noSolapa = rep.start >= ultimo.end

                if (
                    noSolapa
                ) {
                    nonOverlapping.push(
                        rep
                    )
                    return
                }

                let lenUltimo = ultimo.end - ultimo.start
                let lenRep = rep.end - rep.start

                let repEsMasInterno = lenRep < lenUltimo

                if (
                    repEsMasInterno
                ) {
                    nonOverlapping[nonOverlapping.length - 1] = rep
                }
            }
        )

        let nextText = applyReplacements(
            sourceText,
            nonOverlapping
        )

        let noHuboCambios = nextText === sourceText

        if (
            noHuboCambios
        ) {
            return currentText
        }

        return runPass(
            pasada + 1,
            nextText
        )
    }

    fixedText = runPass(
        0,
        fixedText
    )

    return {
        fixedText
    }

}
