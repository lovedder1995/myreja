import { addFinding } from './meriyah_findings.mjs'
import { parseSourceMeriyah } from './meriyah_parse.mjs'

export function fixTernaryOperatorsMeriyah(
    filePath,
    parse,
    sourceText
) {
    let {
        ast
    } = parseSourceMeriyah(
        parse,
        sourceText
    )

    let unfixableFindings = []

    function visit(
        node
    ) {
        let noEsNodo = !node || typeof node !== 'object'

        if (
            noEsNodo
        ) {
            return

        }

        let esLista = Array.isArray(
            node
        )

        if (
            esLista
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

        let esConditionalExpression = node.type === 'ConditionalExpression'

        if (
            esConditionalExpression
        ) {
            addFinding(
                unfixableFindings,
                filePath,
                '?:',
                node,
                'formatear/no-ternary'
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

    return {
        fixedText: sourceText,
        unfixableFindings
    }

}

