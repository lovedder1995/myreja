import { addFinding, isSkippableIdentifierContext } from '../utils/meriyah_findings.mjs'

function collectBindingIdentifiers(
    pattern,
    out
) {
    let noEsNodo = !pattern || typeof pattern !== 'object'

    if (
        noEsNodo
    ) {
        return

    }

    let esLista = Array.isArray(
        pattern
    )

    if (
        esLista
    ) {
        pattern.forEach(
            function (
                item
            ) {
                collectBindingIdentifiers(
                    item,
                    out
                )

            }
        )

        return

    }

    let tipo = pattern.type

    let esIdentificador = tipo === 'Identifier'

    if (
        esIdentificador
    ) {
        out.push(
            pattern
        )

        return

    }

    let esRestElement = tipo === 'RestElement'

    if (
        esRestElement
    ) {
        collectBindingIdentifiers(
            pattern.argument,
            out
        )

        return

    }

    let esAssignmentPattern = tipo === 'AssignmentPattern'

    if (
        esAssignmentPattern
    ) {
        collectBindingIdentifiers(
            pattern.left,
            out
        )

        return

    }

    let esArrayPattern = tipo === 'ArrayPattern'

    if (
        esArrayPattern
    ) {
        collectBindingIdentifiers(
            pattern.elements,
            out
        )

        return

    }

    let esObjectPattern = tipo === 'ObjectPattern'

    if (
        esObjectPattern
    ) {
        collectBindingIdentifiers(
            pattern.properties,
            out
        )

        return

    }

    let esProperty = tipo === 'Property'

    if (
        esProperty
    ) {
        collectBindingIdentifiers(
            pattern.value,
            out
        )

        return

    }
}

function pushScope(
    stack,
    kind
) {
    stack.push(
        {
            kind,
            bindings: new Map()
        }
    )
}

function popScopeAndReport(
    stack,
    findings,
    filePath
) {
    let scope = stack.pop()

    let noHayScope = !scope

    if (
        noHayScope
    ) {
        return

    }

    scope.bindings.forEach(
        function (
            binding
        ) {
            let {
                name,
                node,
                reportable,
                used
            } = binding

            let noDebeReportar = !reportable || used

            if (
                noDebeReportar
            ) {
                return

            }

            let esIgnorable = typeof name === 'string' && name.startsWith(
                '_'
            )

            if (
                esIgnorable
            ) {
                return

            }

            addFinding(
                findings,
                filePath,
                name,
                node,
                'formatear/no-unused-vars'
            )

        }
    )
}

function findHoistTargetIndex(
    stack,
    index
) {
    let rangoVacio = index < 0

    if (
        rangoVacio
    ) {
        return 0

    }

    let scope = stack[index]

    let esScopeDeFuncion = scope.kind === 'function'
    let esScopeDePrograma = scope.kind === 'program'
    let esTarget = esScopeDeFuncion || esScopeDePrograma

    if (
        esTarget
    ) {
        return index

    }

    return findHoistTargetIndex(
        stack,
        index - 1
    )
}

function declareBinding(
    stack,
    name,
    node,
    reportable,
    kind
) {
    let noEsNombreValido = typeof name !== 'string' || name.length === 0

    if (
        noEsNombreValido
    ) {
        return

    }

    let scopeIndex = stack.length - 1

    let esVar = kind === 'var'

    if (
        esVar
    ) {
        scopeIndex = findHoistTargetIndex(
            stack,
            stack.length - 1
        )
    }

    let scope = stack[scopeIndex]

    let yaExiste = scope.bindings.has(
        name
    )

    if (
        yaExiste
    ) {
        return

    }

    scope.bindings.set(
        name,
        {
            name,
            node,
            reportable: Boolean(
                reportable
            ),
            used: false
        }
    )
}

function markUsed(
    stack,
    name
) {
    function search(
        index
    ) {
        let rangoVacio = index < 0

        if (
            rangoVacio
        ) {
            return

        }

        let scope = stack[index]
        let binding = scope.bindings.get(
            name
        )
        let hayBinding = Boolean(
            binding
        )

        if (
            hayBinding
        ) {
            binding.used = true
            return

        }

        return search(
            index - 1
        )
    }

    search(
        stack.length - 1
    )
}

function shouldTreatIdentifierAsReference(
    parent,
    key
) {
    let esIgnorablePorContexto = isSkippableIdentifierContext(
        parent,
        key
    )

    if (
        esIgnorablePorContexto
    ) {
        return false

    }

    let parentType = parent?.type

    let esVariableDeclaratorId = parentType === 'VariableDeclarator' && key === 'id'
    let esFunctionDeclarationId = parentType === 'FunctionDeclaration' && key === 'id'
    let esFunctionExpressionId = parentType === 'FunctionExpression' && key === 'id'
    let esClassDeclarationId = parentType === 'ClassDeclaration' && key === 'id'
    let esClassExpressionId = parentType === 'ClassExpression' && key === 'id'
    let esImportSpecifierLocal = parentType === 'ImportSpecifier' && key === 'local'
    let esImportDefaultSpecifierLocal = parentType === 'ImportDefaultSpecifier' && key === 'local'
    let esImportNamespaceSpecifierLocal = parentType === 'ImportNamespaceSpecifier' && key === 'local'
    let esExportSpecifierExported = parentType === 'ExportSpecifier' && key === 'exported'
    let esLabelDeLabeledStatement = parentType === 'LabeledStatement' && key === 'label'
    let esLabelDeBreak = parentType === 'BreakStatement' && key === 'label'
    let esLabelDeContinue = parentType === 'ContinueStatement' && key === 'label'
    let esCatchParam = parentType === 'CatchClause' && key === 'param'
    let esParamsDeFunctionDeclaration = parentType === 'FunctionDeclaration' && key === 'params'
    let esParamsDeFunctionExpression = parentType === 'FunctionExpression' && key === 'params'
    let esParamsDeArrowFunctionExpression = parentType === 'ArrowFunctionExpression' && key === 'params'
    let esShorthandValue =
    parentType === 'Property' && key === 'value' && parent.shorthand === true

    if (
        esShorthandValue
    ) {
        return true

    }

    let esBindingOContextoNoReferencia =
    esVariableDeclaratorId ||
    esFunctionDeclarationId ||
    esFunctionExpressionId ||
    esClassDeclarationId ||
    esClassExpressionId ||
    esImportSpecifierLocal ||
    esImportDefaultSpecifierLocal ||
    esImportNamespaceSpecifierLocal ||
    esExportSpecifierExported ||
    esLabelDeLabeledStatement ||
    esLabelDeBreak ||
    esLabelDeContinue ||
    esCatchParam ||
    esParamsDeFunctionDeclaration ||
    esParamsDeFunctionExpression ||
    esParamsDeArrowFunctionExpression

    if (
        esBindingOContextoNoReferencia
    ) {
        return false

    }

    return true
}

export function collectNoUnusedVarsFindingsMeriyah(
    ast,
    filePath
) {
    let findings = []

    let scopes = []
    pushScope(
        scopes,
        'program'
    )

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

        let nodeType = node.type

        let noTieneTipoValido = typeof nodeType !== 'string'

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

        let entraScopeDeFuncion =
        nodeType === 'FunctionDeclaration' ||
        nodeType === 'FunctionExpression' ||
        nodeType === 'ArrowFunctionExpression'

        if (
            entraScopeDeFuncion
        ) {
            let fnId = node.id
            let esFunctionDeclaration = nodeType === 'FunctionDeclaration'
            let hayFnId = fnId && fnId.type === 'Identifier'

            let debeDeclararNombre =
            esFunctionDeclaration && hayFnId

            if (
                debeDeclararNombre
            ) {
                declareBinding(
                    scopes,
                    fnId.name,
                    fnId,
                    true,
                    'let'
                )
            }

            pushScope(
                scopes,
                'function'
            )

            let params = []
            collectBindingIdentifiers(
                node.params,
                params
            )

            params.forEach(
                function (
                    id
                ) {
                    declareBinding(
                        scopes,
                        id.name,
                        id,
                        false,
                        'let'
                    )

                }
            )

            let debeDeclararNombreInterno =
            !esFunctionDeclaration && hayFnId

            if (
                debeDeclararNombreInterno
            ) {
                declareBinding(
                    scopes,
                    fnId.name,
                    fnId,
                    false,
                    'let'
                )
            }

            Object.entries(
                node
            ).forEach(
                function (
                    pair
                ) {
                    let childKey = pair[0]

                    let esClaveIgnorable =
                    childKey === 'loc' ||
                    childKey === 'range' ||
                    childKey === 'start' ||
                    childKey === 'end' ||
                    childKey === 'id' ||
                    childKey === 'params'

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

            popScopeAndReport(
                scopes,
                findings,
                filePath
            )

            return
        }

        let entraScopeDeBloque =
        nodeType === 'BlockStatement' ||
        nodeType === 'CatchClause' ||
        nodeType === 'ForStatement' ||
        nodeType === 'ForInStatement' ||
        nodeType === 'ForOfStatement' ||
        nodeType === 'SwitchStatement'

        if (
            entraScopeDeBloque
        ) {
            pushScope(
                scopes,
                'block'
            )

            let esCatchClause = nodeType === 'CatchClause'

            if (
                esCatchClause
            ) {
                let ids = []
                collectBindingIdentifiers(
                    node.param,
                    ids
                )

                ids.forEach(
                    function (
                        id
                    ) {
                        declareBinding(
                            scopes,
                            id.name,
                            id,
                            false,
                            'let'
                        )

                    }
                )
            }

            Object.entries(
                node
            ).forEach(
                function (
                    pair
                ) {
                    let childKey = pair[0]

                    let esClaveIgnorable =
                    childKey === 'loc' ||
                    childKey === 'range' ||
                    childKey === 'start' ||
                    childKey === 'end'

                    if (
                        esClaveIgnorable
                    ) {
                        return

                    }

                    let esCatchParam = esCatchClause && childKey === 'param'

                    if (
                        esCatchParam
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

            popScopeAndReport(
                scopes,
                findings,
                filePath
            )

            return
        }

        let esImportDeclaration = nodeType === 'ImportDeclaration'

        if (
            esImportDeclaration
        ) {
            node.specifiers.forEach(
                function (
                    spec
                ) {
                    let local = spec?.local
                    let esId = local && local.type === 'Identifier'

                    let noEsId = !esId

                    if (
                        noEsId
                    ) {
                        return
                    }

                    declareBinding(
                        scopes,
                        local.name,
                        local,
                        true,
                        'let'
                    )
                }
            )
        }

        let esVariableDeclaration = nodeType === 'VariableDeclaration'

        if (
            esVariableDeclaration
        ) {
            let ids = []

            node.declarations.forEach(
                function (
                    decl
                ) {
                    collectBindingIdentifiers(
                        decl.id,
                        ids
                    )
                }
            )

            ids.forEach(
                function (
                    id
                ) {
                    declareBinding(
                        scopes,
                        id.name,
                        id,
                        true,
                        node.kind
                    )
                }
            )
        }

        let esClassDeclaration = nodeType === 'ClassDeclaration'

        if (
            esClassDeclaration
        ) {
            let id = node.id
            let esId = id && id.type === 'Identifier'

            if (
                esId
            ) {
                declareBinding(
                    scopes,
                    id.name,
                    id,
                    true,
                    'let'
                )
            }
        }

        let esExportNamedDeclaration = nodeType === 'ExportNamedDeclaration'

        if (
            esExportNamedDeclaration
        ) {
            node.specifiers?.forEach(
                function (
                    spec
                ) {
                    let local = spec?.local
                    let esId = local && local.type === 'Identifier'

                    if (
                        esId
                    ) {
                        markUsed(
                            scopes,
                            local.name
                        )
                    }
                }
            )

            let decl = node.declaration
            let hayDecl = decl && typeof decl === 'object'

            if (
                hayDecl
            ) {
                let declType = decl.type
                let esVariableDeclaration = declType === 'VariableDeclaration'
                let esFunctionDeclaration = declType === 'FunctionDeclaration'
                let esClassDeclaration = declType === 'ClassDeclaration'
                let esFnOClase = esFunctionDeclaration || esClassDeclaration

                if (
                    esVariableDeclaration
                ) {
                    decl.declarations.forEach(
                        function (
                            d
                        ) {
                            let ids = []
                            collectBindingIdentifiers(
                                d.id,
                                ids
                            )
                            ids.forEach(
                                function (
                                    id
                                ) {
                                    declareBinding(
                                        scopes,
                                        id.name,
                                        id,
                                        true,
                                        decl.kind
                                    )
                                    markUsed(
                                        scopes,
                                        id.name
                                    )
                                }
                            )
                        }
                    )
                }

                if (
                    esFnOClase
                ) {
                    let id = decl.id
                    let esId = id && id.type === 'Identifier'

                    if (
                        esId
                    ) {
                        declareBinding(
                            scopes,
                            id.name,
                            id,
                            true,
                            'let'
                        )
                        markUsed(
                            scopes,
                            id.name
                        )
                    }
                }
            }
        }

        let esExportDefaultDeclaration = nodeType === 'ExportDefaultDeclaration'

        if (
            esExportDefaultDeclaration
        ) {
            let decl = node.declaration
            let esId = decl && decl.type === 'Identifier'

            if (
                esId
            ) {
                markUsed(
                    scopes,
                    decl.name
                )
            }
        }

        let esIdentifier = nodeType === 'Identifier'

        if (
            esIdentifier
        ) {
            let esReferencia = shouldTreatIdentifierAsReference(
                parent,
                key
            )

            if (
                esReferencia
            ) {
                markUsed(
                    scopes,
                    node.name
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

                let esClaveIgnorable =
                childKey === 'loc' ||
                childKey === 'range' ||
                childKey === 'start' ||
                childKey === 'end'

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

    function flushScopes() {
        let noHayScopes = scopes.length === 0

        if (
            noHayScopes
        ) {
            return
        }

        popScopeAndReport(
            scopes,
            findings,
            filePath
        )

        return flushScopes()
    }

    flushScopes()

    return findings
}
