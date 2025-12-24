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
import { collectFiles, importMeriyah, importTypescript, isPathLike, loadForbiddenWords, printHelp } from './meriyah-cli/shared.mjs'
import {
    collectConditionSingleVariableFindingsTypescript,
    collectForbiddenFindingsTypescript,
    fixArrowFunctionsToFunctionsTypescript,
    fixCommentsTypescript,
    fixFunctionArgumentsLayoutTypescript,
    fixMissingBracesIfTypescript,
    fixSemicolonsTypescript,
    fixTernaryOperatorsTypescript,
    fixVarConstToLetTypescript,
    scanTokensTypescript,
} from './meriyah-cli/typescript.mjs'
import { fixCommentsMeriyah } from './meriyah-cli/reglas/comments_meriyah.mjs'
import { collectConditionSingleVariableFindingsMeriyah } from './meriyah-cli/reglas/condition_single_variable_meriyah.mjs'
import { collectForbiddenFindingsMeriyah } from './meriyah-cli/reglas/forbidden_words_meriyah.mjs'
import { fixFunctionArgumentsLayoutMeriyah } from './meriyah-cli/reglas/function_args_layout_meriyah.mjs'
import { fixIfSingleVariableConditionIndent } from './meriyah-cli/reglas/if_single_variable_indent_meriyah.mjs'
import { parseSourceMeriyah } from './meriyah-cli/reglas/meriyah_parse.mjs'
import { fixArrowFunctionsToFunctionsMeriyah } from './meriyah-cli/reglas/no_arrow_function_meriyah.mjs'
import { fixSemicolonsMeriyah } from './meriyah-cli/reglas/no_semicolon_meriyah.mjs'
import { fixTernaryOperatorsMeriyah } from './meriyah-cli/reglas/no_ternary_meriyah.mjs'
import { fixVarConstToLetMeriyah } from './meriyah-cli/reglas/no_var_const_meriyah.mjs'
import { fixMissingBracesIfMeriyah } from './meriyah-cli/reglas/require_braces_meriyah.mjs'

function getReglas() {
    return [
        {
            id: 'formatear/no-trailing-whitespace',
            descripcion: 'No dejar espacios o tabs al final de línea',
            autocorregible: true
        },
        {
            id: 'formatear/no-tabs',
            descripcion: 'Reemplazar tabs por 4 espacios fuera de tokens',
            autocorregible: true
        },
        {
            id: 'formatear/indent-4-spaces',
            descripcion: 'Indentar con 4 espacios y colapsar líneas en blanco consecutivas',
            autocorregible: true
        },
        {
            id: 'formatear/function-args-layout',
            descripcion: 'Ajustar el layout de argumentos de función',
            autocorregible: true
        },
        {
            id: 'formatear/comments',
            descripcion: 'Normalizar algunos formatos de comentarios',
            autocorregible: true
        },
        {
            id: 'formatear/if-single-variable-indent',
            descripcion: 'Normalizar indentación en if con condición de una sola variable',
            autocorregible: true
        },
        {
            id: 'formatear/no-this',
            descripcion: 'No usar `this`',
            autocorregible: false
        },
        {
            id: 'formatear/no-else',
            descripcion: 'No usar `else`',
            autocorregible: false
        },
        {
            id: 'formatear/no-var',
            descripcion: 'No usar `var`',
            autocorregible: false
        },
        {
            id: 'formatear/no-const',
            descripcion: 'No usar `const`',
            autocorregible: false
        },
        {
            id: 'formatear/no-for',
            descripcion: 'No usar `for`',
            autocorregible: false
        },
        {
            id: 'formatear/no-in',
            descripcion: 'No usar `in`',
            autocorregible: false
        },
        {
            id: 'formatear/no-of',
            descripcion: 'No usar `of`',
            autocorregible: false
        },
        {
            id: 'formatear/no-package',
            descripcion: 'No usar `package`',
            autocorregible: false
        },
        {
            id: 'formatear/no-while',
            descripcion: 'No usar `while`',
            autocorregible: false
        },
        {
            id: 'formatear/no-do',
            descripcion: 'No usar `do`',
            autocorregible: false
        },
        {
            id: 'formatear/no-switch',
            descripcion: 'No usar `switch`',
            autocorregible: false
        },
        {
            id: 'formatear/no-case',
            descripcion: 'No usar `case`',
            autocorregible: false
        },
        {
            id: 'formatear/no-break',
            descripcion: 'No usar `break`',
            autocorregible: false
        },
        {
            id: 'formatear/no-continue',
            descripcion: 'No usar `continue`',
            autocorregible: false
        },
        {
            id: 'formatear/no-finally',
            descripcion: 'No usar `finally`',
            autocorregible: false
        },
        {
            id: 'formatear/no-void',
            descripcion: 'No usar `void`',
            autocorregible: false
        },
        {
            id: 'formatear/no-yield',
            descripcion: 'No usar `yield`',
            autocorregible: false
        },
        {
            id: 'formatear/no-class',
            descripcion: 'No usar `class`',
            autocorregible: false
        },
        {
            id: 'formatear/no-extends',
            descripcion: 'No usar `extends`',
            autocorregible: false
        },
        {
            id: 'formatear/no-super',
            descripcion: 'No usar `super`',
            autocorregible: false
        },
        {
            id: 'formatear/no-target',
            descripcion: 'No usar `new.target`',
            autocorregible: false
        },
        {
            id: 'formatear/no-with',
            descripcion: 'No usar `with`',
            autocorregible: false
        },
        {
            id: 'formatear/no-<identificador>',
            descripcion: 'No usar identificadores prohibidos (según configuración)',
            autocorregible: false
        },
        {
            id: 'formatear/condition-single-variable',
            descripcion: 'La condición debe ser una sola variable',
            autocorregible: false
        },
        {
            id: 'formatear/no-semicolon',
            descripcion: 'No usar `;` (en algunos casos no es autocorregible)',
            autocorregible: true
        },
        {
            id: 'formatear/no-arrow-function',
            descripcion: 'No usar funciones flecha (en algunos casos no es autocorregible)',
            autocorregible: true
        },
        {
            id: 'formatear/no-ternary',
            descripcion: 'No usar el operador ternario',
            autocorregible: false
        },
        {
            id: 'formatear/require-braces',
            descripcion: 'Requerir llaves en cuerpos de `if`',
            autocorregible: true
        },
        {
            id: 'formatear/no-interface',
            descripcion: 'No usar `interface`',
            autocorregible: false
        },
        {
            id: 'formatear/no-enum',
            descripcion: 'No usar `enum`',
            autocorregible: false
        },
        {
            id: 'formatear/no-constructor',
            descripcion: 'No usar `constructor`',
            autocorregible: false
        },
        {
            id: 'formatear/no-public',
            descripcion: 'No usar `public`',
            autocorregible: false
        },
        {
            id: 'formatear/no-private',
            descripcion: 'No usar `private`',
            autocorregible: false
        },
        {
            id: 'formatear/no-protected',
            descripcion: 'No usar `protected`',
            autocorregible: false
        },
        {
            id: 'formatear/no-static',
            descripcion: 'No usar `static`',
            autocorregible: false
        },
        {
            id: 'formatear/no-accessor',
            descripcion: 'No usar `accessor`',
            autocorregible: false
        },
        {
            id: 'formatear/no-set',
            descripcion: 'No usar `set`',
            autocorregible: false
        },
        {
            id: 'formatear/no-implements',
            descripcion: 'No usar `implements`',
            autocorregible: false
        },
        {
            id: 'formatear/no-eval',
            descripcion: 'No usar `eval`',
            autocorregible: false
        }
    ]
}

function printReglas() {
    let reglas = getReglas()
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

    reglas.forEach(
        function (
            regla
        ) {
            let autocorregible = 'no'
            let esAutocorregible = Boolean(
                regla.autocorregible
            )

            if (
                esAutocorregible
            ) {
                autocorregible = 'sí'

            }

            process.stdout.write(
                `${regla.id}\t${autocorregible}\t${regla.descripcion}\n`
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
        printReglas()

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

    let ts

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
            let ext = path.extname(
                inputFilePath
            ).toLowerCase()

            let isTsFile = ext === '.ts' || ext === '.tsx' || ext === '.mts' || ext === '.cts'

            let findings
            let conditionFindings = []

            if (
                isTsFile
            ) {
                let noHayTypescript = !ts

                if (
                    noHayTypescript
                ) {
                    ts = await importTypescript()

                }

                let sourceText = await fs.readFile(
                    inputFilePath,
                    'utf8'
                )

                let tokensForTabs = scanTokensTypescript(
                    ts,
                    sourceText,
                    ext === '.tsx'
                )

                let tabFixedText = convertTabsToFourSpacesOutsideTokens(
                    sourceText,
                    tokensForTabs.map(
                        function (
                            t
                        ) {
                            return {
                                start: t.pos,
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

                let fixed = fixSemicolonsTypescript(
                    inputFilePath,
                    ts,
                    sourceText,
                    ext
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

                let varConstFixed = fixVarConstToLetTypescript(
                    inputFilePath,
                    ts,
                    sourceText,
                    ext
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

                let arrowFixed = fixArrowFunctionsToFunctionsTypescript(
                    inputFilePath,
                    ts,
                    sourceText,
                    ext
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

                let bracesFixed = fixMissingBracesIfTypescript(
                    inputFilePath,
                    ts,
                    sourceText,
                    ext
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

                let ternaryFixed = fixTernaryOperatorsTypescript(
                    inputFilePath,
                    ts,
                    sourceText,
                    ext
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

                let commentsFixed = fixCommentsTypescript(
                    inputFilePath,
                    ts,
                    sourceText,
                    ext
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

                let tokensForIndent = scanTokensTypescript(
                    ts,
                    sourceText,
                    ext === '.tsx'
                )

                let reindentedText = reindentFourSpacesOutsideTokens(
                    sourceText,
                    tokensForIndent.map(
                        function (
                            t
                        ) {
                            return {
                                start: t.pos,
                                end: t.end
                            }

                        }
                    ),
                    tokensForIndent
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
                                pos: t.pos,
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

                let argsFixed = fixFunctionArgumentsLayoutTypescript(
                    inputFilePath,
                    ts,
                    sourceText,
                    ext
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

                let scriptKind = ts.ScriptKind.TS

                let esTsx = ext === '.tsx'

                if (
                    esTsx
                ) {
                    scriptKind = ts.ScriptKind.TSX

                }

                let sourceFile = ts.createSourceFile(
                    inputFilePath,
                    sourceText,
                    ts.ScriptTarget.Latest,
                    true,
                    scriptKind
                )

                conditionFindings = collectConditionSingleVariableFindingsTypescript(
                    sourceFile,
                    inputFilePath,
                    ts
                )

                findings = collectForbiddenFindingsTypescript(
                    sourceFile,
                    inputFilePath,
                    forbiddenWords,
                    ts
                )

            }

            let noEsTsFile = !isTsFile

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
