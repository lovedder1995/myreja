#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import {
    convertTabsToFourSpacesOutsideTokens,
    fixCommentsText,
    reindentFourSpacesOutsideTokens,
    stripTrailingWhitespace,
} from './meriyah-cli/formatting.mjs'
import { collectFiles, importMeriyah, isPathLike, loadForbiddenWords, printHelp } from './meriyah-cli/shared.mjs'
import { fixCommentsMeriyah } from './meriyah-cli/reglas/comments_meriyah.mjs'
import { collectConditionSingleVariableFindingsMeriyah } from './meriyah-cli/reglas/condition_single_variable_meriyah.mjs'
import { collectForbiddenFindingsMeriyah } from './meriyah-cli/reglas/forbidden_words_meriyah.mjs'
import { fixFunctionArgumentsLayoutMeriyah } from './meriyah-cli/reglas/function_args_layout_meriyah.mjs'
import { fixIfSingleVariableConditionIndent } from './meriyah-cli/reglas/if_single_variable_indent_meriyah.mjs'
import { parseSourceMeriyah } from './meriyah-cli/utils/meriyah_parse.mjs'
import { fixArrowFunctionsToFunctionsMeriyah } from './meriyah-cli/reglas/no_arrow_function_meriyah.mjs'
import { fixSemicolonsMeriyah } from './meriyah-cli/reglas/no_semicolon_meriyah.mjs'
import { fixTernaryOperatorsMeriyah } from './meriyah-cli/reglas/no_ternary_meriyah.mjs'
import { fixVarConstToLetMeriyah } from './meriyah-cli/reglas/no_var_const_meriyah.mjs'
import { fixMissingBracesIfMeriyah } from './meriyah-cli/reglas/require_braces_meriyah.mjs'

function parseAutocorregibleFromFirstLine(
    firstLine
) {
    let esComentario = typeof firstLine === 'string' && firstLine.startsWith(
        '//'
    )

    let noEsComentario = !esComentario

    if (
        noEsComentario
    ) {
        return undefined

    }

    let match = /autocorregible\s*:\s*(si|sí|no|a_veces|a veces|sometimes)/i.exec(
        firstLine
    )

    let noHayMatch = !match

    if (
        noHayMatch
    ) {
        return undefined

    }

    let raw = String(
        match[1] || ''
    )
    .trim()
    .toLowerCase()

    let rawEsSi = raw === 'si' || raw === 'sí'

    if (
        rawEsSi
    ) {
        return true

    }

    let rawEsNo = raw === 'no'

    if (
        rawEsNo
    ) {
        return false

    }

    return 'a_veces'
}

function inferAutocorregibleFromContent(
    content
) {
    let tieneFixExport = /export\s+(?:async\s+)?function\s+fix/i.test(
        content
    )

    if (
        tieneFixExport
    ) {
        return true

    }

    return false
}

function getAutocorregibleLabel(
    autocorregible
) {
    let esAutocorregibleSi = autocorregible === true

    if (
        esAutocorregibleSi
    ) {
        return 'Lo puede corregir el formateador'

    }

    let esAutocorregibleNo = autocorregible === false

    if (
        esAutocorregibleNo
    ) {
        return 'No lo puede corregir el formateador'

    }

    return 'A veces lo puede corregir el formateador'
}

async function getReglas() {
    let reglasDir = new URL(
        './meriyah-cli/reglas/',
        import.meta.url
    )
    let files = await fs.readdir(
        reglasDir
    )

    let reglasPromises = files.map(
        async function (
            file
        ) {
            let noEsMjs = !file.endsWith(
                '.mjs'
            )

            if (
                noEsMjs
            ) {
                return null
            }

            let filePath = new URL(
                file,
                reglasDir
            )
            let content = await fs.readFile(
                filePath,
                'utf8'
            )

            let lines = content.split(
                '\n'
            )
            let firstLine = lines[0].trim()

            let descripcion = 'Sin descripción'
            let tieneComentario = firstLine.startsWith(
                '//'
            )

            if (
                tieneComentario
            ) {
                descripcion = firstLine.replace(
                    /^\/\/\s*/,
                    ''
                ).trim()
            }

            let autocorregible = parseAutocorregibleFromFirstLine(
                firstLine
            )

            let noHayOverrideDeAutocorregible = typeof autocorregible === 'undefined'

            if (
                noHayOverrideDeAutocorregible
            ) {
                autocorregible = inferAutocorregibleFromContent(
                    content
                )

            }

            let id = 'formatear/' + file.replace(
                '_meriyah.mjs',
                ''
            ).replace(
                /_/g,
                '-'
            )

            return {
                id: id,
                descripcion: descripcion,
                autocorregible: autocorregible
            }

        }
    )

    let reglasConNulos = await Promise.all(
        reglasPromises
    )

    let reglas = reglasConNulos.filter(
        function (
            r
        ) {
            return r !== null
        }
    )

    return reglas
}

async function printReglas() {
    let reglas = await getReglas()
    reglas = reglas.slice().sort(
        function (
            a,
            b
        ) {
            return a.id.localeCompare(
                b.id
            )

        }
    )

    process.stdout.write(
        'Reglas disponibles:\n\n'
    )

    reglas.forEach(
        function (
            regla
        ) {
            let autocorregibleLabel = getAutocorregibleLabel(
                regla.autocorregible
            )

            process.stdout.write(
                `${regla.id}\n`
            )

            process.stdout.write(
                `  Autocorrección: ${autocorregibleLabel}\n`
            )

            process.stdout.write(
                `  Descripción: ${regla.descripcion}\n\n`
            )

        }
    )
}

async function run(
    argv
) {
    let pidioAyuda = argv.includes(
        '--help'
    ) || argv.includes(
        '-h'
    )

    if (
        pidioAyuda
    ) {
        printHelp()

        return 0

    }

    let pidioReglas = argv.includes(
        '--reglas'
    )

    if (
        pidioReglas
    ) {
        await printReglas()

        return 0

    }

    let formatearIndex = argv.indexOf(
        '--formatear'
    )

    let faltaFlagFormatear = formatearIndex === -1

    if (
        faltaFlagFormatear
    ) {
        printHelp()

        return 2

    }

    let inputPaths = argv.slice(
        formatearIndex + 1
    ).filter(
        isPathLike
    )

    let noHayRutasDeEntrada = inputPaths.length === 0

    if (
        noHayRutasDeEntrada
    ) {
        printHelp()

        return 2

    }

    let fileSet = new Set()

    await Promise.all(
        inputPaths.map(
            async function (
                inputPath
            ) {
                await collectFiles(
                    inputPath,
                    fileSet
                )

            }
        )
    )

    let files = Array.from(
        fileSet
    ).sort(
        function (
            a,
            b
        ) {
            return a.localeCompare(
                b
            )

        }
    )

    let noHayArchivos = files.length === 0

    if (
        noHayArchivos
    ) {
        process.stderr.write(
            'No se encontraron archivos para analizar.\n'
        )

        return 2

    }

    let forbiddenWords = await loadForbiddenWords()

    let parseErrorCount = 0

    let issueCount = 0

    let parse

    try {
        let meriyahModule = await importMeriyah()

        parse = meriyahModule.parse

    } catch (error) {
        let message = String(
            error
        )

        let esError = error instanceof Error

        if (
            esError
        ) {
            message = error.message
        }

        process.stderr.write(
            `${message}\n`
        )

        return 2

    }

    function normalize(
        value
    ) {
        let str = String(
            value
        )

        return Array.from(
            str
        )
        .filter(
            function (
                ch
            ) {
                let code = ch.charCodeAt(
                    0
                )

                return !(code <= 31 || code === 127)

            }
        )
        .join(
            ''
        )

    }

    async function analyzeOne(
        inputFilePath
    ) {
        try {
            let findings
            let conditionFindings = []

            let noEsTsFile = true

            if (
                noEsTsFile
            ) {
                let sourceText = await fs.readFile(
                    inputFilePath,
                    'utf8'
                )

                let parsedForTabs = parseSourceMeriyah(
                    parse,
                    sourceText
                )

                let tabFixedText = convertTabsToFourSpacesOutsideTokens(
                    sourceText,
                    parsedForTabs.tokens.map(
                        function (
                            t
                        ) {
                            return {
                                start: t.start,
                                end: t.end
                            }

                        }
                    )
                )

                let huboCambiosDeTabs = tabFixedText !== sourceText

                if (
                    huboCambiosDeTabs
                ) {
                    await fs.writeFile(
                        inputFilePath,
                        tabFixedText,
                        'utf8'
                    )

                    sourceText = tabFixedText

                }

                let fixed = fixSemicolonsMeriyah(
                    inputFilePath,
                    parse,
                    sourceText
                )

                let huboCambiosDePuntoYComa = fixed.fixedText !== sourceText

                if (
                    huboCambiosDePuntoYComa
                ) {
                    await fs.writeFile(
                        inputFilePath,
                        fixed.fixedText,
                        'utf8'
                    )

                    sourceText = fixed.fixedText

                }

                fixed.unfixableFindings.forEach(
                    function (
                        finding
                    ) {
                        issueCount += 1

                        let normalizedFilePath = normalize(
                            finding.filePath
                        )

                        process.stdout.write(
                            `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente ';' en la cabecera de un for  formatear/no-semicolon\n`
                        )

                    }
                )

                let varConstFixed = fixVarConstToLetMeriyah(
                    inputFilePath,
                    parse,
                    sourceText
                )

                let huboCambiosVarConst = varConstFixed.fixedText !== sourceText

                if (
                    huboCambiosVarConst
                ) {
                    await fs.writeFile(
                        inputFilePath,
                        varConstFixed.fixedText,
                        'utf8'
                    )

                    sourceText = varConstFixed.fixedText

                }

                let arrowFixed = fixArrowFunctionsToFunctionsMeriyah(
                    inputFilePath,
                    parse,
                    sourceText
                )

                let huboCambiosDeArrows = arrowFixed.fixedText !== sourceText

                if (
                    huboCambiosDeArrows
                ) {
                    await fs.writeFile(
                        inputFilePath,
                        arrowFixed.fixedText,
                        'utf8'
                    )

                    sourceText = arrowFixed.fixedText

                }

                arrowFixed.unfixableFindings.forEach(
                    function (
                        finding
                    ) {
                        issueCount += 1

                        let normalizedFilePath = normalize(
                            finding.filePath
                        )

                        process.stdout.write(
                            `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente una función de flecha  formatear/no-arrow-function\n`
                        )

                    }
                )

                let bracesFixed = fixMissingBracesIfMeriyah(
                    inputFilePath,
                    parse,
                    sourceText
                )

                let huboCambiosDeLlaves = bracesFixed.fixedText !== sourceText

                if (
                    huboCambiosDeLlaves
                ) {
                    await fs.writeFile(
                        inputFilePath,
                        bracesFixed.fixedText,
                        'utf8'
                    )

                    sourceText = bracesFixed.fixedText

                }

                bracesFixed.unfixableFindings.forEach(
                    function (
                        finding
                    ) {
                        issueCount += 1

                        let normalizedFilePath = normalize(
                            finding.filePath
                        )

                        process.stdout.write(
                            `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente el uso de llaves en un if  formatear/require-braces\n`
                        )

                    }
                )

                let ternaryFixed = fixTernaryOperatorsMeriyah(
                    inputFilePath,
                    parse,
                    sourceText
                )

                let huboCambiosDeTernarios = ternaryFixed.fixedText !== sourceText

                if (
                    huboCambiosDeTernarios
                ) {
                    await fs.writeFile(
                        inputFilePath,
                        ternaryFixed.fixedText,
                        'utf8'
                    )

                    sourceText = ternaryFixed.fixedText

                }

                ternaryFixed.unfixableFindings.forEach(
                    function (
                        finding
                    ) {
                        issueCount += 1

                        let normalizedFilePath = normalize(
                            finding.filePath
                        )

                        process.stdout.write(
                            `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se debe usar el operador ternario  formatear/no-ternary\n`
                        )

                    }
                )

                let commentsFixed = fixCommentsMeriyah(
                    inputFilePath,
                    parse,
                    sourceText
                )

                let huboCambiosDeComentarios = commentsFixed.fixedText !== sourceText

                if (
                    huboCambiosDeComentarios
                ) {
                    await fs.writeFile(
                        inputFilePath,
                        commentsFixed.fixedText,
                        'utf8'
                    )

                    sourceText = commentsFixed.fixedText

                }

                let parsedForIndent = parseSourceMeriyah(
                    parse,
                    sourceText
                )

                let reindentedText = reindentFourSpacesOutsideTokens(
                    sourceText,
                    parsedForIndent.tokens.map(
                        function (
                            t
                        ) {
                            return {
                                start: t.start,
                                end: t.end
                            }

                        }
                    ),
                    parsedForIndent.tokens
                    .filter(
                        function (
                            t
                        ) {
                            return t.text === '{' || t.text === '}'

                        }
                    )
                    .map(
                        function (
                            t
                        ) {
                            let delta = -1
                            let esApertura = t.text === '{'

                            if (
                                esApertura
                            ) {
                                delta = 1

                            }

                            return {
                                pos: t.start,
                                delta
                            }

                        }
                    )
                )

                let huboCambiosDeIndentacion = reindentedText !== sourceText

                if (
                    huboCambiosDeIndentacion
                ) {
                    await fs.writeFile(
                        inputFilePath,
                        reindentedText,
                        'utf8'
                    )

                    sourceText = reindentedText

                }

                let conditionIndentFixedText = fixIfSingleVariableConditionIndent(
                    sourceText
                )

                let huboCambiosDeCondicionIndent = conditionIndentFixedText !== sourceText

                if (
                    huboCambiosDeCondicionIndent
                ) {
                    await fs.writeFile(
                        inputFilePath,
                        conditionIndentFixedText,
                        'utf8'
                    )

                    sourceText = conditionIndentFixedText

                }

                let argsFixed = fixFunctionArgumentsLayoutMeriyah(
                    inputFilePath,
                    parse,
                    sourceText
                )

                let huboCambiosDeArgumentos = argsFixed.fixedText !== sourceText

                if (
                    huboCambiosDeArgumentos
                ) {
                    await fs.writeFile(
                        inputFilePath,
                        argsFixed.fixedText,
                        'utf8'
                    )

                    sourceText = argsFixed.fixedText

                }

                let noTrailingWhitespaceText = stripTrailingWhitespace(
                    sourceText
                )

                let huboCambiosDeEspaciosFinales = noTrailingWhitespaceText !== sourceText

                if (
                    huboCambiosDeEspaciosFinales
                ) {
                    await fs.writeFile(
                        inputFilePath,
                        noTrailingWhitespaceText,
                        'utf8'
                    )

                    sourceText = noTrailingWhitespaceText

                }

                let parsed = parseSourceMeriyah(
                    parse,
                    sourceText
                )

                conditionFindings = collectConditionSingleVariableFindingsMeriyah(
                    parsed.ast,
                    inputFilePath
                )

                findings = collectForbiddenFindingsMeriyah(
                    parsed.ast,
                    inputFilePath,
                    forbiddenWords
                )

            }

            findings.forEach(
                function (
                    finding
                ) {
                    issueCount += 1

                    let normalizedFilePath = normalize(
                        finding.filePath
                    )

                    let keyword = normalize(
                        finding.keyword
                    )

                    let ruleIdValue = 'formatear/unknown'

                    let findingTieneRuleId = typeof finding.ruleId === 'string' && finding.ruleId.length > 0

                    if (
                        findingTieneRuleId
                    ) {
                        ruleIdValue = finding.ruleId
                    }

                    let ruleId = normalize(
                        ruleIdValue
                    )

                    process.stdout.write(
                        `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se debe usar la palabra «${keyword}»  ${ruleId}\n`
                    )

                }
            )

            conditionFindings.forEach(
                function (
                    finding
                ) {
                    issueCount += 1

                    let normalizedFilePath = normalize(
                        finding.filePath
                    )

                    process.stdout.write(
                        `${normalizedFilePath}:${finding.line}:${finding.column}  error  La condición debe ser una sola variable  formatear/condition-single-variable\n`
                    )

                }
            )

        } catch (error) {
            parseErrorCount += 1

            let message = String(
                error
            )

            let esError = error instanceof Error

            if (
                esError
            ) {
                message = error.message
            }

            process.stderr.write(
                `${inputFilePath}  error  ${message}\n`
            )

        }
    }

    await files.reduce(
        function (
            prev,
            inputFilePath
        ) {
            return prev.then(
                function () {
                    return analyzeOne(
                        inputFilePath
                    )

                }
            )

        },
        Promise.resolve()
    )

    let huboErroresDeParseo = parseErrorCount > 0

    if (
        huboErroresDeParseo
    ) {
        return 2

    }

    let huboIssues = issueCount > 0

    if (
        huboIssues
    ) {
        return 1

    }

    return 0

}

let exitCode = await run(
    process.argv.slice(
        2
    )
)

process.exitCode = exitCode
