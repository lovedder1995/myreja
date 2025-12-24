// Normalizar indentación en if con condición de una sola variable
import { applyReplacements, detectEol } from '../formatting.mjs'

export function fixIfSingleVariableConditionIndent(
    sourceText
) {
    let noEsTexto = typeof sourceText !== 'string' || sourceText.length === 0

    if (
        noEsTexto
    ) {
        return sourceText

    }

    let eol = detectEol(
        sourceText
    )

    let replacements = []

    let singleLineRe = /(^[ \t]*)if[ \t]*\([ \t]*([A-Za-z_$][\w$]*)[ \t]*\)[ \t]*\{[ \t]*$/gm

    Array.from(
        sourceText.matchAll(
            singleLineRe
        )
    ).forEach(
        function (
            match
        ) {
            let {
                index
            } = match

            let tieneIndex = typeof index === 'number' && Number.isFinite(
                index
            )

            let noTieneIndex = !tieneIndex

            if (
                noTieneIndex
            ) {
                return

            }

            let indentIf = match[1]

            let condVar = match[2]

            let matchText = match[0]

            let tieneIndentIf = typeof indentIf === 'string'

            let tieneCondVar = typeof condVar === 'string' && condVar.length > 0

            let datosValidos = tieneIndentIf && tieneCondVar && typeof matchText === 'string'

            let datosInvalidos = !datosValidos

            if (
                datosInvalidos
            ) {
                return

            }

            let desiredIndent = `${indentIf}    `

            let repText = `${indentIf}if (${eol}${desiredIndent}${condVar}${eol}${indentIf}) {`

            replacements.push(
                {
                    start: index,
                    end: index + matchText.length,
                    text: repText
                }
            )

        }
    )

    let convertedText = applyReplacements(
        sourceText,
        replacements
    )

    let re = /(^[ \t]*)(if[ \t]*\([ \t]*)(\r\n|\n|\r)([ \t]*)([A-Za-z_$][\w$]*)[ \t]*(\r\n|\n|\r)([ \t]*\))/gm

    let matches = Array.from(
        convertedText.matchAll(
            re
        )
    )

    let noHayMatches = matches.length === 0

    if (
        noHayMatches
    ) {
        return convertedText

    }

    let indentReplacements = []

    matches.forEach(
        function (
            match
        ) {
            let {
                index
            } = match

            let tieneIndex = typeof index === 'number' && Number.isFinite(
                index
            )

            let noTieneIndex = !tieneIndex

            if (
                noTieneIndex
            ) {
                return

            }

            let indentIf = match[1]
            let beforeBreak = match[2]
            let lb = match[3]
            let indentCond = match[4]

            let tieneIndentIf = typeof indentIf === 'string'
            let tieneBeforeBreak = typeof beforeBreak === 'string'
            let tieneLb = typeof lb === 'string'
            let tieneIndentCond = typeof indentCond === 'string'

            let datosValidos = tieneIndentIf && tieneBeforeBreak && tieneLb && tieneIndentCond

            let datosInvalidos = !datosValidos

            if (
                datosInvalidos
            ) {
                return

            }

            let desiredIndent = `${indentIf}    `

            let yaEsDeseado = indentCond === desiredIndent

            if (
                yaEsDeseado
            ) {
                return

            }

            let indentStart = index + indentIf.length + beforeBreak.length + lb.length

            let indentEnd = indentStart + indentCond.length

            indentReplacements.push(
                {
                    start: indentStart,
                    end: indentEnd,
                    text: desiredIndent
                }
            )

        }
    )

    let fixedText = applyReplacements(
        convertedText,
        indentReplacements
    )

    return fixedText

}
