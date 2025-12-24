// Verificar palabras prohibidas
import { addFinding, isSkippableIdentifierContext } from '../utils/meriyah_findings.mjs'

export function collectForbiddenFindingsMeriyah(
    ast,
    filePath,
    forbiddenWords
) {
    let findings = []

    function visit(
        node,
        parent,
        key
    ) {
        let noEsNodo = !node || typeof node !== 'object'

        if (
            noEsNodo
        ) {
            return

        }

        let esListaDeNodos = Array.isArray(
            node
        )

        if (
            esListaDeNodos
        ) {
            node.forEach(
                function (
                    item
                ) {
                    visit(
                        item,
                        parent,
                        key
                    )

                }
            )

            return

        }

        let noTieneTipoValido = typeof node.type !== 'string'

        if (
            noTieneTipoValido
        ) {
            Object.values(
                node
            ).forEach(
                function (
                    child
                ) {
                    visit(
                        child,
                        node,
                        undefined
                    )

                }
            )

            return

        }

        let {
            type: nodeType
        } = node

        let esAccessorProperty = nodeType === 'AccessorProperty'

        if (
            esAccessorProperty
        ) {
            let estaAccessorProhibido = forbiddenWords.has(
                'accessor'
            )

            if (
                estaAccessorProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'accessor',
                    node,
                    'formatear/no-accessor'
                )

            }
        }

        let esPropertySetter = nodeType === 'Property' && node.kind === 'set'
        let esMethodDefinitionSetter = nodeType === 'MethodDefinition' && node.kind === 'set'
        let esAlgunSetter = esPropertySetter || esMethodDefinitionSetter

        if (
            esAlgunSetter
        ) {
            let estaSetProhibido = forbiddenWords.has(
                'set'
            )

            if (
                estaSetProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'set',
                    node,
                    'formatear/no-set'
                )

            }
        }

        let esThisExpression = nodeType === 'ThisExpression'

        if (
            esThisExpression
        ) {
            let estaThisProhibido = forbiddenWords.has(
                'this'
            )

            if (
                estaThisProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'this',
                    node,
                    'formatear/no-this'
                )

            }
        }

        let esIfStatement = nodeType === 'IfStatement'

        if (
            esIfStatement
        ) {
            let estaIfProhibido = forbiddenWords.has(
                'if'
            )

            if (
                estaIfProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'if',
                    node,
                    'formatear/no-if'
                )

            }

            let tieneAlternate = Boolean(
                node.alternate
            )
            let estaElseProhibido = forbiddenWords.has(
                'else'
            )
            let debeMarcarElse = tieneAlternate && estaElseProhibido

            if (
                debeMarcarElse
            ) {
                addFinding(
                    findings,
                    filePath,
                    'else',
                    node.alternate,
                    'formatear/no-else'
                )

            }
        }

        let esReturnStatement = nodeType === 'ReturnStatement'

        if (
            esReturnStatement
        ) {
            let estaReturnProhibido = forbiddenWords.has(
                'return'
            )

            if (
                estaReturnProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'return',
                    node,
                    'formatear/no-return'
                )

            }
        }

        let esVariableDeclaration = nodeType === 'VariableDeclaration'

        if (
            esVariableDeclaration
        ) {
            let esVar = node.kind === 'var'
            let esLet = node.kind === 'let'
            let esConst = node.kind === 'const'
            let estaVarProhibido = forbiddenWords.has(
                'var'
            )
            let estaLetProhibido = forbiddenWords.has(
                'let'
            )
            let estaConstProhibido = forbiddenWords.has(
                'const'
            )
            let debeMarcarVar = esVar && estaVarProhibido
            let debeMarcarLet = esLet && estaLetProhibido
            let debeMarcarConst = esConst && estaConstProhibido

            if (
                debeMarcarVar
            ) {
                addFinding(
                    findings,
                    filePath,
                    'var',
                    node,
                    'formatear/no-var'
                )

            }

            if (
                debeMarcarLet
            ) {
                addFinding(
                    findings,
                    filePath,
                    'let',
                    node,
                    'formatear/no-let'
                )

            }

            if (
                debeMarcarConst
            ) {
                addFinding(
                    findings,
                    filePath,
                    'const',
                    node,
                    'formatear/no-const'
                )

            }
        }

        let esForStatement = nodeType === 'ForStatement'
        let esForInStatement = nodeType === 'ForInStatement'
        let esForOfStatement = nodeType === 'ForOfStatement'
        let esAlgunFor = esForStatement || esForInStatement || esForOfStatement

        if (
            esAlgunFor
        ) {
            let estaForProhibido = forbiddenWords.has(
                'for'
            )

            if (
                estaForProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'for',
                    node,
                    'formatear/no-for'
                )

            }

            let estaInProhibido = forbiddenWords.has(
                'in'
            )
            let estaOfProhibido = forbiddenWords.has(
                'of'
            )
            let debeMarcarIn = esForInStatement && estaInProhibido
            let debeMarcarOf = esForOfStatement && estaOfProhibido

            if (
                debeMarcarIn
            ) {
                addFinding(
                    findings,
                    filePath,
                    'in',
                    node,
                    'formatear/no-in'
                )

            }

            if (
                debeMarcarOf
            ) {
                addFinding(
                    findings,
                    filePath,
                    'of',
                    node,
                    'formatear/no-of'
                )

            }
        }

        let esWhileStatement = nodeType === 'WhileStatement'

        if (
            esWhileStatement
        ) {
            let estaWhileProhibido = forbiddenWords.has(
                'while'
            )

            if (
                estaWhileProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'while',
                    node,
                    'formatear/no-while'
                )

            }
        }

        let esDoWhileStatement = nodeType === 'DoWhileStatement'

        if (
            esDoWhileStatement
        ) {
            let estaDoProhibido = forbiddenWords.has(
                'do'
            )

            if (
                estaDoProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'do',
                    node,
                    'formatear/no-do'
                )

            }
        }

        let esSwitchStatement = nodeType === 'SwitchStatement'

        if (
            esSwitchStatement
        ) {
            let estaSwitchProhibido = forbiddenWords.has(
                'switch'
            )

            if (
                estaSwitchProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'switch',
                    node,
                    'formatear/no-switch'
                )

            }
        }

        let esSwitchCase = nodeType === 'SwitchCase'

        if (
            esSwitchCase
        ) {
            let tieneTest = Boolean(
                node.test
            )
            let estaCaseProhibido = forbiddenWords.has(
                'case'
            )
            let estaDefaultProhibido = forbiddenWords.has(
                'default'
            )
            let debeMarcarCase = tieneTest && estaCaseProhibido
            let debeMarcarDefault = !tieneTest && estaDefaultProhibido

            if (
                debeMarcarCase
            ) {
                addFinding(
                    findings,
                    filePath,
                    'case',
                    node,
                    'formatear/no-case'
                )

            }

            if (
                debeMarcarDefault
            ) {
                addFinding(
                    findings,
                    filePath,
                    'default',
                    node,
                    'formatear/no-default'
                )

            }
        }

        let esBreakStatement = nodeType === 'BreakStatement'

        if (
            esBreakStatement
        ) {
            let estaBreakProhibido = forbiddenWords.has(
                'break'
            )

            if (
                estaBreakProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'break',
                    node,
                    'formatear/no-break'
                )

            }
        }

        let esContinueStatement = nodeType === 'ContinueStatement'

        if (
            esContinueStatement
        ) {
            let estaContinueProhibido = forbiddenWords.has(
                'continue'
            )

            if (
                estaContinueProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'continue',
                    node,
                    'formatear/no-continue'
                )

            }
        }

        let esTryStatement = nodeType === 'TryStatement'

        if (
            esTryStatement
        ) {
            let estaTryProhibido = forbiddenWords.has(
                'try'
            )

            if (
                estaTryProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'try',
                    node,
                    'formatear/no-try'
                )

            }

            let tieneFinalizer = Boolean(
                node.finalizer
            )
            let estaFinallyProhibido = forbiddenWords.has(
                'finally'
            )
            let debeMarcarFinally = tieneFinalizer && estaFinallyProhibido

            if (
                debeMarcarFinally
            ) {
                addFinding(
                    findings,
                    filePath,
                    'finally',
                    node.finalizer,
                    'formatear/no-finally'
                )

            }
        }

        let esCatchClause = nodeType === 'CatchClause'

        if (
            esCatchClause
        ) {
            let estaCatchProhibido = forbiddenWords.has(
                'catch'
            )

            if (
                estaCatchProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'catch',
                    node,
                    'formatear/no-catch'
                )

            }
        }

        let esThrowStatement = nodeType === 'ThrowStatement'

        if (
            esThrowStatement
        ) {
            let estaThrowProhibido = forbiddenWords.has(
                'throw'
            )

            if (
                estaThrowProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'throw',
                    node,
                    'formatear/no-throw'
                )

            }
        }

        let esNewExpression = nodeType === 'NewExpression'

        if (
            esNewExpression
        ) {
            let estaNewProhibido = forbiddenWords.has(
                'new'
            )

            if (
                estaNewProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'new',
                    node,
                    'formatear/no-new'
                )

            }
        }

        let esUnaryExpression = nodeType === 'UnaryExpression'

        if (
            esUnaryExpression
        ) {
            let {
                operator: op
            } = node

            let esTypeof = op === 'typeof'
            let esVoid = op === 'void'
            let esDelete = op === 'delete'
            let estaTypeofProhibido = forbiddenWords.has(
                'typeof'
            )
            let estaVoidProhibido = forbiddenWords.has(
                'void'
            )
            let estaDeleteProhibido = forbiddenWords.has(
                'delete'
            )
            let debeMarcarTypeof = esTypeof && estaTypeofProhibido
            let debeMarcarVoid = esVoid && estaVoidProhibido
            let debeMarcarDelete = esDelete && estaDeleteProhibido

            if (
                debeMarcarTypeof
            ) {
                addFinding(
                    findings,
                    filePath,
                    'typeof',
                    node,
                    'formatear/no-typeof'
                )

            }

            if (
                debeMarcarVoid
            ) {
                addFinding(
                    findings,
                    filePath,
                    'void',
                    node,
                    'formatear/no-void'
                )

            }

            if (
                debeMarcarDelete
            ) {
                addFinding(
                    findings,
                    filePath,
                    'delete',
                    node,
                    'formatear/no-delete'
                )

            }
        }

        let esBinaryExpression = nodeType === 'BinaryExpression'

        if (
            esBinaryExpression
        ) {
            let {
                operator: op
            } = node

            let esIn = op === 'in'
            let esInstanceof = op === 'instanceof'
            let estaInProhibido = forbiddenWords.has(
                'in'
            )
            let estaInstanceofProhibido = forbiddenWords.has(
                'instanceof'
            )
            let debeMarcarIn = esIn && estaInProhibido
            let debeMarcarInstanceof = esInstanceof && estaInstanceofProhibido

            if (
                debeMarcarIn
            ) {
                addFinding(
                    findings,
                    filePath,
                    'in',
                    node,
                    'formatear/no-in'
                )

            }

            if (
                debeMarcarInstanceof
            ) {
                addFinding(
                    findings,
                    filePath,
                    'instanceof',
                    node,
                    'formatear/no-instanceof'
                )

            }
        }

        let esFunctionDeclaration = nodeType === 'FunctionDeclaration'
        let esFunctionExpression = nodeType === 'FunctionExpression'
        let esAlgunFunction = esFunctionDeclaration || esFunctionExpression

        if (
            esAlgunFunction
        ) {
            let estaFunctionProhibido = forbiddenWords.has(
                'function'
            )

            if (
                estaFunctionProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'function',
                    node,
                    'formatear/no-function'
                )

            }

            let esAsync = node.async === true
            let estaAsyncProhibido = forbiddenWords.has(
                'async'
            )
            let debeMarcarAsync = esAsync && estaAsyncProhibido

            if (
                debeMarcarAsync
            ) {
                addFinding(
                    findings,
                    filePath,
                    'async',
                    node,
                    'formatear/no-async'
                )

            }
        }

        let esArrowFunctionExpression = nodeType === 'ArrowFunctionExpression'

        if (
            esArrowFunctionExpression
        ) {
            let esAsync = node.async === true
            let estaAsyncProhibido = forbiddenWords.has(
                'async'
            )
            let debeMarcarAsync = esAsync && estaAsyncProhibido

            if (
                debeMarcarAsync
            ) {
                addFinding(
                    findings,
                    filePath,
                    'async',
                    node,
                    'formatear/no-async'
                )

            }
        }

        let esAwaitExpression = nodeType === 'AwaitExpression'

        if (
            esAwaitExpression
        ) {
            let estaAwaitProhibido = forbiddenWords.has(
                'await'
            )

            if (
                estaAwaitProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'await',
                    node,
                    'formatear/no-await'
                )

            }
        }

        let esYieldExpression = nodeType === 'YieldExpression'

        if (
            esYieldExpression
        ) {
            let estaYieldProhibido = forbiddenWords.has(
                'yield'
            )

            if (
                estaYieldProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'yield',
                    node,
                    'formatear/no-yield'
                )

            }
        }

        let esClassDeclaration = nodeType === 'ClassDeclaration'
        let esClassExpression = nodeType === 'ClassExpression'
        let esAlgunaClase = esClassDeclaration || esClassExpression

        if (
            esAlgunaClase
        ) {
            let estaClassProhibido = forbiddenWords.has(
                'class'
            )

            if (
                estaClassProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'class',
                    node,
                    'formatear/no-class'
                )

            }

            let tieneSuperClase = Boolean(
                node.superClass
            )
            let estaExtendsProhibido = forbiddenWords.has(
                'extends'
            )
            let debeMarcarExtends = tieneSuperClase && estaExtendsProhibido

            if (
                debeMarcarExtends
            ) {
                addFinding(
                    findings,
                    filePath,
                    'extends',
                    node.superClass,
                    'formatear/no-extends'
                )

            }
        }

        let esSuper = nodeType === 'Super'

        if (
            esSuper
        ) {
            let estaSuperProhibido = forbiddenWords.has(
                'super'
            )

            if (
                estaSuperProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'super',
                    node,
                    'formatear/no-super'
                )

            }
        }

        let esImportDeclaration = nodeType === 'ImportDeclaration'
        let esImportExpression = nodeType === 'ImportExpression'
        let esAlgunImport = esImportDeclaration || esImportExpression

        if (
            esAlgunImport
        ) {
            let estaImportProhibido = forbiddenWords.has(
                'import'
            )

            if (
                estaImportProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'import',
                    node,
                    'formatear/no-import'
                )

            }
        }

        let esExportNamedDeclaration = nodeType === 'ExportNamedDeclaration'
        let esExportDefaultDeclaration = nodeType === 'ExportDefaultDeclaration'
        let esExportAllDeclaration = nodeType === 'ExportAllDeclaration'
        let esAlgunExport = esExportNamedDeclaration || esExportDefaultDeclaration || esExportAllDeclaration

        if (
            esAlgunExport
        ) {
            let estaExportProhibido = forbiddenWords.has(
                'export'
            )

            if (
                estaExportProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'export',
                    node,
                    'formatear/no-export'
                )

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
            let estaTargetProhibido = forbiddenWords.has(
                'target'
            )
            let debeMarcarTarget = esNewTarget && estaTargetProhibido

            if (
                debeMarcarTarget
            ) {
                addFinding(
                    findings,
                    filePath,
                    'target',
                    node,
                    'formatear/no-target'
                )

            }

            let esImportMeta = metaName === 'import' && propertyName === 'meta'
            let estaMetaProhibido = forbiddenWords.has(
                'meta'
            )
            let debeMarcarMeta = esImportMeta && estaMetaProhibido

            if (
                debeMarcarMeta
            ) {
                addFinding(
                    findings,
                    filePath,
                    'meta',
                    node,
                    'formatear/no-meta'
                )

            }
        }

        let esWithStatement = nodeType === 'WithStatement'

        if (
            esWithStatement
        ) {
            let estaWithProhibido = forbiddenWords.has(
                'with'
            )

            if (
                estaWithProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'with',
                    node,
                    'formatear/no-with'
                )

            }
        }

        let esDebuggerStatement = nodeType === 'DebuggerStatement'

        if (
            esDebuggerStatement
        ) {
            let estaDebuggerProhibido = forbiddenWords.has(
                'debugger'
            )

            if (
                estaDebuggerProhibido
            ) {
                addFinding(
                    findings,
                    filePath,
                    'debugger',
                    node,
                    'formatear/no-debugger'
                )

            }
        }

        let esIdentifier = nodeType === 'Identifier'

        if (
            esIdentifier
        ) {
            let nombreIdentificador = node.name
            let esNombreString = typeof nombreIdentificador === 'string'
            let esNombreProhibido = esNombreString && forbiddenWords.has(
                nombreIdentificador
            )
            let esContextoOmitible = isSkippableIdentifierContext(
                parent,
                key
            )
            let debeMarcarIdentificador = esNombreProhibido && !esContextoOmitible

            if (
                debeMarcarIdentificador
            ) {
                addFinding(
                    findings,
                    filePath,
                    nombreIdentificador,
                    node,
                    `formatear/no-${nombreIdentificador}`
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

                let esClaveIgnorable = childKey === 'loc' || childKey === 'range' || childKey === 'start' || childKey === 'end'

                if (
                    esClaveIgnorable
                ) {
                    return

                }

                visit(
                    pair[1],
                    node,
                    childKey
                )

            }
        )

    }

    visit(
        ast,
        null,
        undefined
    )

    return findings

}

