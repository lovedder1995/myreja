// Normalizar algunos formatos de comentarios
import { fixCommentsText } from '../formatting.mjs'
import { parseCommentsMeriyah } from '../utils/meriyah_parse.mjs'

export function fixCommentsMeriyah(
    _filePath,
    parse,
    sourceText
) {
    let parsed = parseCommentsMeriyah(
        parse,
        sourceText
    )

    let comments = []

    let hayParsedComments = Array.isArray(
        parsed.comments
    )

    if (
        hayParsedComments
    ) {
        comments = parsed.comments
    }

    let normalized = comments
    .filter(
        function (
            c
        ) {
            return (
            c &&
            typeof c === 'object' &&
            typeof c.start === 'number' &&
            typeof c.end === 'number' &&
            Number.isFinite(
                c.start
            ) &&
            Number.isFinite(
                c.end
            ) &&
            c.end > c.start
            )

        }
    )
    .map(
        function (
            c
        ) {
            return {
                start: c.start,
                end: c.end,
                type: c.type,
                value: c.value,
                text: sourceText.slice(
                    c.start,
                    c.end
                )
            }

        }
    )

    let fixedText = fixCommentsText(
        sourceText,
        normalized
    )

    return {
        fixedText
    }

}
