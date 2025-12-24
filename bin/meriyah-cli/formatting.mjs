export function applyReplacements(
    sourceText,
    replacements
) {
    let noHayReemplazos = !replacements.length

    if (
        noHayReemplazos
    ) {
        return sourceText

    }

    let sorted = replacements
    .slice()
    .sort(
        function (
            a,
            b
        ) {
            return b.start - a.start

        }
    )
    .filter(
        function (
            rep
        ) {
            return (
            typeof rep?.start === 'number' &&
            typeof rep?.end === 'number' &&
            rep.start >= 0 &&
            rep.end >= rep.start &&
            typeof rep?.text === 'string'
            )

        }
    )

    let out = sourceText

    let lastStart = out.length + 1

    sorted.forEach(
        function (
            rep
        ) {
            let solapaConReemplazoPrevio = rep.end > lastStart

            if (
                solapaConReemplazoPrevio
            ) {
                return

            }

            out = out.slice(
                0,
                rep.start
            ) + rep.text + out.slice(
                rep.end
            )

            lastStart = rep.start

        }
    )

    return out

}

export function stripTrailingWhitespace(
    sourceText
) {
    let noEsTextoValido = typeof sourceText !== 'string' || sourceText.length === 0

    if (
        noEsTextoValido
    ) {
        return sourceText

    }

    let out = sourceText.replace(
        /[ \t]+(?=\r?\n)/g,
        ''
    )

    out = out.replace(
        /[ \t]+(?=\r)/g,
        ''
    )

    out = out.replace(
        /[ \t]+$/g,
        ''
    )

    return out

}

export function convertTabsToFourSpacesOutsideTokens(
    sourceText,
    spans
) {
    let noEsTextoValido = typeof sourceText !== 'string' || sourceText.length === 0

    if (
        noEsTextoValido
    ) {
        return sourceText

    }

    let noHayTabs = !sourceText.includes(
        '\t'
    )

    if (
        noHayTabs
    ) {
        return sourceText

    }

    let noHayTramos = !Array.isArray(
        spans
    ) || spans.length === 0

    if (
        noHayTramos
    ) {
        return sourceText.replace(
            /\t/g,
            '    '
        )

    }

    let len = sourceText.length

    let sorted = spans
    .slice()
    .filter(
        function (
            span
        ) {
            return (
            span &&
            typeof span.start === 'number' &&
            typeof span.end === 'number' &&
            Number.isFinite(
                span.start
            ) &&
            Number.isFinite(
                span.end
            )
            )

        }
    )
    .map(
        function (
            span
        ) {
            let start = Math.max(
                0,
                Math.min(
                    len,
                    span.start
                )
            )

            let end = Math.max(
                start,
                Math.min(
                    len,
                    span.end
                )
            )

            return {
                start,
                end
            }

        }
    )
    .sort(
        function (
            a,
            b
        ) {
            return a.start - b.start

        }
    )

    let merged = []

    sorted.forEach(
        function (
            span
        ) {
            let noHayTramosAcumulados = merged.length === 0

            if (
                noHayTramosAcumulados
            ) {
                merged.push(
                    span
                )

                return

            }

            let last = merged[merged.length - 1]

            let empiezaDespuesDelFinal = span.start > last.end

            if (
                empiezaDespuesDelFinal
            ) {
                merged.push(
                    span
                )

                return

            }

            let extiendeElFinal = span.end > last.end

            if (
                extiendeElFinal
            ) {
                last.end = span.end

            }
        }
    )

    let out = ''

    let cursor = 0

    merged.forEach(
        function (
            span
        ) {
            let hayTextoAntesDelTramo = span.start > cursor

            if (
                hayTextoAntesDelTramo
            ) {
                out += sourceText.slice(
                    cursor,
                    span.start
                ).replace(
                    /\t/g,
                    '    '
                )

            }

            out += sourceText.slice(
                span.start,
                span.end
            )

            cursor = span.end

        }
    )

    let quedaTextoPorProcesar = cursor < len

    if (
        quedaTextoPorProcesar
    ) {
        out += sourceText.slice(
            cursor
        ).replace(
            /\t/g,
            '    '
        )

    }

    return out

}

export function mergeSpans(
    spans,
    len
) {
    let noHayTramos = !Array.isArray(
        spans
    ) || spans.length === 0

    if (
        noHayTramos
    ) {
        return []

    }

    let sorted = spans
    .slice()
    .filter(
        function (
            span
        ) {
            return (
            span &&
            typeof span.start === 'number' &&
            typeof span.end === 'number' &&
            Number.isFinite(
                span.start
            ) &&
            Number.isFinite(
                span.end
            )
            )

        }
    )
    .map(
        function (
            span
        ) {
            let start = Math.max(
                0,
                Math.min(
                    len,
                    span.start
                )
            )

            let end = Math.max(
                start,
                Math.min(
                    len,
                    span.end
                )
            )

            return {
                start,
                end
            }

        }
    )
    .sort(
        function (
            a,
            b
        ) {
            return a.start - b.start

        }
    )

    let merged = []

    sorted.forEach(
        function (
            span
        ) {
            let noHayTramosAcumulados = merged.length === 0

            if (
                noHayTramosAcumulados
            ) {
                merged.push(
                    span
                )

                return

            }

            let last = merged[merged.length - 1]

            let empiezaDespuesDelFinal = span.start > last.end

            if (
                empiezaDespuesDelFinal
            ) {
                merged.push(
                    span
                )

                return

            }

            let extiendeElFinal = span.end > last.end

            if (
                extiendeElFinal
            ) {
                last.end = span.end

            }
        }
    )

    return merged

}

function isInsideMergedSpans(
    index,
    merged
) {
    function search(
        lo,
        hi
    ) {
        let rangoVacio = lo > hi

        if (
            rangoVacio
        ) {
            return false

        }

        let mid = (lo + hi) >> 1

        let span = merged[mid]

        let estaAntesDelTramo = index < span.start

        if (
            estaAntesDelTramo
        ) {
            return search(
                lo,
                mid - 1
            )

        }

        let estaDespuesDelTramo = index >= span.end

        if (
            estaDespuesDelTramo
        ) {
            return search(
                mid + 1,
                hi
            )

        }

        return true

    }

    return search(
        0,
        merged.length - 1
    )

}

export function reindentFourSpacesOutsideTokens(
    sourceText,
    tokenSpans,
    braceEvents
) {
    let noEsTextoValido = typeof sourceText !== 'string' || sourceText.length === 0

    if (
        noEsTextoValido
    ) {
        return sourceText

    }

    let len = sourceText.length

    let mergedTokenSpans = mergeSpans(
        tokenSpans,
        len
    )

    let events = []
    let braceEventsEsLista = Array.isArray(
        braceEvents
    )

    if (
        braceEventsEsLista
    ) {
        events = braceEvents
        .slice()
        .filter(
            function (
                e
            ) {
                return e && typeof e.pos === 'number' && Number.isFinite(
                    e.pos
                ) && (e.delta === 1 || e.delta === -1)

            }
        )
        .map(
            function (
                e
            ) {
                let pos = Math.max(
                    0,
                    Math.min(
                        len,
                        e.pos
                    )
                )

                return {
                    pos,
                    delta: e.delta
                }

            }
        )
        .sort(
            function (
                a,
                b
            ) {
                return a.pos - b.pos

            }
        )

    }

    let out = ''

    let eventPos = []

    let eventPrefix = []

    events.forEach(
        function (
            e,
            index
        ) {
            eventPos.push(
                e.pos
            )

            let esPrimerEvento = index === 0

            if (
                esPrimerEvento
            ) {
                eventPrefix.push(
                    e.delta
                )

                return

            }

            eventPrefix.push(
                eventPrefix[index - 1] + e.delta
            )

        }
    )

    function upperBound(
        arr,
        value
    ) {
        function search(
            lo,
            hi
        ) {
            let rangoVacio = lo > hi

            if (
                rangoVacio
            ) {
                return lo

            }

            let mid = (lo + hi) >> 1

            let estaPorDebajoDelValor = arr[mid] < value

            if (
                estaPorDebajoDelValor
            ) {
                return search(
                    mid + 1,
                    hi
                )

            }

            return search(
                lo,
                mid - 1
            )

        }

        return search(
            0,
            arr.length - 1
        )

    }

    function depthAtPos(
        pos
    ) {
        let noHayEventos = eventPos.length === 0

        if (
            noHayEventos
        ) {
            return 0

        }

        let idx = upperBound(
            eventPos,
            pos
        )

        let noHayEventoAnterior = idx <= 0

        if (
            noHayEventoAnterior
        ) {
            return 0

        }

        let depth = eventPrefix[idx - 1]

        let profundidadNegativa = depth < 0

        if (
            profundidadNegativa
        ) {
            return 0

        }

        return depth

    }

    function splitLineSegment(
        segment
    ) {
        let terminaConCrLf = segment.endsWith(
            '\r\n'
        )

        if (
            terminaConCrLf
        ) {
            return {
                lineText: segment.slice(
                    0,
                    -2
                ),
                lineBreak: '\r\n'
            }

        }

        let terminaConLf = segment.endsWith(
            '\n'
        )

        if (
            terminaConLf
        ) {
            return {
                lineText: segment.slice(
                    0,
                    -1
                ),
                lineBreak: '\n'
            }

        }

        let terminaConCr = segment.endsWith(
            '\r'
        )

        if (
            terminaConCr
        ) {
            return {
                lineText: segment.slice(
                    0,
                    -1
                ),
                lineBreak: '\r'
            }

        }

        return {
            lineText: segment,
            lineBreak: ''
        }

    }

    let segments = sourceText.match(
        /[^\r\n]*(?:\r\n|\r|\n|$)/g
    ) || []

    let cursor = 0

    let previousWasBlankLineOutsideTokens = false

    segments.forEach(
        function (
            segment
        ) {
            let noHaySegmento = !segment

            if (
                noHaySegmento
            ) {
                return

            }

            let parts = splitLineSegment(
                segment
            )

            let {
                lineText,
                lineBreak
            } = parts

            let lineStart = cursor

            cursor += segment.length

            let estaDentroDeTramosToken = isInsideMergedSpans(
                lineStart,
                mergedTokenSpans
            )

            let esLineaVacia = lineText.trim().length === 0

            if (
                esLineaVacia
            ) {
                if (
                    estaDentroDeTramosToken
                ) {
                    out += lineText + lineBreak

                    previousWasBlankLineOutsideTokens = false

                    return

                }

                if (
                    previousWasBlankLineOutsideTokens
                ) {
                    return

                }

                out += lineBreak

                previousWasBlankLineOutsideTokens = true

                return

            }

            if (
                estaDentroDeTramosToken
            ) {
                out += lineText + lineBreak

                previousWasBlankLineOutsideTokens = false

                return

            }

            let content = lineText.replace(
                /^[ \t]+/,
                ''
            )

            let noHayContenido = content.length === 0

            if (
                noHayContenido
            ) {
                out += lineBreak

                previousWasBlankLineOutsideTokens = false

                return

            }

            let depth = depthAtPos(
                lineStart
            )

            let closeMatch = content.match(
                /^}+/
            )

            let leadingCloseCount = 0
            let hayLlavesDeCierre = Boolean(
                closeMatch
            )

            if (
                hayLlavesDeCierre
            ) {
                leadingCloseCount = closeMatch[0].length

            }

            let indentLevel = depth - leadingCloseCount

            let nivelDeSangriaNegativo = indentLevel < 0

            if (
                nivelDeSangriaNegativo
            ) {
                indentLevel = 0

            }

            out += ' '.repeat(
                indentLevel * 4
            ) + content + lineBreak

            previousWasBlankLineOutsideTokens = false

        }
    )

    return out

}

export function isInsideAnySpan(
    index,
    spans
) {
    return spans.some(
        function (
            span
        ) {
            return index >= span.start && index < span.end

        }
    )

}

export function detectEol(
    sourceText
) {
    let hayCrLf = sourceText.includes(
        '\r\n'
    )

    if (
        hayCrLf
    ) {
        return '\r\n'

    }

    let hayLf = sourceText.includes(
        '\n'
    )

    if (
        hayLf
    ) {
        return '\n'

    }

    let hayCr = sourceText.includes(
        '\r'
    )

    if (
        hayCr
    ) {
        return '\r'

    }

    return '\n'

}

export function findLineStartIndex(
    sourceText,
    index
) {
    let len = sourceText.length

    let i = Math.max(
        0,
        Math.min(
            len,
            index
        )
    )

    let searchFrom = i - 1

    let lastNl = sourceText.lastIndexOf(
        '\n',
        searchFrom
    )

    let lastCr = sourceText.lastIndexOf(
        '\r',
        searchFrom
    )

    let lastBreak = Math.max(
        lastNl,
        lastCr
    )

    let noHayBreak = lastBreak < 0

    if (
        noHayBreak
    ) {
        return 0

    }

    return lastBreak + 1

}

export function findLineEndIndex(
    sourceText,
    index
) {
    let len = sourceText.length

    let i = Math.max(
        0,
        Math.min(
            len,
            index
        )
    )

    let nextNl = sourceText.indexOf(
        '\n',
        i
    )

    let nextCr = sourceText.indexOf(
        '\r',
        i
    )

    let hayNl = nextNl >= 0

    let hayCr = nextCr >= 0

    let hayAmbos = hayNl && hayCr

    if (
        hayAmbos
    ) {
        return Math.min(
            nextNl,
            nextCr
        )

    }

    if (
        hayNl
    ) {
        return nextNl

    }

    if (
        hayCr
    ) {
        return nextCr

    }

    return len

}

export function findLineIndent(
    sourceText,
    lineStartIndex,
    lineEndIndex
) {
    let lineText = sourceText.slice(
        lineStartIndex,
        lineEndIndex
    )

    let match = /^[ \t]*/.exec(
        lineText
    )

    let tieneMatch = Boolean(
        match
    )

    if (
        tieneMatch
    ) {
        return match[0]

    }

    return ''

}

export function normalizeLineCommentValue(
    value
) {
    let str = ''
    let valueEsString = typeof value === 'string'

    if (
        valueEsString
    ) {
        str = value

    }

    str = str.replace(
        /[ \t]+$/g,
        ''
    )

    let esVacio = str.length === 0

    if (
        esVacio
    ) {
        return ''

    }

    let empiezaConEspacio = str.startsWith(
        ' '
    )

    if (
        empiezaConEspacio
    ) {
        return str

    }

    return ` ${str}`

}

export function buildLineCommentBlockFromValue(
    value,
    indent,
    eol,
    omitFirstIndent
) {
    let raw = ''
    let valueEsString = typeof value === 'string'

    if (
        valueEsString
    ) {
        raw = value

    }

    let lines = raw.split(
        /\r\n|\r|\n/
    )

    let out = []

    lines.forEach(
        function (
            line,
            index
        ) {
            let esPrimera = index === 0

            let debeOmitir = esPrimera && omitFirstIndent

            let prefix = indent

            if (
                debeOmitir
            ) {
                prefix = ''

            }

            out.push(
                `${prefix}//${normalizeLineCommentValue(
                    line
                )}`
            )

        }
    )

    return out.join(
        eol
    )

}

export function fixCommentsText(
    sourceText,
    comments
) {
    let eol = detectEol(
        sourceText
    )

    let replacements = []

    comments.forEach(
        function (
            comment
        ) {
            let start = comment?.start

            let end = comment?.end

            let startEsNumero = typeof start === 'number'

            let endEsNumero = typeof end === 'number'

            let startEsFinito = startEsNumero && Number.isFinite(
                start
            )

            let endEsFinito = endEsNumero && Number.isFinite(
                end
            )

            let hayRango = startEsFinito && endEsFinito

            let rangoDesordenado = hayRango && end <= start

            let rangoInvalido = !hayRango || rangoDesordenado

            if (
                rangoInvalido
            ) {
                return

            }

            let startLineStart = findLineStartIndex(
                sourceText,
                start
            )

            let startLineEnd = findLineEndIndex(
                sourceText,
                start
            )

            let endLineEnd = findLineEndIndex(
                sourceText,
                end
            )

            let indent = findLineIndent(
                sourceText,
                startLineStart,
                startLineEnd
            )

            let prefix = sourceText.slice(
                startLineStart,
                start
            )

            let suffix = sourceText.slice(
                end,
                endLineEnd
            )

            let hayCodigoAntes = /\S/.test(
                prefix
            )

            let hayCodigoDespues = /\S/.test(
                suffix
            )

            let rawText = sourceText.slice(
                start,
                end
            )

            let tieneTexto = typeof comment.text === 'string' && comment.text.length > 0

            if (
                tieneTexto
            ) {
                rawText = comment.text

            }

            let esMultiLine = comment.type === 'MultiLine'

            let esBloquePorTexto = rawText.startsWith(
                '/*'
            )

            let esComentarioDeBloque = esMultiLine || esBloquePorTexto

            let value = ''

            let tieneValue = typeof comment.value === 'string'

            if (
                tieneValue
            ) {
                value = comment.value

            }

            let debeDerivarValue = !tieneValue

            if (
                debeDerivarValue
            ) {
                let esBloqueCerrado = rawText.startsWith(
                    '/*'
                ) && rawText.endsWith(
                    '*/'
                )

                if (
                    esBloqueCerrado
                ) {
                    value = rawText.slice(
                        2,
                        -2
                    )

                }

                let noEsBloqueCerrado = !esBloqueCerrado

                if (
                    noEsBloqueCerrado
                ) {
                    let esLinea = rawText.startsWith(
                        '//'
                    )

                    if (
                        esLinea
                    ) {
                        value = rawText.slice(
                            2
                        )

                    }
                }
            }

            let esMultilinea = /[\r\n]/.test(
                rawText
            )

            if (
                esMultilinea
            ) {
                let comparteLineaConCodigo = hayCodigoAntes || hayCodigoDespues

                if (
                    comparteLineaConCodigo
                ) {
                    return

                }

                if (
                    esComentarioDeBloque
                ) {
                    let repText = buildLineCommentBlockFromValue(
                        value,
                        indent,
                        eol,
                        true
                    )

                    replacements.push(
                        {
                            start,
                            end,
                            text: repText
                        }
                    )

                }

                return

            }

            let comentarioAlFinalDeLinea = hayCodigoAntes && !hayCodigoDespues

            if (
                comentarioAlFinalDeLinea
            ) {
                let matchTrailing = /[ \t]*$/.exec(
                    prefix
                )

                let trailingWs = ''

                let tieneTrailing = Boolean(
                    matchTrailing
                )

                if (
                    tieneTrailing
                ) {
                    trailingWs = matchTrailing[0]

                }

                let wsStart = start - trailingWs.length

                let repText = `${eol}${indent}//${normalizeLineCommentValue(
                    value
                )}`

                if (
                    esComentarioDeBloque
                ) {
                    repText = `${eol}${buildLineCommentBlockFromValue(
                        value,
                        indent,
                        eol,
                        false
                    )}`

                }

                replacements.push(
                    {
                        start: wsStart,
                        end: startLineEnd,
                        text: repText
                    }
                )

                return

            }

            let comentarioDeBloqueConCodigoDespues = esComentarioDeBloque && !hayCodigoAntes && hayCodigoDespues

            if (
                comentarioDeBloqueConCodigoDespues
            ) {
                let between = sourceText.slice(
                    end,
                    startLineEnd
                )

                let matchLeading = /^[ \t]*/.exec(
                    between
                )

                let leadingWs = ''

                let tieneLeading = Boolean(
                    matchLeading
                )

                if (
                    tieneLeading
                ) {
                    leadingWs = matchLeading[0]

                }

                let afterNonWs = end + leadingWs.length

                let repText = buildLineCommentBlockFromValue(
                    value,
                    indent,
                    eol,
                    true
                )

                replacements.push(
                    {
                        start,
                        end,
                        text: repText
                    }
                )

                replacements.push(
                    {
                        start: end,
                        end: afterNonWs,
                        text: `${eol}${indent}`
                    }
                )

                return

            }

            let comentarioSoloEnLinea = !hayCodigoAntes && !hayCodigoDespues

            if (
                comentarioSoloEnLinea
            ) {
                if (
                    esComentarioDeBloque
                ) {
                    let repText = buildLineCommentBlockFromValue(
                        value,
                        indent,
                        eol,
                        true
                    )

                    replacements.push(
                        {
                            start,
                            end,
                            text: repText
                        }
                    )

                }

                return

            }
        }
    )

    let fixedText = applyReplacements(
        sourceText,
        replacements
    )

    return fixedText

}
