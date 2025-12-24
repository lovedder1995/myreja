import { applyReplacements } from '../formatting.mjs'
import { addFinding } from './meriyah_findings.mjs'
import { parseSourceMeriyah } from './meriyah_parse.mjs'

export function fixMissingBracesIfMeriyah(
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

    let replacements = []

    let unfixableFindings = []

    function wrapStatement(
        stmt
    ) {
        let noEsStmtValido = !stmt || typeof stmt !== 'object'

        if (
            noEsStmtValido
        ) {
            return

        }

        let esBloque = stmt.type === 'BlockStatement'

        if (
            esBloque
        ) {
            return

        }

        let rangoInvalido = typeof stmt.start !== 'number' || typeof stmt.end !== 'number' || stmt.end < stmt.start

        if (
            rangoInvalido
        ) {
            addFinding(
                unfixableFindings,
                filePath,
                '{',
                stmt,
                'formatear/require-braces'
            )

            return

        }

        replacements.push(
            {
                start: stmt.start,
                end: stmt.start,
                text: '{ '
            }
        )

        replacements.push(
            {
                start: stmt.end,
                end: stmt.end,
                text: ' }'
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

        let esIfStatement = node.type === 'IfStatement'

        if (
            esIfStatement
        ) {
            wrapStatement(
                node.consequent
            )

            let tieneAlternativa = Boolean(
                node.alternate
            )

            if (
                tieneAlternativa
            ) {
                wrapStatement(
                    node.alternate
                )

            }
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

