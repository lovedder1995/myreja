#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import {
    applyReplacements,
    convertTabsToFourSpacesOutsideTokens,
    isInsideAnySpan,
    reindentFourSpacesOutsideTokens,
    stripTrailingWhitespace,
} from './meriyah-cli/formatting.mjs'
import { collectFiles, importMeriyah, importTypescript, isPathLike, loadForbiddenWords, printHelp } from './meriyah-cli/shared.mjs'
import {
    collectConditionSingleVariableFindingsTypescript,
    collectForbiddenFindingsTypescript,
    fixArrowFunctionsToFunctionsTypescript,
    fixMissingBracesIfTypescript,
    fixSemicolonsTypescript,
    fixVarConstToLetTypescript,
    scanTokensTypescript,
} from './meriyah-cli/typescript.mjs'

function isSkippableIdentifierContext(parent, key) {
    let noEsNodoPadre = !parent || typeof parent !== 'object'

    if (
        noEsNodoPadre
    ) {
        return false

    }

    let esPropiedadDeMemberExpression =
    parent.type === 'MemberExpression' && key === 'property' && parent.computed === false

    if (
        esPropiedadDeMemberExpression
    ) {
        return true

    }

    let esClaveDeProperty = parent.type === 'Property' && key === 'key' && parent.computed === false

    if (
        esClaveDeProperty
    ) {
        return true

    }

    let esClaveDeMethodDefinition =
    parent.type === 'MethodDefinition' && key === 'key' && parent.computed === false

    if (
        esClaveDeMethodDefinition
    ) {
        return true

    }

    let esClaveDePropertyDefinition =
    parent.type === 'PropertyDefinition' && key === 'key' && parent.computed === false

    if (
        esClaveDePropertyDefinition
    ) {
        return true

    }

    let esClaveDeAccessorProperty =
    parent.type === 'AccessorProperty' && key === 'key' && parent.computed === false

    if (
        esClaveDeAccessorProperty
    ) {
        return true

    }

    return false

}

function addFinding(findings, filePath, keyword, node, ruleId) {
    let line = node?.loc?.start?.line ?? 1

    let column = node?.loc?.start?.column ?? 0

    findings.push({
        filePath,
        line,
        column,
        keyword,
        ruleId,
    })

}

function addFindingAtLoc(findings, filePath, keyword, loc, ruleId) {
    let line = loc?.start?.line ?? 1

    let column = loc?.start?.column ?? 0

    findings.push({
        filePath,
        line,
        column,
        keyword,
        ruleId,
    })

}

function collectEmptyStatementRangesMeriyah(ast) {
    let ranges = []

    function visit(node, parent, key) {
        let noEsNodo = !node || typeof node !== 'object'

        if (
            noEsNodo
        ) {
            return

        }

        let esListaDeNodos = Array.isArray(node)

        if (
            esListaDeNodos
        ) {
            node.forEach(function (item) {
                visit(item, parent, key)

            })

            return

        }

        let noTieneTipoValido = typeof node.type !== 'string'

        if (
            noTieneTipoValido
        ) {
            Object.values(node).forEach(function (child) {
                visit(child, node, undefined)

            })

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
            ranges.push({ start: node.start, end: node.end })

        }

        Object.entries(node).forEach(function (pair) {
            let childKey = pair[0]

            let esClaveIgnorable = childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end'

            if (
                esClaveIgnorable
            ) {
                return

            }

            visit(pair[1], node, childKey)

        })

    }

    visit(ast, null, undefined)

    return ranges

}

function collectForHeaderSpansFromMeriyahTokens(tokens) {
    let spans = []

    function scanFrom(i) {
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
            return scanFrom(i + 1)

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
            return scanFrom(i + 1)

        }

        let { start } = openParenToken

        function scanParen(k, depth) {
            let excedeLongitudDeTokens = k >= tokens.length

            if (
                excedeLongitudDeTokens
            ) {
                return scanFrom(i + 1)

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
                spans.push({ start, end: token.end })

                return scanFrom(k + 1)

            }

            return scanParen(k + 1, nextDepth)

        }

        return scanParen(j, 0)

    }

    return scanFrom(0)

}

function collectForbiddenFindingsMeriyah(ast, filePath, forbiddenWords) {
    let findings = []

    function visit(node, parent, key) {
        let noEsNodo = !node || typeof node !== 'object'

        if (
            noEsNodo
        ) {
            return

        }

        let esListaDeNodos = Array.isArray(node)

        if (
            esListaDeNodos
        ) {
            node.forEach(function (item) {
                visit(item, parent, key)

            })

            return

        }

        let noTieneTipoValido = typeof node.type !== 'string'

        if (
            noTieneTipoValido
        ) {
            Object.values(node).forEach(function (child) {
                visit(child, node, undefined)

            })

            return

        }

        let { type: nodeType } = node

        let esThisExpression = nodeType === 'ThisExpression'

        if (
            esThisExpression
        ) {
            let estaThisProhibido = forbiddenWords.has('this')

            if (
                estaThisProhibido
            ) {
                addFinding(findings, filePath, 'this', node, 'formatear/no-this')

            }
        }

        let esIfStatement = nodeType === 'IfStatement'

        if (
            esIfStatement
        ) {
            let estaIfProhibido = forbiddenWords.has('if')

            if (
                estaIfProhibido
            ) {
                addFinding(findings, filePath, 'if', node, 'formatear/no-if')

            }

            let tieneAlternate = Boolean(node.alternate)
            let estaElseProhibido = forbiddenWords.has('else')
            let debeMarcarElse = tieneAlternate && estaElseProhibido

            if (
                debeMarcarElse
            ) {
                addFinding(findings, filePath, 'else', node.alternate, 'formatear/no-else')

            }
        }

        let esReturnStatement = nodeType === 'ReturnStatement'

        if (
            esReturnStatement
        ) {
            let estaReturnProhibido = forbiddenWords.has('return')

            if (
                estaReturnProhibido
            ) {
                addFinding(findings, filePath, 'return', node, 'formatear/no-return')

            }
        }

        let esVariableDeclaration = nodeType === 'VariableDeclaration'

        if (
            esVariableDeclaration
        ) {
            let esVar = node.kind === 'var'
            let esLet = node.kind === 'let'
            let esConst = node.kind === 'const'
            let estaVarProhibido = forbiddenWords.has('var')
            let estaLetProhibido = forbiddenWords.has('let')
            let estaConstProhibido = forbiddenWords.has('const')
            let debeMarcarVar = esVar && estaVarProhibido
            let debeMarcarLet = esLet && estaLetProhibido
            let debeMarcarConst = esConst && estaConstProhibido

            if (
                debeMarcarVar
            ) {
                addFinding(findings, filePath, 'var', node, 'formatear/no-var')

            }

            if (
                debeMarcarLet
            ) {
                addFinding(findings, filePath, 'let', node, 'formatear/no-let')

            }

            if (
                debeMarcarConst
            ) {
                addFinding(findings, filePath, 'const', node, 'formatear/no-const')

            }
        }

        let esForStatement = nodeType === 'ForStatement'
        let esForInStatement = nodeType === 'ForInStatement'
        let esForOfStatement = nodeType === 'ForOfStatement'
        let esAlgunFor = esForStatement || esForInStatement || esForOfStatement

        if (
            esAlgunFor
        ) {
            let estaForProhibido = forbiddenWords.has('for')

            if (
                estaForProhibido
            ) {
                addFinding(findings, filePath, 'for', node, 'formatear/no-for')

            }

            let estaInProhibido = forbiddenWords.has('in')
            let estaOfProhibido = forbiddenWords.has('of')
            let debeMarcarIn = esForInStatement && estaInProhibido
            let debeMarcarOf = esForOfStatement && estaOfProhibido

            if (
                debeMarcarIn
            ) {
                addFinding(findings, filePath, 'in', node, 'formatear/no-in')

            }

            if (
                debeMarcarOf
            ) {
                addFinding(findings, filePath, 'of', node, 'formatear/no-of')

            }
        }

        let esWhileStatement = nodeType === 'WhileStatement'

        if (
            esWhileStatement
        ) {
            let estaWhileProhibido = forbiddenWords.has('while')

            if (
                estaWhileProhibido
            ) {
                addFinding(findings, filePath, 'while', node, 'formatear/no-while')

            }
        }

        let esDoWhileStatement = nodeType === 'DoWhileStatement'

        if (
            esDoWhileStatement
        ) {
            let estaDoProhibido = forbiddenWords.has('do')

            if (
                estaDoProhibido
            ) {
                addFinding(findings, filePath, 'do', node, 'formatear/no-do')

            }
        }

        let esSwitchStatement = nodeType === 'SwitchStatement'

        if (
            esSwitchStatement
        ) {
            let estaSwitchProhibido = forbiddenWords.has('switch')

            if (
                estaSwitchProhibido
            ) {
                addFinding(findings, filePath, 'switch', node, 'formatear/no-switch')

            }
        }

        let esSwitchCase = nodeType === 'SwitchCase'

        if (
            esSwitchCase
        ) {
            let tieneTest = Boolean(node.test)
            let estaCaseProhibido = forbiddenWords.has('case')
            let estaDefaultProhibido = forbiddenWords.has('default')
            let debeMarcarCase = tieneTest && estaCaseProhibido
            let debeMarcarDefault = !tieneTest && estaDefaultProhibido

            if (
                debeMarcarCase
            ) {
                addFinding(findings, filePath, 'case', node, 'formatear/no-case')

            }

            if (
                debeMarcarDefault
            ) {
                addFinding(findings, filePath, 'default', node, 'formatear/no-default')

            }
        }

        let esBreakStatement = nodeType === 'BreakStatement'

        if (
            esBreakStatement
        ) {
            let estaBreakProhibido = forbiddenWords.has('break')

            if (
                estaBreakProhibido
            ) {
                addFinding(findings, filePath, 'break', node, 'formatear/no-break')

            }
        }

        let esContinueStatement = nodeType === 'ContinueStatement'

        if (
            esContinueStatement
        ) {
            let estaContinueProhibido = forbiddenWords.has('continue')

            if (
                estaContinueProhibido
            ) {
                addFinding(findings, filePath, 'continue', node, 'formatear/no-continue')

            }
        }

        let esTryStatement = nodeType === 'TryStatement'

        if (
            esTryStatement
        ) {
            let estaTryProhibido = forbiddenWords.has('try')

            if (
                estaTryProhibido
            ) {
                addFinding(findings, filePath, 'try', node, 'formatear/no-try')

            }

            let tieneFinalizer = Boolean(node.finalizer)
            let estaFinallyProhibido = forbiddenWords.has('finally')
            let debeMarcarFinally = tieneFinalizer && estaFinallyProhibido

            if (
                debeMarcarFinally
            ) {
                addFinding(findings, filePath, 'finally', node.finalizer, 'formatear/no-finally')

            }
        }

        let esCatchClause = nodeType === 'CatchClause'

        if (
            esCatchClause
        ) {
            let estaCatchProhibido = forbiddenWords.has('catch')

            if (
                estaCatchProhibido
            ) {
                addFinding(findings, filePath, 'catch', node, 'formatear/no-catch')

            }
        }

        let esThrowStatement = nodeType === 'ThrowStatement'

        if (
            esThrowStatement
        ) {
            let estaThrowProhibido = forbiddenWords.has('throw')

            if (
                estaThrowProhibido
            ) {
                addFinding(findings, filePath, 'throw', node, 'formatear/no-throw')

            }
        }

        let esNewExpression = nodeType === 'NewExpression'

        if (
            esNewExpression
        ) {
            let estaNewProhibido = forbiddenWords.has('new')

            if (
                estaNewProhibido
            ) {
                addFinding(findings, filePath, 'new', node, 'formatear/no-new')

            }
        }

        let esUnaryExpression = nodeType === 'UnaryExpression'

        if (
            esUnaryExpression
        ) {
            let { operator: op } = node

            let esTypeof = op === 'typeof'
            let esVoid = op === 'void'
            let esDelete = op === 'delete'
            let estaTypeofProhibido = forbiddenWords.has('typeof')
            let estaVoidProhibido = forbiddenWords.has('void')
            let estaDeleteProhibido = forbiddenWords.has('delete')
            let debeMarcarTypeof = esTypeof && estaTypeofProhibido
            let debeMarcarVoid = esVoid && estaVoidProhibido
            let debeMarcarDelete = esDelete && estaDeleteProhibido

            if (
                debeMarcarTypeof
            ) {
                addFinding(findings, filePath, 'typeof', node, 'formatear/no-typeof')

            }

            if (
                debeMarcarVoid
            ) {
                addFinding(findings, filePath, 'void', node, 'formatear/no-void')

            }

            if (
                debeMarcarDelete
            ) {
                addFinding(findings, filePath, 'delete', node, 'formatear/no-delete')

            }
        }

        let esBinaryExpression = nodeType === 'BinaryExpression'

        if (
            esBinaryExpression
        ) {
            let { operator: op } = node

            let esIn = op === 'in'
            let esInstanceof = op === 'instanceof'
            let estaInProhibido = forbiddenWords.has('in')
            let estaInstanceofProhibido = forbiddenWords.has('instanceof')
            let debeMarcarIn = esIn && estaInProhibido
            let debeMarcarInstanceof = esInstanceof && estaInstanceofProhibido

            if (
                debeMarcarIn
            ) {
                addFinding(findings, filePath, 'in', node, 'formatear/no-in')

            }

            if (
                debeMarcarInstanceof
            ) {
                addFinding(findings, filePath, 'instanceof', node, 'formatear/no-instanceof')

            }
        }

        let esFunctionDeclaration = nodeType === 'FunctionDeclaration'
        let esFunctionExpression = nodeType === 'FunctionExpression'
        let esAlgunFunction = esFunctionDeclaration || esFunctionExpression

        if (
            esAlgunFunction
        ) {
            let estaFunctionProhibido = forbiddenWords.has('function')

            if (
                estaFunctionProhibido
            ) {
                addFinding(findings, filePath, 'function', node, 'formatear/no-function')

            }

            let esAsync = node.async === true
            let estaAsyncProhibido = forbiddenWords.has('async')
            let debeMarcarAsync = esAsync && estaAsyncProhibido

            if (
                debeMarcarAsync
            ) {
                addFinding(findings, filePath, 'async', node, 'formatear/no-async')

            }
        }

        let esArrowFunctionExpression = nodeType === 'ArrowFunctionExpression'

        if (
            esArrowFunctionExpression
        ) {
            let esAsync = node.async === true
            let estaAsyncProhibido = forbiddenWords.has('async')
            let debeMarcarAsync = esAsync && estaAsyncProhibido

            if (
                debeMarcarAsync
            ) {
                addFinding(findings, filePath, 'async', node, 'formatear/no-async')

            }
        }

        let esAwaitExpression = nodeType === 'AwaitExpression'

        if (
            esAwaitExpression
        ) {
            let estaAwaitProhibido = forbiddenWords.has('await')

            if (
                estaAwaitProhibido
            ) {
                addFinding(findings, filePath, 'await', node, 'formatear/no-await')

            }
        }

        let esYieldExpression = nodeType === 'YieldExpression'

        if (
            esYieldExpression
        ) {
            let estaYieldProhibido = forbiddenWords.has('yield')

            if (
                estaYieldProhibido
            ) {
                addFinding(findings, filePath, 'yield', node, 'formatear/no-yield')

            }
        }

        let esClassDeclaration = nodeType === 'ClassDeclaration'
        let esClassExpression = nodeType === 'ClassExpression'
        let esAlgunaClase = esClassDeclaration || esClassExpression

        if (
            esAlgunaClase
        ) {
            let estaClassProhibido = forbiddenWords.has('class')

            if (
                estaClassProhibido
            ) {
                addFinding(findings, filePath, 'class', node, 'formatear/no-class')

            }

            let tieneSuperClase = Boolean(node.superClass)
            let estaExtendsProhibido = forbiddenWords.has('extends')
            let debeMarcarExtends = tieneSuperClase && estaExtendsProhibido

            if (
                debeMarcarExtends
            ) {
                addFinding(findings, filePath, 'extends', node.superClass, 'formatear/no-extends')

            }
        }

        let esSuper = nodeType === 'Super'

        if (
            esSuper
        ) {
            let estaSuperProhibido = forbiddenWords.has('super')

            if (
                estaSuperProhibido
            ) {
                addFinding(findings, filePath, 'super', node, 'formatear/no-super')

            }
        }

        let esImportDeclaration = nodeType === 'ImportDeclaration'
        let esImportExpression = nodeType === 'ImportExpression'
        let esAlgunImport = esImportDeclaration || esImportExpression

        if (
            esAlgunImport
        ) {
            let estaImportProhibido = forbiddenWords.has('import')

            if (
                estaImportProhibido
            ) {
                addFinding(findings, filePath, 'import', node, 'formatear/no-import')

            }
        }

        let esExportNamedDeclaration = nodeType === 'ExportNamedDeclaration'
        let esExportDefaultDeclaration = nodeType === 'ExportDefaultDeclaration'
        let esExportAllDeclaration = nodeType === 'ExportAllDeclaration'
        let esAlgunExport = esExportNamedDeclaration || esExportDefaultDeclaration || esExportAllDeclaration

        if (
            esAlgunExport
        ) {
            let estaExportProhibido = forbiddenWords.has('export')

            if (
                estaExportProhibido
            ) {
                addFinding(findings, filePath, 'export', node, 'formatear/no-export')

            }
        }

        let esMetaProperty = nodeType === 'MetaProperty'

        if (
            esMetaProperty
        ) {
            let metaNode = node['meta']

            let propertyNode = node['property']

            let metaName = metaNode && metaNode.name

            let propertyName = propertyNode && propertyNode.name

            let esNewTarget = metaName === 'new' && propertyName === 'target'
            let estaTargetProhibido = forbiddenWords.has('target')
            let debeMarcarTarget = esNewTarget && estaTargetProhibido

            if (
                debeMarcarTarget
            ) {
                addFinding(findings, filePath, 'target', node, 'formatear/no-target')

            }

            let esImportMeta = metaName === 'import' && propertyName === 'meta'
            let estaMetaProhibido = forbiddenWords.has('meta')
            let debeMarcarMeta = esImportMeta && estaMetaProhibido

            if (
                debeMarcarMeta
            ) {
                addFinding(findings, filePath, 'meta', node, 'formatear/no-meta')

            }
        }

        let esWithStatement = nodeType === 'WithStatement'

        if (
            esWithStatement
        ) {
            let estaWithProhibido = forbiddenWords.has('with')

            if (
                estaWithProhibido
            ) {
                addFinding(findings, filePath, 'with', node, 'formatear/no-with')

            }
        }

        let esDebuggerStatement = nodeType === 'DebuggerStatement'

        if (
            esDebuggerStatement
        ) {
            let estaDebuggerProhibido = forbiddenWords.has('debugger')

            if (
                estaDebuggerProhibido
            ) {
                addFinding(findings, filePath, 'debugger', node, 'formatear/no-debugger')

            }
        }

        let esIdentifier = nodeType === 'Identifier'

        if (
            esIdentifier
        ) {
            let nombreIdentificador = node.name
            let esNombreString = typeof nombreIdentificador === 'string'
            let esNombreProhibido = esNombreString && forbiddenWords.has(nombreIdentificador)
            let esContextoOmitible = isSkippableIdentifierContext(parent, key)
            let debeMarcarIdentificador = esNombreProhibido && !esContextoOmitible

            if (
                debeMarcarIdentificador
            ) {
                addFinding(
                findings,
                filePath,
                nombreIdentificador,
                node,
                `formatear/no-${nombreIdentificador}`,
                )

            }
        }

        Object.entries(node).forEach(function (pair) {
            let childKey = pair[0]

            let esClaveIgnorable = childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end'

            if (
                esClaveIgnorable
            ) {
                return

            }

            visit(pair[1], node, childKey)

        })

    }

    visit(ast, null, undefined)

    return findings

}

function collectConditionSingleVariableFindingsMeriyah(ast, filePath) {
    let findings = []

    function checkTest(node) {
        let noEsNodo = !node || typeof node !== 'object'

        if (
            noEsNodo
        ) {
            return

        }

        let { test } = node

        let noEsTestValido = !test || typeof test !== 'object'

        if (
            noEsTestValido
        ) {
            return

        }

        let esIdentificador = test.type === 'Identifier'

        if (
            esIdentificador
        ) {
            return

        }

        addFinding(findings, filePath, 'condicion', test, 'formatear/condition-single-variable')

    }

    function visit(node) {
        let noEsNodo = !node || typeof node !== 'object'

        if (
            noEsNodo
        ) {
            return

        }

        let esListaDeNodos = Array.isArray(node)

        if (
            esListaDeNodos
        ) {
            node.forEach(visit)

            return

        }

        let tieneTipoString = typeof node.type === 'string'

        if (
            tieneTipoString
        ) {
            let { type } = node

            let esNodoConCondicion =
            type === 'IfStatement' ||
            type === 'WhileStatement' ||
            type === 'DoWhileStatement' ||
            type === 'ForStatement'

            if (
                esNodoConCondicion
            ) {
                checkTest(node)

            }
        }

        Object.entries(node).forEach(function (pair) {
            let key = pair[0]

            let esClaveIgnorable = key === 'loc' || key === 'range' || key === 'start' || key === 'end'

            if (
                esClaveIgnorable
            ) {
                return

            }

            visit(pair[1])

        })

    }

    visit(ast)

    return findings

}

function parseSourceMeriyah(parse, sourceText) {
    let parseOptions = { loc: true, ranges: true, next: true, jsx: true, webcompat: true }

    let tokens = []

    let onToken = function (type, start, end, loc) {
        tokens.push({
            type,
            start,
            end,
            loc,
            text: sourceText.slice(start, end),
        })

    }

    let ast

    let moduleError

    try {
        ast = parse(sourceText, { ...parseOptions, sourceType: 'module', onToken })

    } catch (error) {
        moduleError = error

    }

    let noHayAst = !ast

    if (
        noHayAst
    ) {
        try {
            ast = parse(sourceText, { ...parseOptions, sourceType: 'script', onToken })

        } catch {
            let err = moduleError instanceof Error ? moduleError : new Error(String(moduleError))

            throw err

        }
    }

    return { ast, tokens }

}

function parseCommentsMeriyah(parse, sourceText) {
    let parseOptions = { loc: true, ranges: true, next: true, jsx: true, webcompat: true }

    let comments = []

    let ast

    let moduleError

    try {
        ast = parse(sourceText, { ...parseOptions, sourceType: 'module', onComment: comments })

    } catch (error) {
        moduleError = error

    }

    let noHayAst = !ast

    if (
        noHayAst
    ) {
        try {
            ast = parse(sourceText, { ...parseOptions, sourceType: 'script', onComment: comments })

        } catch {
            let err = moduleError instanceof Error ? moduleError : new Error(String(moduleError))

            throw err

        }
    }

    return { ast, comments }

}

function detectEol(sourceText) {
    let hayCrLf = sourceText.includes('\r\n')

    if (
        hayCrLf
    ) {
        return '\r\n'

    }

    let hayLf = sourceText.includes('\n')

    if (
        hayLf
    ) {
        return '\n'

    }

    let hayCr = sourceText.includes('\r')

    if (
        hayCr
    ) {
        return '\r'

    }

    return '\n'

}

function findLineStartIndex(sourceText, index) {
    let len = sourceText.length

    let i = Math.max(0, Math.min(len, index))

    let searchFrom = i - 1

    let lastNl = sourceText.lastIndexOf('\n', searchFrom)

    let lastCr = sourceText.lastIndexOf('\r', searchFrom)

    let lastBreak = Math.max(lastNl, lastCr)

    let noHayBreak = lastBreak < 0

    if (
        noHayBreak
    ) {
        return 0

    }

    return lastBreak + 1

}

function findLineEndIndex(sourceText, index) {
    let len = sourceText.length

    let i = Math.max(0, Math.min(len, index))

    let nextNl = sourceText.indexOf('\n', i)

    let nextCr = sourceText.indexOf('\r', i)

    let hayNl = nextNl >= 0

    let hayCr = nextCr >= 0

    let hayAmbos = hayNl && hayCr

    if (
        hayAmbos
    ) {
        return Math.min(nextNl, nextCr)

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

function findLineIndent(sourceText, lineStartIndex, lineEndIndex) {
    let lineText = sourceText.slice(lineStartIndex, lineEndIndex)

    let match = /^[ \t]*/.exec(lineText)

    let tieneMatch = Boolean(match)

    if (
        tieneMatch
    ) {
        return match[0]

    }

    return ''

}

function normalizeLineCommentValue(value) {
    let str = typeof value === 'string' ? value : ''

    str = str.replace(/[ \t]+$/g, '')

    let esVacio = str.length === 0

    if (
        esVacio
    ) {
        return ''

    }

    let empiezaConEspacio = str.startsWith(' ')

    if (
        empiezaConEspacio
    ) {
        return str

    }

    return ` ${str}`

}

function buildLineCommentBlockFromValue(value, indent, eol, omitFirstIndent) {
    let raw = typeof value === 'string' ? value : ''

    let lines = raw.split(/\r\n|\r|\n/)

    let out = []

    lines.forEach(function (line, index) {
        let esPrimera = index === 0

        let debeOmitir = esPrimera && omitFirstIndent

        let prefix = indent

        if (
            debeOmitir
        ) {
            prefix = ''

        }

        out.push(`${prefix}//${normalizeLineCommentValue(line)}`)

    })

    return out.join(eol)

}

function fixIfSingleVariableConditionIndent(sourceText) {
    let noEsTexto = typeof sourceText !== 'string' || sourceText.length === 0

    if (
        noEsTexto
    ) {
        return sourceText

    }

    let eol = detectEol(sourceText)

    let replacements = []

    let singleLineRe = /(^[ \t]*)if[ \t]*\([ \t]*([A-Za-z_$][\w$]*)[ \t]*\)[ \t]*\{[ \t]*$/gm

    Array.from(sourceText.matchAll(singleLineRe)).forEach(function (match) {
        let { index } = match

        let tieneIndex = typeof index === 'number' && Number.isFinite(index)

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

        replacements.push({ start: index, end: index + matchText.length, text: repText })

    })

    let convertedText = applyReplacements(sourceText, replacements)

    let re = /(^[ \t]*)(if[ \t]*\([ \t]*)(\r\n|\n|\r)([ \t]*)([A-Za-z_$][\w$]*)[ \t]*(\r\n|\n|\r)([ \t]*\))/gm

    let matches = Array.from(convertedText.matchAll(re))

    let noHayMatches = matches.length === 0

    if (
        noHayMatches
    ) {
        return convertedText

    }

    let indentReplacements = []

    matches.forEach(function (match) {
        let { index } = match

        let tieneIndex = typeof index === 'number' && Number.isFinite(index)

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

        indentReplacements.push({ start: indentStart, end: indentEnd, text: desiredIndent })

    })

    let fixedText = applyReplacements(convertedText, indentReplacements)

    return fixedText

}

function scanCommentsTypescript(ts, sourceText, isTsx) {
    let scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    isTsx ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard,
    sourceText,
    )

    let comments = []

    function scanNext() {
        let kind = scanner.scan()

        let finDeArchivo = kind === ts.SyntaxKind.EndOfFileToken

        if (
            finDeArchivo
        ) {
            return comments

        }

        let esComentario =
        kind === ts.SyntaxKind.SingleLineCommentTrivia ||
        kind === ts.SyntaxKind.MultiLineCommentTrivia

        if (
            esComentario
        ) {
            let start = scanner.getTokenPos()

            let end = scanner.getTextPos()

            comments.push({ kind, start, end, text: sourceText.slice(start, end) })

        }

        return scanNext()
    }

    return scanNext()

}

function fixCommentsText(sourceText, comments) {
    let eol = detectEol(sourceText)

    let replacements = []

    comments.forEach(function (comment) {
        let start = comment?.start

        let end = comment?.end

        let startEsNumero = typeof start === 'number'

        let endEsNumero = typeof end === 'number'

        let startEsFinito = startEsNumero && Number.isFinite(start)

        let endEsFinito = endEsNumero && Number.isFinite(end)

        let hayRango = startEsFinito && endEsFinito

        let rangoDesordenado = hayRango && end <= start

        let rangoInvalido = !hayRango || rangoDesordenado

        if (
            rangoInvalido
        ) {
            return

        }

        let startLineStart = findLineStartIndex(sourceText, start)

        let startLineEnd = findLineEndIndex(sourceText, start)

        let endLineEnd = findLineEndIndex(sourceText, end)

        let indent = findLineIndent(sourceText, startLineStart, startLineEnd)

        let prefix = sourceText.slice(startLineStart, start)

        let suffix = sourceText.slice(end, endLineEnd)

        let hayCodigoAntes = /\S/.test(prefix)

        let hayCodigoDespues = /\S/.test(suffix)

        let rawText = sourceText.slice(start, end)

        let tieneTexto = typeof comment.text === 'string' && comment.text.length > 0

        if (
            tieneTexto
        ) {
            rawText = comment.text

        }

        let esMultiLine = comment.type === 'MultiLine'

        let esBloquePorTexto = rawText.startsWith('/*')

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
            let esBloqueCerrado = rawText.startsWith('/*') && rawText.endsWith('*/')

            if (
                esBloqueCerrado
            ) {
                value = rawText.slice(2, -2)

            }

            let noEsBloqueCerrado = !esBloqueCerrado

            if (
                noEsBloqueCerrado
            ) {
                let esLinea = rawText.startsWith('//')

                if (
                    esLinea
                ) {
                    value = rawText.slice(2)

                }
            }
        }

        let esMultilinea = /[\r\n]/.test(rawText)

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
                let repText = buildLineCommentBlockFromValue(value, indent, eol, true)

                replacements.push({ start, end, text: repText })

            }

            return

        }

        let comentarioAlFinalDeLinea = hayCodigoAntes && !hayCodigoDespues

        if (
            comentarioAlFinalDeLinea
        ) {
            let matchTrailing = /[ \t]*$/.exec(prefix)

            let trailingWs = ''

            let tieneTrailing = Boolean(matchTrailing)

            if (
                tieneTrailing
            ) {
                trailingWs = matchTrailing[0]

            }

            let wsStart = start - trailingWs.length

            let repText = `${eol}${indent}//${normalizeLineCommentValue(value)}`

            if (
                esComentarioDeBloque
            ) {
                repText = `${eol}${buildLineCommentBlockFromValue(value, indent, eol, false)}`

            }

            replacements.push({ start: wsStart, end: startLineEnd, text: repText })

            return

        }

        let comentarioDeBloqueConCodigoDespues = esComentarioDeBloque && !hayCodigoAntes && hayCodigoDespues

        if (
            comentarioDeBloqueConCodigoDespues
        ) {
            let between = sourceText.slice(end, startLineEnd)

            let matchLeading = /^[ \t]*/.exec(between)

            let leadingWs = ''

            let tieneLeading = Boolean(matchLeading)

            if (
                tieneLeading
            ) {
                leadingWs = matchLeading[0]

            }

            let afterNonWs = end + leadingWs.length

            let repText = buildLineCommentBlockFromValue(value, indent, eol, true)

            replacements.push({ start, end, text: repText })

            replacements.push({ start: end, end: afterNonWs, text: `${eol}${indent}` })

            return

        }

        let comentarioSoloEnLinea = !hayCodigoAntes && !hayCodigoDespues

        if (
            comentarioSoloEnLinea
        ) {
            if (
                esComentarioDeBloque
            ) {
                let repText = buildLineCommentBlockFromValue(value, indent, eol, true)

                replacements.push({ start, end, text: repText })

            }

            return

        }
    })

    let fixedText = applyReplacements(sourceText, replacements)

    return fixedText

}

function fixCommentsMeriyah(_filePath, parse, sourceText) {
    let parsed = parseCommentsMeriyah(parse, sourceText)

    let comments = Array.isArray(parsed.comments) ? parsed.comments : []

    let normalized = comments
    .filter(function (c) {
        return (
        c &&
        typeof c === 'object' &&
        typeof c.start === 'number' &&
        typeof c.end === 'number' &&
        Number.isFinite(c.start) &&
        Number.isFinite(c.end) &&
        c.end > c.start
        )

    })
    .map(function (c) {
        return { start: c.start, end: c.end, type: c.type, value: c.value, text: sourceText.slice(c.start, c.end) }

    })

    let fixedText = fixCommentsText(sourceText, normalized)

    return { fixedText }

}

function fixCommentsTypescript(_filePath, ts, sourceText, ext) {
    let isTsx = ext === '.tsx'

    let trivia = scanCommentsTypescript(ts, sourceText, isTsx)

    let fixedText = fixCommentsText(
    sourceText,
    trivia.map(function (c) {
        return { start: c.start, end: c.end, text: c.text }

    }),
    )

    return { fixedText }

}

function fixSemicolonsMeriyah(filePath, parse, sourceText) {
    let { ast, tokens } = parseSourceMeriyah(parse, sourceText)

    let forHeaderSpans = collectForHeaderSpansFromMeriyahTokens(tokens)

    let emptyStatementRanges = collectEmptyStatementRangesMeriyah(ast)

    let emptyStartSet = new Set()

    emptyStatementRanges.forEach(function (r) {
        emptyStartSet.add(r.start)

    })

    let replacements = []

    emptyStatementRanges.forEach(function (range) {
        replacements.push({ start: range.start, end: range.end, text: '{}' })

    })

    let unfixableFindings = []

    tokens.forEach(function (t) {
        let noEsPuntoYComa = t.text !== ';'

        if (
            noEsPuntoYComa
        ) {
            return

        }

        let esVacioDeSentencia = emptyStartSet.has(t.start)

        if (
            esVacioDeSentencia
        ) {
            return

        }

        let estaEnCabeceraDeFor = isInsideAnySpan(t.start, forHeaderSpans)

        if (
            estaEnCabeceraDeFor
        ) {
            addFindingAtLoc(unfixableFindings, filePath, ';', t.loc, 'formatear/no-semicolon')

            return

        }

        replacements.push({ start: t.start, end: t.end, text: '\n' })

    })

    let fixedText = applyReplacements(sourceText, replacements)

    return { fixedText, unfixableFindings }

}

function fixVarConstToLetMeriyah(filePath, parse, sourceText) {
    let { tokens } = parseSourceMeriyah(parse, sourceText)

    let replacements = []

    tokens.forEach(function (t) {
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

        replacements.push({ start: t.start, end: t.end, text: 'let' })

    })

    let fixedText = applyReplacements(sourceText, replacements)

    return { fixedText, unfixableFindings: [] }

}

function fixArrowFunctionsToFunctionsMeriyah(filePath, parse, sourceText) {
    let { ast, tokens } = parseSourceMeriyah(parse, sourceText)

    let replacements = []

    let unfixableFindings = []

    let arrowTokens = tokens.filter(function (t) {
        return t.type === 'Punctuator' && t.text === '=>'

    })

    function convertArrowFunction(node) {
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

        let arrowToken = arrowTokens.find(function (t) {
            return typeof t.start === 'number' && t.start >= node.start && t.end <= node.end

        })

        let noHayArrowToken = !arrowToken

        if (
            noHayArrowToken
        ) {
            addFinding(unfixableFindings, filePath, '=>', node, 'formatear/no-arrow-function')

            return

        }

        let headText = sourceText.slice(node.start, arrowToken.start).trimEnd()

        let esAsync = node.async === true

        if (
            esAsync
        ) {
            headText = headText.replace(/^\s*async\b\s*/, '')

        }

        let paramsText = headText.trim()

        let paramsNoTieneParentesis = !paramsText.startsWith('(')

        if (
            paramsNoTieneParentesis
        ) {
            paramsText = `(${paramsText})`

        }

        let functionPrefix = node.async === true ? 'async function ' : 'function '

        let bodyText

        let tieneBody = Boolean(node.body)
        let esBlockStatement = tieneBody && node.body.type === 'BlockStatement'

        if (
            esBlockStatement
        ) {
            bodyText = sourceText.slice(node.body.start, node.body.end)

        }

        let noHayBodyText = !bodyText
        let tieneRangoBody = tieneBody && typeof node.body.start === 'number' && typeof node.body.end === 'number'
        let debeGenerarBodyReturn = noHayBodyText && tieneRangoBody

        if (
            debeGenerarBodyReturn
        ) {
            let expressionText = sourceText.slice(node.body.start, node.body.end)

            bodyText = `{ return ${expressionText} }`

        }

        let sigueSinBodyText = !bodyText

        if (
            sigueSinBodyText
        ) {
            addFinding(unfixableFindings, filePath, '=>', node, 'formatear/no-arrow-function')

            return

        }

        replacements.push({
            start: node.start,
            end: node.end,
            text: `${functionPrefix}${paramsText} ${bodyText}`,
        })

    }

    function visit(node) {
        let noEsNodo = !node || typeof node !== 'object'

        if (
            noEsNodo
        ) {
            return

        }

        let esArreglo = Array.isArray(node)

        if (
            esArreglo
        ) {
            node.forEach(function (item) {
                visit(item)

            })

            return

        }

        let noTieneTipo = typeof node.type !== 'string'

        if (
            noTieneTipo
        ) {
            Object.values(node).forEach(function (child) {
                visit(child)

            })

            return

        }

        let esArrowFunctionExpression = node.type === 'ArrowFunctionExpression'

        if (
            esArrowFunctionExpression
        ) {
            convertArrowFunction(node)

        }

        Object.entries(node).forEach(function (pair) {
            let childKey = pair[0]

            let esClaveDeUbicacion = childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end'

            if (
                esClaveDeUbicacion
            ) {
                return

            }

            visit(pair[1])

        })

    }

    visit(ast)

    let fixedText = applyReplacements(sourceText, replacements)

    return { fixedText, unfixableFindings }

}

function fixMissingBracesIfMeriyah(filePath, parse, sourceText) {
    let { ast } = parseSourceMeriyah(parse, sourceText)

    let replacements = []

    let unfixableFindings = []

    function wrapStatement(stmt) {
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
            addFinding(unfixableFindings, filePath, '{', stmt, 'formatear/require-braces')

            return

        }

        replacements.push({ start: stmt.start, end: stmt.start, text: '{ ' })

        replacements.push({ start: stmt.end, end: stmt.end, text: ' }' })

    }

    function visit(node) {
        let noEsNodo = !node || typeof node !== 'object'

        if (
            noEsNodo
        ) {
            return

        }

        let esArreglo = Array.isArray(node)

        if (
            esArreglo
        ) {
            node.forEach(function (item) {
                visit(item)

            })

            return

        }

        let noTieneTipo = typeof node.type !== 'string'

        if (
            noTieneTipo
        ) {
            Object.values(node).forEach(function (child) {
                visit(child)

            })

            return

        }

        let esIfStatement = node.type === 'IfStatement'

        if (
            esIfStatement
        ) {
            wrapStatement(node.consequent)

            let tieneAlternativa = Boolean(node.alternate)

            if (
                tieneAlternativa
            ) {
                wrapStatement(node.alternate)

            }
        }

        Object.entries(node).forEach(function (pair) {
            let childKey = pair[0]

            let esClaveDeUbicacion = childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end'

            if (
                esClaveDeUbicacion
            ) {
                return

            }

            visit(pair[1])

        })

    }

    visit(ast)

    let fixedText = applyReplacements(sourceText, replacements)

    return { fixedText, unfixableFindings }

}

async function run(argv) {
    let pidioAyuda = argv.includes('--help') || argv.includes('-h')

    if (
        pidioAyuda
    ) {
        printHelp()

        return 0

    }

    let formatearIndex = argv.indexOf('--formatear')

    let faltaFlagFormatear = formatearIndex === -1

    if (
        faltaFlagFormatear
    ) {
        printHelp()

        return 2

    }

    let inputPaths = argv.slice(formatearIndex + 1).filter(isPathLike)

    let noHayRutasDeEntrada = inputPaths.length === 0

    if (
        noHayRutasDeEntrada
    ) {
        printHelp()

        return 2

    }

    let fileSet = new Set()

    await Promise.all(
    inputPaths.map(async function (inputPath) {
        await collectFiles(inputPath, fileSet)

    }),
    )

    let files = Array.from(fileSet).sort(function (a, b) {
        return a.localeCompare(b)

    })

    let noHayArchivos = files.length === 0

    if (
        noHayArchivos
    ) {
        process.stderr.write('No se encontraron archivos para analizar.\n')

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
        let message = error instanceof Error ? error.message : String(error)

        process.stderr.write(`${message}\n`)

        return 2

    }

    function normalize(value) {
        let str = String(value)

        return Array.from(str)
        .filter(function (ch) {
            let code = ch.charCodeAt(0)

            return !(code <= 31 || code === 127)

        })
        .join('')

    }

    async function analyzeOne(inputFilePath) {
        try {
            let ext = path.extname(inputFilePath).toLowerCase()

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

                let sourceText = await fs.readFile(inputFilePath, 'utf8')

                let tokensForTabs = scanTokensTypescript(ts, sourceText, ext === '.tsx')

                let tabFixedText = convertTabsToFourSpacesOutsideTokens(
                sourceText,
                tokensForTabs.map(function (t) {
                    return { start: t.pos, end: t.end }

                }),
                )

                let huboCambiosDeTabs = tabFixedText !== sourceText

                if (
                    huboCambiosDeTabs
                ) {
                    await fs.writeFile(inputFilePath, tabFixedText, 'utf8')

                    sourceText = tabFixedText

                }

                let fixed = fixSemicolonsTypescript(inputFilePath, ts, sourceText, ext)

                let huboCambiosDePuntoYComa = fixed.fixedText !== sourceText

                if (
                    huboCambiosDePuntoYComa
                ) {
                    await fs.writeFile(inputFilePath, fixed.fixedText, 'utf8')

                    sourceText = fixed.fixedText

                }

                fixed.unfixableFindings.forEach(function (finding) {
                    issueCount += 1

                    let normalizedFilePath = normalize(finding.filePath)

                    process.stdout.write(
                    `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente ';' en la cabecera de un for  formatear/no-semicolon\n`,
                    )

                })

                let varConstFixed = fixVarConstToLetTypescript(inputFilePath, ts, sourceText, ext)

                let huboCambiosVarConst = varConstFixed.fixedText !== sourceText

                if (
                    huboCambiosVarConst
                ) {
                    await fs.writeFile(inputFilePath, varConstFixed.fixedText, 'utf8')

                    sourceText = varConstFixed.fixedText

                }

                let arrowFixed = fixArrowFunctionsToFunctionsTypescript(inputFilePath, ts, sourceText, ext)

                let huboCambiosDeArrows = arrowFixed.fixedText !== sourceText

                if (
                    huboCambiosDeArrows
                ) {
                    await fs.writeFile(inputFilePath, arrowFixed.fixedText, 'utf8')

                    sourceText = arrowFixed.fixedText

                }

                arrowFixed.unfixableFindings.forEach(function (finding) {
                    issueCount += 1

                    let normalizedFilePath = normalize(finding.filePath)

                    process.stdout.write(
                    `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente una función de flecha  formatear/no-arrow-function\n`,
                    )

                })

                let bracesFixed = fixMissingBracesIfTypescript(inputFilePath, ts, sourceText, ext)

                let huboCambiosDeLlaves = bracesFixed.fixedText !== sourceText

                if (
                    huboCambiosDeLlaves
                ) {
                    await fs.writeFile(inputFilePath, bracesFixed.fixedText, 'utf8')

                    sourceText = bracesFixed.fixedText

                }

                bracesFixed.unfixableFindings.forEach(function (finding) {
                    issueCount += 1

                    let normalizedFilePath = normalize(finding.filePath)

                    process.stdout.write(
                    `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente el uso de llaves en un if  formatear/require-braces\n`,
                    )

                })

                let commentsFixed = fixCommentsTypescript(inputFilePath, ts, sourceText, ext)

                let huboCambiosDeComentarios = commentsFixed.fixedText !== sourceText

                if (
                    huboCambiosDeComentarios
                ) {
                    await fs.writeFile(inputFilePath, commentsFixed.fixedText, 'utf8')

                    sourceText = commentsFixed.fixedText

                }

                let tokensForIndent = scanTokensTypescript(ts, sourceText, ext === '.tsx')

                let reindentedText = reindentFourSpacesOutsideTokens(
                sourceText,
                tokensForIndent.map(function (t) {
                    return { start: t.pos, end: t.end }

                }),
                tokensForIndent
                .filter(function (t) {
                    return t.text === '{' || t.text === '}'

                })
                .map(function (t) {
                    return { pos: t.pos, delta: t.text === '{' ? 1 : -1 }

                }),
                )

                let huboCambiosDeIndentacion = reindentedText !== sourceText

                if (
                    huboCambiosDeIndentacion
                ) {
                    await fs.writeFile(inputFilePath, reindentedText, 'utf8')

                    sourceText = reindentedText

                }

                let conditionIndentFixedText = fixIfSingleVariableConditionIndent(sourceText)

                let huboCambiosDeCondicionIndent = conditionIndentFixedText !== sourceText

                if (
                    huboCambiosDeCondicionIndent
                ) {
                    await fs.writeFile(inputFilePath, conditionIndentFixedText, 'utf8')

                    sourceText = conditionIndentFixedText

                }

                let noTrailingWhitespaceText = stripTrailingWhitespace(sourceText)

                let huboCambiosDeEspaciosFinales = noTrailingWhitespaceText !== sourceText

                if (
                    huboCambiosDeEspaciosFinales
                ) {
                    await fs.writeFile(inputFilePath, noTrailingWhitespaceText, 'utf8')

                    sourceText = noTrailingWhitespaceText

                }

                let scriptKind = ts.ScriptKind.TS

                let esTsx = ext === '.tsx'

                if (
                    esTsx
                ) {
                    scriptKind = ts.ScriptKind.TSX

                }

                let sourceFile = ts.createSourceFile(inputFilePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind)

                conditionFindings = collectConditionSingleVariableFindingsTypescript(sourceFile, inputFilePath, ts)

                findings = collectForbiddenFindingsTypescript(sourceFile, inputFilePath, forbiddenWords, ts)

            }

            let noEsTsFile = !isTsFile

            if (
                noEsTsFile
            ) {
                let sourceText = await fs.readFile(inputFilePath, 'utf8')

                let parsedForTabs = parseSourceMeriyah(parse, sourceText)

                let tabFixedText = convertTabsToFourSpacesOutsideTokens(
                sourceText,
                parsedForTabs.tokens.map(function (t) {
                    return { start: t.start, end: t.end }

                }),
                )

                let huboCambiosDeTabs = tabFixedText !== sourceText

                if (
                    huboCambiosDeTabs
                ) {
                    await fs.writeFile(inputFilePath, tabFixedText, 'utf8')

                    sourceText = tabFixedText

                }

                let fixed = fixSemicolonsMeriyah(inputFilePath, parse, sourceText)

                let huboCambiosDePuntoYComa = fixed.fixedText !== sourceText

                if (
                    huboCambiosDePuntoYComa
                ) {
                    await fs.writeFile(inputFilePath, fixed.fixedText, 'utf8')

                    sourceText = fixed.fixedText

                }

                fixed.unfixableFindings.forEach(function (finding) {
                    issueCount += 1

                    let normalizedFilePath = normalize(finding.filePath)

                    process.stdout.write(
                    `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente ';' en la cabecera de un for  formatear/no-semicolon\n`,
                    )

                })

                let varConstFixed = fixVarConstToLetMeriyah(inputFilePath, parse, sourceText)

                let huboCambiosVarConst = varConstFixed.fixedText !== sourceText

                if (
                    huboCambiosVarConst
                ) {
                    await fs.writeFile(inputFilePath, varConstFixed.fixedText, 'utf8')

                    sourceText = varConstFixed.fixedText

                }

                let arrowFixed = fixArrowFunctionsToFunctionsMeriyah(inputFilePath, parse, sourceText)

                let huboCambiosDeArrows = arrowFixed.fixedText !== sourceText

                if (
                    huboCambiosDeArrows
                ) {
                    await fs.writeFile(inputFilePath, arrowFixed.fixedText, 'utf8')

                    sourceText = arrowFixed.fixedText

                }

                arrowFixed.unfixableFindings.forEach(function (finding) {
                    issueCount += 1

                    let normalizedFilePath = normalize(finding.filePath)

                    process.stdout.write(
                    `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente una función de flecha  formatear/no-arrow-function\n`,
                    )

                })

                let bracesFixed = fixMissingBracesIfMeriyah(inputFilePath, parse, sourceText)

                let huboCambiosDeLlaves = bracesFixed.fixedText !== sourceText

                if (
                    huboCambiosDeLlaves
                ) {
                    await fs.writeFile(inputFilePath, bracesFixed.fixedText, 'utf8')

                    sourceText = bracesFixed.fixedText

                }

                bracesFixed.unfixableFindings.forEach(function (finding) {
                    issueCount += 1

                    let normalizedFilePath = normalize(finding.filePath)

                    process.stdout.write(
                    `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se puede corregir automáticamente el uso de llaves en un if  formatear/require-braces\n`,
                    )

                })

                let commentsFixed = fixCommentsMeriyah(inputFilePath, parse, sourceText)

                let huboCambiosDeComentarios = commentsFixed.fixedText !== sourceText

                if (
                    huboCambiosDeComentarios
                ) {
                    await fs.writeFile(inputFilePath, commentsFixed.fixedText, 'utf8')

                    sourceText = commentsFixed.fixedText

                }

                let parsedForIndent = parseSourceMeriyah(parse, sourceText)

                let reindentedText = reindentFourSpacesOutsideTokens(
                sourceText,
                parsedForIndent.tokens.map(function (t) {
                    return { start: t.start, end: t.end }

                }),
                parsedForIndent.tokens
                .filter(function (t) {
                    return t.text === '{' || t.text === '}'

                })
                .map(function (t) {
                    return { pos: t.start, delta: t.text === '{' ? 1 : -1 }

                }),
                )

                let huboCambiosDeIndentacion = reindentedText !== sourceText

                if (
                    huboCambiosDeIndentacion
                ) {
                    await fs.writeFile(inputFilePath, reindentedText, 'utf8')

                    sourceText = reindentedText

                }

                let conditionIndentFixedText = fixIfSingleVariableConditionIndent(sourceText)

                let huboCambiosDeCondicionIndent = conditionIndentFixedText !== sourceText

                if (
                    huboCambiosDeCondicionIndent
                ) {
                    await fs.writeFile(inputFilePath, conditionIndentFixedText, 'utf8')

                    sourceText = conditionIndentFixedText

                }

                let noTrailingWhitespaceText = stripTrailingWhitespace(sourceText)

                let huboCambiosDeEspaciosFinales = noTrailingWhitespaceText !== sourceText

                if (
                    huboCambiosDeEspaciosFinales
                ) {
                    await fs.writeFile(inputFilePath, noTrailingWhitespaceText, 'utf8')

                    sourceText = noTrailingWhitespaceText

                }

                let parsed = parseSourceMeriyah(parse, sourceText)

                conditionFindings = collectConditionSingleVariableFindingsMeriyah(parsed.ast, inputFilePath)

                findings = collectForbiddenFindingsMeriyah(parsed.ast, inputFilePath, forbiddenWords)

            }

            findings.forEach(function (finding) {
                issueCount += 1

                let normalizedFilePath = normalize(finding.filePath)

                let keyword = normalize(finding.keyword)

                let ruleIdValue =
                typeof finding.ruleId === 'string' && finding.ruleId.length > 0 ? finding.ruleId : 'formatear/unknown'

                let ruleId = normalize(ruleIdValue)

                process.stdout.write(
                `${normalizedFilePath}:${finding.line}:${finding.column}  error  No se debe usar la palabra «${keyword}»  ${ruleId}\n`,
                )

            })

            conditionFindings.forEach(function (finding) {
                issueCount += 1

                let normalizedFilePath = normalize(finding.filePath)

                process.stdout.write(
                `${normalizedFilePath}:${finding.line}:${finding.column}  error  La condición debe ser una sola variable  formatear/condition-single-variable\n`,
                )

            })

        } catch (error) {
            parseErrorCount += 1

            let message = error instanceof Error ? error.message : String(error)

            process.stderr.write(`${inputFilePath}  error  ${message}\n`)

        }
    }

    await files.reduce(function (prev, inputFilePath) {
        return prev.then(function () {
            return analyzeOne(inputFilePath)

        })

    }, Promise.resolve())

    let huboErroresDeParseo = parseErrorCount > 0

    if (
        huboErroresDeParseo
    ) {
        return 2

    }

    return issueCount > 0 ? 1 : 0

}

let exitCode = await run(process.argv.slice(2))

process.exitCode = exitCode
