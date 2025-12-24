import { applyReplacements, isInsideAnySpan } from '../formatting.mjs'
import { addFindingAtLoc } from './meriyah_findings.mjs'
import { parseSourceMeriyah } from './meriyah_parse.mjs'

function collectEmptyStatementRangesMeriyah(
    ast
) {
    let ranges = []

    function visit(
        node,
        parent,
        key
    ) {
        let noEsNodo = !node || typeof node !== 'object'

        if (
            noEsNodo
        ) {
            return

        }

        let esListaDeNodos = Array.isArray(
            node
        )

        if (
            esListaDeNodos
        ) {
            node.forEach(
                function (
                    item
                ) {
                    visit(
                        item,
                        parent,
                        key
                    )

                }
            )

            return

        }

        let noTieneTipoValido = typeof node.type !== 'string'

        if (
            noTieneTipoValido
        ) {
            Object.values(
                node
            ).forEach(
                function (
                    child
                ) {
                    visit(
                        child,
                        node,
                        undefined
                    )

                }
            )

            return

        }

        let esEmptyStatementConRango =
        node.type === 'EmptyStatement' &&
        typeof node.start === 'number' &&
        typeof node.end === 'number' &&
        node.end > node.start

        if (
            esEmptyStatementConRango
        ) {
            ranges.push(
                {
                    start: node.start,
                    end: node.end
                }
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
                    pair[1],
                    node,
                    childKey
                )

            }
        )

    }

    visit(
        ast,
        null,
        undefined
    )

    return ranges

}

function collectForHeaderSpansFromMeriyahTokens(
    tokens
) {
    let spans = []

    function scanFrom(
        i
    ) {
        let excedeLongitudDeTokens = i >= tokens.length

        if (
            excedeLongitudDeTokens
        ) {
            return spans

        }

        let token = tokens[i]

        let noEsFor = !token || token.type !== 'Keyword' || token.text !== 'for'

        if (
            noEsFor
        ) {
            return scanFrom(
                i + 1
            )

        }

        let j = i + 1

        let hayAwait =
        tokens[j] && tokens[j].type === 'Keyword' && tokens[j].text === 'await'

        if (
            hayAwait
        ) {
            j += 1

        }

        let openParenToken = tokens[j]

        let noHayParentesisDeApertura =
        !openParenToken || openParenToken.type !== 'Punctuator' || openParenToken.text !== '('

        if (
            noHayParentesisDeApertura
        ) {
            return scanFrom(
                i + 1
            )

        }

        let {
            start
        } = openParenToken

        function scanParen(
            k,
            depth
        ) {
            let excedeLongitudDeTokens = k >= tokens.length

            if (
                excedeLongitudDeTokens
            ) {
                return scanFrom(
                    i + 1
                )

            }

            let token = tokens[k]

            let nextDepth = depth

            let abreParentesis = token.type === 'Punctuator' && token.text === '('

            if (
                abreParentesis
            ) {
                nextDepth += 1

            }

            let cierraParentesis = token.type === 'Punctuator' && token.text === ')'

            if (
                cierraParentesis
            ) {
                nextDepth -= 1

            }

            let terminaElEncabezado = token.type === 'Punctuator' && token.text === ')' && nextDepth === 0

            if (
                terminaElEncabezado
            ) {
                spans.push(
                    {
                        start,
                        end: token.end
                    }
                )

                return scanFrom(
                    k + 1
                )

            }

            return scanParen(
                k + 1,
                nextDepth
            )
        }

        return scanParen(
            j,
            0
        )

    }

    return scanFrom(
        0
    )

}

export function fixSemicolonsMeriyah(
    filePath,
    parse,
    sourceText
) {
    let {
        ast,
        tokens
    } = parseSourceMeriyah(
        parse,
        sourceText
    )

    let forHeaderSpans = collectForHeaderSpansFromMeriyahTokens(
        tokens
    )

    let emptyStatementRanges = collectEmptyStatementRangesMeriyah(
        ast
    )

    let emptyStartSet = new Set()

    emptyStatementRanges.forEach(
        function (
            r
        ) {
            emptyStartSet.add(
                r.start
            )

        }
    )

    let replacements = []

    emptyStatementRanges.forEach(
        function (
            range
        ) {
            replacements.push(
                {
                    start: range.start,
                    end: range.end,
                    text: '{}'
                }
            )

        }
    )

    let unfixableFindings = []

    tokens.forEach(
        function (
            t
        ) {
            let noEsPuntoYComa = t.text !== ';'

            if (
                noEsPuntoYComa
            ) {
                return

            }

            let esVacioDeSentencia = emptyStartSet.has(
                t.start
            )

            if (
                esVacioDeSentencia
            ) {
                return

            }

            let estaEnCabeceraDeFor = isInsideAnySpan(
                t.start,
                forHeaderSpans
            )

            if (
                estaEnCabeceraDeFor
            ) {
                addFindingAtLoc(
                    unfixableFindings,
                    filePath,
                    ';',
                    t.loc,
                    'formatear/no-semicolon'
                )

                return

            }

            replacements.push(
                {
                    start: t.start,
                    end: t.end,
                    text: '\n'
                }
            )

        }
    )

    let fixedText = applyReplacements(
        sourceText,
        replacements
    )

    return {
        fixedText,
        unfixableFindings
    }

}

