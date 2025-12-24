// No usar var ni const, usar let
import { applyReplacements } from '../formatting.mjs'
import { parseSourceMeriyah } from '../utils/meriyah_parse.mjs'

export function fixVarConstToLetMeriyah(
    filePath,
    parse,
    sourceText
) {
    let {
        tokens
    } = parseSourceMeriyah(
        parse,
        sourceText
    )

    let replacements = []

    tokens.forEach(
        function (
            t
        ) {
            let noEsKeyword = t.type !== 'Keyword'

            if (
                noEsKeyword
            ) {
                return

            }

            let esVar = t.text === 'var'
            let esConst = t.text === 'const'
            let noEsVarNiConst = !esVar && !esConst

            if (
                noEsVarNiConst
            ) {
                return

            }

            let rangoInvalido = typeof t.start !== 'number' || typeof t.end !== 'number' || t.end < t.start

            if (
                rangoInvalido
            ) {
                return

            }

            replacements.push(
                {
                    start: t.start,
                    end: t.end,
                    text: 'let'
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
        unfixableFindings: []
    }

}

