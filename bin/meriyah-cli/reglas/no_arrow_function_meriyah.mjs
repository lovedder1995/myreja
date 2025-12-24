import { applyReplacements } from '../formatting.mjs'
import { addFinding } from './meriyah_findings.mjs'
import { parseSourceMeriyah } from './meriyah_parse.mjs'

export function fixArrowFunctionsToFunctionsMeriyah(
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

    let replacements = []

    let unfixableFindings = []

    let arrowTokens = tokens.filter(
        function (
            t
        ) {
            return t.type === 'Punctuator' && t.text === '=>'

        }
    )

    function convertArrowFunction(
        node
    ) {
        let noEsNodo = !node || typeof node !== 'object'

        if (
            noEsNodo
        ) {
            return

        }

        let noEsArrowFunctionExpression = node.type !== 'ArrowFunctionExpression'

        if (
            noEsArrowFunctionExpression
        ) {
            return

        }

        let arrowToken = arrowTokens.find(
            function (
                t
            ) {
                return typeof t.start === 'number' && t.start >= node.start && t.end <= node.end

            }
        )

        let noHayArrowToken = !arrowToken

        if (
            noHayArrowToken
        ) {
            addFinding(
                unfixableFindings,
                filePath,
                '=>',
                node,
                'formatear/no-arrow-function'
            )

            return

        }

        let headText = sourceText.slice(
            node.start,
            arrowToken.start
        ).trimEnd()

        let esAsync = node.async === true

        if (
            esAsync
        ) {
            headText = headText.replace(
                /^\s*async\b\s*/,
                ''
            )

        }

        let paramsText = headText.trim()

        let paramsNoTieneParentesis = !paramsText.startsWith(
            '('
        )

        if (
            paramsNoTieneParentesis
        ) {
            paramsText = `(${paramsText})`

        }

        let functionPrefix = 'function '

        if (
            esAsync
        ) {
            functionPrefix = 'async function '
        }

        let bodyText

        let tieneBody = Boolean(
            node.body
        )
        let esBlockStatement = tieneBody && node.body.type === 'BlockStatement'

        if (
            esBlockStatement
        ) {
            bodyText = sourceText.slice(
                node.body.start,
                node.body.end
            )

        }

        let noHayBodyText = !bodyText
        let tieneRangoBody = tieneBody && typeof node.body.start === 'number' && typeof node.body.end === 'number'
        let debeGenerarBodyReturn = noHayBodyText && tieneRangoBody

        if (
            debeGenerarBodyReturn
        ) {
            let expressionText = sourceText.slice(
                node.body.start,
                node.body.end
            )

            bodyText = `{ return ${expressionText} }`

        }

        let sigueSinBodyText = !bodyText

        if (
            sigueSinBodyText
        ) {
            addFinding(
                unfixableFindings,
                filePath,
                '=>',
                node,
                'formatear/no-arrow-function'
            )

            return

        }

        replacements.push(
            {
                start: node.start,
                end: node.end,
                text: `${functionPrefix}${paramsText} ${bodyText}`
            }
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

        let noTieneTipo = typeof node.type !== 'string'

        if (
            noTieneTipo
        ) {
            Object.values(
                node
            ).forEach(
                function (
                    child
                ) {
                    visit(
                        child
                    )

                }
            )

            return

        }

        let esArrowFunctionExpression = node.type === 'ArrowFunctionExpression'

        if (
            esArrowFunctionExpression
        ) {
            convertArrowFunction(
                node
            )

        }

        Object.entries(
            node
        ).forEach(
            function (
                pair
            ) {
                let childKey = pair[0]

                let esClaveDeUbicacion = childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end'

                if (
                    esClaveDeUbicacion
                ) {
                    return

                }

                visit(
                    pair[1]
                )

            }
        )

    }

    visit(
        ast
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
