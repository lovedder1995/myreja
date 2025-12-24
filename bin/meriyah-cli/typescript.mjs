import { applyReplacements, isInsideAnySpan } from './formatting.mjs'

export function createTsFinding(
    findings,
    filePath,
    keyword,
    ruleId,
    sourceFile,
    pos
) {
    let lc = sourceFile.getLineAndCharacterOfPosition(
        pos
    )

    findings.push(
        {
            filePath,
            line: lc.line + 1,
            column: lc.character,
            keyword,
            ruleId
        }
    )

}

export function isSkippableTsIdentifierContext(
    parent,
    node,
    ts
) {
    let noHayNodoPadre = !parent

    if (
        noHayNodoPadre
    ) {
        return false

    }

    let esPropertyAccessExpression = ts.isPropertyAccessExpression(
        parent
    )

    let esNombreDePropertyAccessExpression = esPropertyAccessExpression && parent.name === node

    if (
        esNombreDePropertyAccessExpression
    ) {
        return true

    }

    let esPropertyAssignment = ts.isPropertyAssignment(
        parent
    )

    let esNombreDePropertyAssignment = esPropertyAssignment && parent.name === node

    if (
        esNombreDePropertyAssignment
    ) {
        return true

    }

    let esMethodDeclaration = ts.isMethodDeclaration(
        parent
    )

    let esNombreDeMethodDeclaration = esMethodDeclaration && parent.name === node

    if (
        esNombreDeMethodDeclaration
    ) {
        return true

    }

    let esMethodSignature = ts.isMethodSignature(
        parent
    )

    let esNombreDeMethodSignature = esMethodSignature && parent.name === node

    if (
        esNombreDeMethodSignature
    ) {
        return true

    }

    let esPropertyDeclaration = ts.isPropertyDeclaration(
        parent
    )

    let esNombreDePropertyDeclaration = esPropertyDeclaration && parent.name === node

    if (
        esNombreDePropertyDeclaration
    ) {
        return true

    }

    let esPropertySignature = ts.isPropertySignature(
        parent
    )

    let esNombreDePropertySignature = esPropertySignature && parent.name === node

    if (
        esNombreDePropertySignature
    ) {
        return true

    }

    let esGetAccessorDeclaration = ts.isGetAccessorDeclaration(
        parent
    )

    let esNombreDeGetAccessorDeclaration = esGetAccessorDeclaration && parent.name === node

    if (
        esNombreDeGetAccessorDeclaration
    ) {
        return true

    }

    let esSetAccessorDeclaration = ts.isSetAccessorDeclaration(
        parent
    )

    let esNombreDeSetAccessorDeclaration = esSetAccessorDeclaration && parent.name === node

    if (
        esNombreDeSetAccessorDeclaration
    ) {
        return true

    }

    let esShorthandPropertyAssignment = ts.isShorthandPropertyAssignment(
        parent
    )

    let esNombreDeShorthandPropertyAssignment = esShorthandPropertyAssignment && parent.name === node

    if (
        esNombreDeShorthandPropertyAssignment
    ) {
        return true

    }

    let esEnumMember = ts.isEnumMember(
        parent
    )

    let esNombreDeEnumMember = esEnumMember && parent.name === node

    if (
        esNombreDeEnumMember
    ) {
        return true

    }

    return false

}

export function collectForbiddenFindingsTypescript(
    sourceFile,
    filePath,
    forbiddenWords,
    ts
) {
    let findings = []

    function addKeywordNode(
        keyword,
        node,
        ruleId
    ) {
        createTsFinding(
            findings,
            filePath,
            keyword,
            ruleId,
            sourceFile,
            node.getStart(
                sourceFile
            )
        )

    }

    function addModifier(
        keyword,
        modifier,
        ruleId
    ) {
        createTsFinding(
            findings,
            filePath,
            keyword,
            ruleId,
            sourceFile,
            modifier.getStart(
                sourceFile
            )
        )

    }

    function visit(
        node,
        parent
    ) {
        let {
            kind
        } = node

        let esThisKeyword = kind === ts.SyntaxKind.ThisKeyword

        if (
            esThisKeyword
        ) {
            let estaThisProhibido = forbiddenWords.has(
                'this'
            )

            if (
                estaThisProhibido
            ) {
                addKeywordNode(
                    'this',
                    node,
                    'formatear/no-this'
                )

            }
        }

        let esIfStatement = kind === ts.SyntaxKind.IfStatement

        if (
            esIfStatement
        ) {
            let estaIfProhibido = forbiddenWords.has(
                'if'
            )

            if (
                estaIfProhibido
            ) {
                addKeywordNode(
                    'if',
                    node,
                    'formatear/no-if'
                )

            }

            let hayElseStatement = Boolean(
                node.elseStatement
            )

            let estaElseProhibido = forbiddenWords.has(
                'else'
            )

            let debeMarcarElse = hayElseStatement && estaElseProhibido

            if (
                debeMarcarElse
            ) {
                addKeywordNode(
                    'else',
                    node.elseStatement,
                    'formatear/no-else'
                )

            }
        }

        let esReturnStatement = kind === ts.SyntaxKind.ReturnStatement

        if (
            esReturnStatement
        ) {
            let estaReturnProhibido = forbiddenWords.has(
                'return'
            )

            if (
                estaReturnProhibido
            ) {
                addKeywordNode(
                    'return',
                    node,
                    'formatear/no-return'
                )

            }
        }

        let esForStatement = kind === ts.SyntaxKind.ForStatement

        let esForInStatement = kind === ts.SyntaxKind.ForInStatement

        let esForOfStatement = kind === ts.SyntaxKind.ForOfStatement

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
                addKeywordNode(
                    'for',
                    node,
                    'formatear/no-for'
                )

            }

            let estaInProhibido = forbiddenWords.has(
                'in'
            )

            let debeMarcarIn = esForInStatement && estaInProhibido

            if (
                debeMarcarIn
            ) {
                addKeywordNode(
                    'in',
                    node,
                    'formatear/no-in'
                )

            }

            let estaOfProhibido = forbiddenWords.has(
                'of'
            )

            let debeMarcarOf = esForOfStatement && estaOfProhibido

            if (
                debeMarcarOf
            ) {
                addKeywordNode(
                    'of',
                    node,
                    'formatear/no-of'
                )

            }
        }

        let esWhileStatement = kind === ts.SyntaxKind.WhileStatement

        if (
            esWhileStatement
        ) {
            let estaWhileProhibido = forbiddenWords.has(
                'while'
            )

            if (
                estaWhileProhibido
            ) {
                addKeywordNode(
                    'while',
                    node,
                    'formatear/no-while'
                )

            }
        }

        let esDoStatement = kind === ts.SyntaxKind.DoStatement

        if (
            esDoStatement
        ) {
            let estaDoProhibido = forbiddenWords.has(
                'do'
            )

            if (
                estaDoProhibido
            ) {
                addKeywordNode(
                    'do',
                    node,
                    'formatear/no-do'
                )

            }
        }

        let esSwitchStatement = kind === ts.SyntaxKind.SwitchStatement

        if (
            esSwitchStatement
        ) {
            let estaSwitchProhibido = forbiddenWords.has(
                'switch'
            )

            if (
                estaSwitchProhibido
            ) {
                addKeywordNode(
                    'switch',
                    node,
                    'formatear/no-switch'
                )

            }
        }

        let esCaseClause = kind === ts.SyntaxKind.CaseClause

        if (
            esCaseClause
        ) {
            let estaCaseProhibido = forbiddenWords.has(
                'case'
            )

            if (
                estaCaseProhibido
            ) {
                addKeywordNode(
                    'case',
                    node,
                    'formatear/no-case'
                )

            }
        }

        let esDefaultClause = kind === ts.SyntaxKind.DefaultClause

        if (
            esDefaultClause
        ) {
            let estaDefaultProhibido = forbiddenWords.has(
                'default'
            )

            if (
                estaDefaultProhibido
            ) {
                addKeywordNode(
                    'default',
                    node,
                    'formatear/no-default'
                )

            }
        }

        let esBreakStatement = kind === ts.SyntaxKind.BreakStatement

        if (
            esBreakStatement
        ) {
            let estaBreakProhibido = forbiddenWords.has(
                'break'
            )

            if (
                estaBreakProhibido
            ) {
                addKeywordNode(
                    'break',
                    node,
                    'formatear/no-break'
                )

            }
        }

        let esContinueStatement = kind === ts.SyntaxKind.ContinueStatement

        if (
            esContinueStatement
        ) {
            let estaContinueProhibido = forbiddenWords.has(
                'continue'
            )

            if (
                estaContinueProhibido
            ) {
                addKeywordNode(
                    'continue',
                    node,
                    'formatear/no-continue'
                )

            }
        }

        let esTryStatement = kind === ts.SyntaxKind.TryStatement

        if (
            esTryStatement
        ) {
            let estaTryProhibido = forbiddenWords.has(
                'try'
            )

            if (
                estaTryProhibido
            ) {
                addKeywordNode(
                    'try',
                    node,
                    'formatear/no-try'
                )

            }

            let hayFinallyBlock = Boolean(
                node.finallyBlock
            )

            let estaFinallyProhibido = forbiddenWords.has(
                'finally'
            )

            let debeMarcarFinally = hayFinallyBlock && estaFinallyProhibido

            if (
                debeMarcarFinally
            ) {
                addKeywordNode(
                    'finally',
                    node.finallyBlock,
                    'formatear/no-finally'
                )

            }
        }

        let esCatchClause = kind === ts.SyntaxKind.CatchClause

        if (
            esCatchClause
        ) {
            let estaCatchProhibido = forbiddenWords.has(
                'catch'
            )

            if (
                estaCatchProhibido
            ) {
                addKeywordNode(
                    'catch',
                    node,
                    'formatear/no-catch'
                )

            }
        }

        let esThrowStatement = kind === ts.SyntaxKind.ThrowStatement

        if (
            esThrowStatement
        ) {
            let estaThrowProhibido = forbiddenWords.has(
                'throw'
            )

            if (
                estaThrowProhibido
            ) {
                addKeywordNode(
                    'throw',
                    node,
                    'formatear/no-throw'
                )

            }
        }

        let esNewExpression = kind === ts.SyntaxKind.NewExpression

        if (
            esNewExpression
        ) {
            let estaNewProhibido = forbiddenWords.has(
                'new'
            )

            if (
                estaNewProhibido
            ) {
                addKeywordNode(
                    'new',
                    node,
                    'formatear/no-new'
                )

            }
        }

        let esTypeOfExpression = kind === ts.SyntaxKind.TypeOfExpression

        if (
            esTypeOfExpression
        ) {
            let estaTypeofProhibido = forbiddenWords.has(
                'typeof'
            )

            if (
                estaTypeofProhibido
            ) {
                addKeywordNode(
                    'typeof',
                    node,
                    'formatear/no-typeof'
                )

            }
        }

        let esVoidExpression = kind === ts.SyntaxKind.VoidExpression

        if (
            esVoidExpression
        ) {
            let estaVoidProhibido = forbiddenWords.has(
                'void'
            )

            if (
                estaVoidProhibido
            ) {
                addKeywordNode(
                    'void',
                    node,
                    'formatear/no-void'
                )

            }
        }

        let esDeleteExpression = kind === ts.SyntaxKind.DeleteExpression

        if (
            esDeleteExpression
        ) {
            let estaDeleteProhibido = forbiddenWords.has(
                'delete'
            )

            if (
                estaDeleteProhibido
            ) {
                addKeywordNode(
                    'delete',
                    node,
                    'formatear/no-delete'
                )

            }
        }

        let esBinaryExpression = kind === ts.SyntaxKind.BinaryExpression

        if (
            esBinaryExpression
        ) {
            let {
                operatorToken
            } = node

            let {
                kind: operatorKind
            } = operatorToken || {}

            let esInKeyword = operatorKind === ts.SyntaxKind.InKeyword

            let estaInProhibido = forbiddenWords.has(
                'in'
            )

            let debeMarcarIn = esInKeyword && estaInProhibido

            if (
                debeMarcarIn
            ) {
                addKeywordNode(
                    'in',
                    node,
                    'formatear/no-in'
                )

            }

            let esInstanceOfKeyword = operatorKind === ts.SyntaxKind.InstanceOfKeyword

            let estaInstanceofProhibido = forbiddenWords.has(
                'instanceof'
            )

            let debeMarcarInstanceof = esInstanceOfKeyword && estaInstanceofProhibido

            if (
                debeMarcarInstanceof
            ) {
                addKeywordNode(
                    'instanceof',
                    node,
                    'formatear/no-instanceof'
                )

            }
        }

        let esFunctionDeclaration = kind === ts.SyntaxKind.FunctionDeclaration

        let esFunctionExpression = kind === ts.SyntaxKind.FunctionExpression

        let esAlgunaFuncion = esFunctionDeclaration || esFunctionExpression

        if (
            esAlgunaFuncion
        ) {
            let estaFunctionProhibido = forbiddenWords.has(
                'function'
            )

            if (
                estaFunctionProhibido
            ) {
                addKeywordNode(
                    'function',
                    node,
                    'formatear/no-function'
                )

            }
        }

        let esClassDeclaration = kind === ts.SyntaxKind.ClassDeclaration

        let esClassExpression = kind === ts.SyntaxKind.ClassExpression

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
                addKeywordNode(
                    'class',
                    node,
                    'formatear/no-class'
                )

            }
        }

        let esSuperKeyword = kind === ts.SyntaxKind.SuperKeyword

        if (
            esSuperKeyword
        ) {
            let estaSuperProhibido = forbiddenWords.has(
                'super'
            )

            if (
                estaSuperProhibido
            ) {
                addKeywordNode(
                    'super',
                    node,
                    'formatear/no-super'
                )

            }
        }

        let esAwaitExpression = kind === ts.SyntaxKind.AwaitExpression

        if (
            esAwaitExpression
        ) {
            let estaAwaitProhibido = forbiddenWords.has(
                'await'
            )

            if (
                estaAwaitProhibido
            ) {
                addKeywordNode(
                    'await',
                    node,
                    'formatear/no-await'
                )

            }
        }

        let esYieldExpression = kind === ts.SyntaxKind.YieldExpression

        if (
            esYieldExpression
        ) {
            let estaYieldProhibido = forbiddenWords.has(
                'yield'
            )

            if (
                estaYieldProhibido
            ) {
                addKeywordNode(
                    'yield',
                    node,
                    'formatear/no-yield'
                )

            }
        }

        let esInterfaceDeclaration = kind === ts.SyntaxKind.InterfaceDeclaration

        if (
            esInterfaceDeclaration
        ) {
            let estaInterfaceProhibido = forbiddenWords.has(
                'interface'
            )

            if (
                estaInterfaceProhibido
            ) {
                addKeywordNode(
                    'interface',
                    node,
                    'formatear/no-interface'
                )

            }
        }

        let esEnumDeclaration = kind === ts.SyntaxKind.EnumDeclaration

        if (
            esEnumDeclaration
        ) {
            let estaEnumProhibido = forbiddenWords.has(
                'enum'
            )

            if (
                estaEnumProhibido
            ) {
                addKeywordNode(
                    'enum',
                    node,
                    'formatear/no-enum'
                )

            }
        }

        let esMetaProperty = kind === ts.SyntaxKind.MetaProperty

        if (
            esMetaProperty
        ) {
            let {
                keywordToken,
                name: nameNode
            } = node

            let {
                escapedText: name
            } = nameNode || {}

            let esNewKeyword = keywordToken === ts.SyntaxKind.NewKeyword

            let esNombreTarget = name === 'target'

            let estaTargetProhibido = forbiddenWords.has(
                'target'
            )

            let debeMarcarTarget = esNewKeyword && esNombreTarget && estaTargetProhibido

            if (
                debeMarcarTarget
            ) {
                addKeywordNode(
                    'target',
                    node,
                    'formatear/no-target'
                )

            }

            let esImportKeyword = keywordToken === ts.SyntaxKind.ImportKeyword

            let esNombreMeta = name === 'meta'

            let estaMetaProhibido = forbiddenWords.has(
                'meta'
            )

            let debeMarcarMeta = esImportKeyword && esNombreMeta && estaMetaProhibido

            if (
                debeMarcarMeta
            ) {
                addKeywordNode(
                    'meta',
                    node,
                    'formatear/no-meta'
                )

            }
        }

        let esAsExpression = kind === ts.SyntaxKind.AsExpression

        if (
            esAsExpression
        ) {
            let estaAsProhibido = forbiddenWords.has(
                'as'
            )

            if (
                estaAsProhibido
            ) {
                addKeywordNode(
                    'as',
                    node,
                    'formatear/no-as'
                )

            }
        }

        let esWithStatement = kind === ts.SyntaxKind.WithStatement

        if (
            esWithStatement
        ) {
            let estaWithProhibido = forbiddenWords.has(
                'with'
            )

            if (
                estaWithProhibido
            ) {
                addKeywordNode(
                    'with',
                    node,
                    'formatear/no-with'
                )

            }
        }

        let esDebuggerStatement = kind === ts.SyntaxKind.DebuggerStatement

        if (
            esDebuggerStatement
        ) {
            let estaDebuggerProhibido = forbiddenWords.has(
                'debugger'
            )

            if (
                estaDebuggerProhibido
            ) {
                addKeywordNode(
                    'debugger',
                    node,
                    'formatear/no-debugger'
                )

            }
        }

        let esVariableStatement = kind === ts.SyntaxKind.VariableStatement

        if (
            esVariableStatement
        ) {
            let {
                declarationList: declList
            } = node

            let {
                flags = 0
            } = declList || {}

            let estaConstProhibido = forbiddenWords.has(
                'const'
            )

            let tieneFlagConst = (flags & ts.NodeFlags.Const) !== 0

            let debeMarcarConst = estaConstProhibido && tieneFlagConst

            if (
                debeMarcarConst
            ) {
                addKeywordNode(
                    'const',
                    node,
                    'formatear/no-const'
                )

            }

            let estaLetProhibido = forbiddenWords.has(
                'let'
            )

            let tieneFlagLet = (flags & ts.NodeFlags.Let) !== 0

            let debeMarcarLet = estaLetProhibido && tieneFlagLet

            if (
                debeMarcarLet
            ) {
                addKeywordNode(
                    'let',
                    node,
                    'formatear/no-let'
                )

            }

            let estaVarProhibido = forbiddenWords.has(
                'var'
            )

            let tieneFlagConstOLet = (flags & (ts.NodeFlags.Const | ts.NodeFlags.Let)) !== 0

            let debeMarcarVar = estaVarProhibido && !tieneFlagConstOLet

            if (
                debeMarcarVar
            ) {
                addKeywordNode(
                    'var',
                    node,
                    'formatear/no-var'
                )

            }
        }

        let esConstructor = kind === ts.SyntaxKind.Constructor

        if (
            esConstructor
        ) {
            let estaConstructorProhibido = forbiddenWords.has(
                'constructor'
            )

            if (
                estaConstructorProhibido
            ) {
                addKeywordNode(
                    'constructor',
                    node,
                    'formatear/no-constructor'
                )

            }
        }

        let esIdentifier = kind === ts.SyntaxKind.Identifier

        if (
            esIdentifier
        ) {
            let {
                escapedText: name
            } = node

            let esNombreString = typeof name === 'string'

            let esNombreProhibido = esNombreString && forbiddenWords.has(
                name
            )

            let esContextoOmitible = isSkippableTsIdentifierContext(
                parent,
                node,
                ts
            )

            let debeMarcarIdentificador = esNombreProhibido && !esContextoOmitible

            if (
                debeMarcarIdentificador
            ) {
                addKeywordNode(
                    name,
                    node,
                    `formatear/no-${name}`
                )

            }
        }

        let {
            modifiers
        } = node

        let hayModificadores = Boolean(
            modifiers && modifiers.length
        )

        if (
            hayModificadores
        ) {
            modifiers.forEach(
                function (
                    modifier
                ) {
                    let {
                        kind: modifierKind
                    } = modifier

                    let esPublicKeyword = modifierKind === ts.SyntaxKind.PublicKeyword

                    if (
                        esPublicKeyword
                    ) {
                        let estaPublicProhibido = forbiddenWords.has(
                            'public'
                        )

                        if (
                            estaPublicProhibido
                        ) {
                            addModifier(
                                'public',
                                modifier,
                                'formatear/no-public'
                            )

                        }

                        return

                    }
                    let esPrivateKeyword = modifierKind === ts.SyntaxKind.PrivateKeyword

                    if (
                        esPrivateKeyword
                    ) {
                        let estaPrivateProhibido = forbiddenWords.has(
                            'private'
                        )

                        if (
                            estaPrivateProhibido
                        ) {
                            addModifier(
                                'private',
                                modifier,
                                'formatear/no-private'
                            )

                        }

                        return

                    }
                    let esProtectedKeyword = modifierKind === ts.SyntaxKind.ProtectedKeyword

                    if (
                        esProtectedKeyword
                    ) {
                        let estaProtectedProhibido = forbiddenWords.has(
                            'protected'
                        )

                        if (
                            estaProtectedProhibido
                        ) {
                            addModifier(
                                'protected',
                                modifier,
                                'formatear/no-protected'
                            )

                        }

                        return

                    }
                    let esStaticKeyword = modifierKind === ts.SyntaxKind.StaticKeyword

                    if (
                        esStaticKeyword
                    ) {
                        let estaStaticProhibido = forbiddenWords.has(
                            'static'
                        )

                        if (
                            estaStaticProhibido
                        ) {
                            addModifier(
                                'static',
                                modifier,
                                'formatear/no-static'
                            )

                        }

                        return

                    }
                    let esAsyncKeyword = modifierKind === ts.SyntaxKind.AsyncKeyword

                    if (
                        esAsyncKeyword
                    ) {
                        let estaAsyncProhibido = forbiddenWords.has(
                            'async'
                        )

                        if (
                            estaAsyncProhibido
                        ) {
                            addModifier(
                                'async',
                                modifier,
                                'formatear/no-async'
                            )

                        }

                        return

                    }
                    let esAccessorKeyword = modifierKind === ts.SyntaxKind.AccessorKeyword

                    if (
                        esAccessorKeyword
                    ) {
                        let estaAccessorProhibido = forbiddenWords.has(
                            'accessor'
                        )

                        if (
                            estaAccessorProhibido
                        ) {
                            addModifier(
                                'accessor',
                                modifier,
                                'formatear/no-accessor'
                            )

                        }
                    }
                }
            )

        }

        let {
            heritageClauses
        } = node

        let hayHeritageClauses = Boolean(
            heritageClauses && heritageClauses.length
        )

        if (
            hayHeritageClauses
        ) {
            heritageClauses.forEach(
                function (
                    clause
                ) {
                    let esExtendsKeyword = clause.token === ts.SyntaxKind.ExtendsKeyword

                    let estaExtendsProhibido = forbiddenWords.has(
                        'extends'
                    )

                    let debeMarcarExtends = esExtendsKeyword && estaExtendsProhibido

                    if (
                        debeMarcarExtends
                    ) {
                        addKeywordNode(
                            'extends',
                            clause,
                            'formatear/no-extends'
                        )

                    }

                    let esImplementsKeyword = clause.token === ts.SyntaxKind.ImplementsKeyword

                    let estaImplementsProhibido = forbiddenWords.has(
                        'implements'
                    )

                    let debeMarcarImplements = esImplementsKeyword && estaImplementsProhibido

                    if (
                        debeMarcarImplements
                    ) {
                        addKeywordNode(
                            'implements',
                            clause,
                            'formatear/no-implements'
                        )

                    }
                }
            )

        }

        ts.forEachChild(
            node,
            function (
                child
            ) {
                visit(
                    child,
                    node
                )

            }
        )

    }

    visit(
        sourceFile,
        null
    )

    return findings

}

export function collectConditionSingleVariableFindingsTypescript(
    sourceFile,
    filePath,
    ts
) {
    let findings = []

    function addExpressionFinding(
        expr
    ) {
        let noEsExpresion = !expr || typeof expr !== 'object'

        if (
            noEsExpresion
        ) {
            return

        }

        let esIdentificador = expr.kind === ts.SyntaxKind.Identifier

        if (
            esIdentificador
        ) {
            return

        }

        createTsFinding(
            findings,
            filePath,
            'condicion',
            'formatear/condition-single-variable',
            sourceFile,
            expr.getStart(
                sourceFile
            )
        )

    }

    function visit(
        node
    ) {
        let {
            kind
        } = node

        let esIfStatement = kind === ts.SyntaxKind.IfStatement

        if (
            esIfStatement
        ) {
            addExpressionFinding(
                node.expression
            )

        }

        let esWhileStatement = kind === ts.SyntaxKind.WhileStatement

        if (
            esWhileStatement
        ) {
            addExpressionFinding(
                node.expression
            )

        }

        let esDoStatement = kind === ts.SyntaxKind.DoStatement

        if (
            esDoStatement
        ) {
            addExpressionFinding(
                node.expression
            )

        }

        let esForStatement = kind === ts.SyntaxKind.ForStatement

        if (
            esForStatement
        ) {
            let hayCondicion = Boolean(
                node.condition
            )

            if (
                hayCondicion
            ) {
                addExpressionFinding(
                    node.condition
                )

            }
        }

        ts.forEachChild(
            node,
            visit
        )

    }

    visit(
        sourceFile
    )

    return findings

}

export function collectEmptyStatementRangesTypescript(
    sourceFile,
    ts
) {
    let ranges = []

    function visit(
        node
    ) {
        let esEmptyStatement = node.kind === ts.SyntaxKind.EmptyStatement

        if (
            esEmptyStatement
        ) {
            let start = node.getStart(
                sourceFile
            )

            let end = node.getEnd()

            let rangoValido = typeof start === 'number' && typeof end === 'number' && end > start

            if (
                rangoValido
            ) {
                ranges.push(
                    {
                        start,
                        end
                    }
                )

            }
        }
        ts.forEachChild(
            node,
            visit
        )

    }

    visit(
        sourceFile
    )

    return ranges

}

export function collectForHeaderSpansFromTsTokens(
    tokens,
    ts
) {
    let spans = []

    function scanFrom(
        i
    ) {
        let excedeLongitudDeTokens = i >= tokens.length

        if (
            excedeLongitudDeTokens
        ) {
            return spans

        }

        let noEsFor = tokens[i].kind !== ts.SyntaxKind.ForKeyword

        if (
            noEsFor
        ) {
            return scanFrom(
                i + 1
            )

        }

        let j = i + 1

        let hayAwait = tokens[j] && tokens[j].kind === ts.SyntaxKind.AwaitKeyword

        if (
            hayAwait
        ) {
            j += 1

        }

        let openParenToken = tokens[j]

        let noHayParentesisDeApertura = !openParenToken || openParenToken.kind !== ts.SyntaxKind.OpenParenToken

        if (
            noHayParentesisDeApertura
        ) {
            return scanFrom(
                i + 1
            )

        }

        let start = openParenToken.pos

        function scanParen(
            k,
            depth
        ) {
            let excedeLongitudDeTokens = k >= tokens.length

            if (
                excedeLongitudDeTokens
            ) {
                return scanFrom(
                    i + 1
                )

            }

            let tk = tokens[k]

            let nextDepth = depth

            let abreParentesis = tk.kind === ts.SyntaxKind.OpenParenToken

            if (
                abreParentesis
            ) {
                nextDepth += 1

            }

            let cierraParentesis = tk.kind === ts.SyntaxKind.CloseParenToken

            if (
                cierraParentesis
            ) {
                nextDepth -= 1

            }

            let terminaElEncabezado = tk.kind === ts.SyntaxKind.CloseParenToken && nextDepth === 0

            if (
                terminaElEncabezado
            ) {
                spans.push(
                    {
                        start,
                        end: tk.end
                    }
                )

                return scanFrom(
                    k + 1
                )

            }

            return scanParen(
                k + 1,
                nextDepth
            )

        }

        return scanParen(
            j,
            0
        )

    }

    return scanFrom(
        0
    )

}

export function scanTokensTypescript(
    ts,
    sourceText,
    isTsx
) {
    let languageVariant = ts.LanguageVariant.Standard
    let esJsx = Boolean(
        isTsx
    )

    if (
        esJsx
    ) {
        languageVariant = ts.LanguageVariant.JSX

    }

    let scanner = ts.createScanner(
        ts.ScriptTarget.Latest,
        true,
        languageVariant,
        sourceText
    )

    let tokens = []

    function scanNext() {
        let kind = scanner.scan()

        let finDeArchivo = kind === ts.SyntaxKind.EndOfFileToken

        if (
            finDeArchivo
        ) {
            return tokens

        }

        let pos = scanner.getTokenPos()

        let end = scanner.getTextPos()

        tokens.push(
            {
                kind,
                pos,
                end,
                text: sourceText.slice(
                    pos,
                    end
                )
            }
        )

        return scanNext()

    }

    return scanNext()

}

export function fixSemicolonsTypescript(
    filePath,
    ts,
    sourceText,
    ext
) {
    let scriptKind = ts.ScriptKind.TS

    let esTsx = ext === '.tsx'

    if (
        esTsx
    ) {
        scriptKind = ts.ScriptKind.TSX

    }

    let sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
    )

    let tokens = scanTokensTypescript(
        ts,
        sourceText,
        ext === '.tsx'
    )

    let forHeaderSpans = collectForHeaderSpansFromTsTokens(
        tokens,
        ts
    )

    let emptyStatementRanges = collectEmptyStatementRangesTypescript(
        sourceFile,
        ts
    )

    let emptyStartSet = new Set()

    emptyStatementRanges.forEach(
        function (
            r
        ) {
            emptyStartSet.add(
                r.start
            )

        }
    )

    let replacements = []

    emptyStatementRanges.forEach(
        function (
            range
        ) {
            replacements.push(
                {
                    start: range.start,
                    end: range.end,
                    text: '{}'
                }
            )

        }
    )

    let unfixableFindings = []

    tokens.forEach(
        function (
            t
        ) {
            let noEsPuntoYComa = t.kind !== ts.SyntaxKind.SemicolonToken

            if (
                noEsPuntoYComa
            ) {
                return

            }

            let esEmptyStatement = emptyStartSet.has(
                t.pos
            )

            if (
                esEmptyStatement
            ) {
                return

            }

            let estaDentroDeEncabezadoDeFor = isInsideAnySpan(
                t.pos,
                forHeaderSpans
            )

            if (
                estaDentroDeEncabezadoDeFor
            ) {
                let lc = sourceFile.getLineAndCharacterOfPosition(
                    t.pos
                )

                unfixableFindings.push(
                    {
                        filePath,
                        line: lc.line + 1,
                        column: lc.character,
                        keyword: ';',
                        ruleId: 'formatear/no-semicolon'
                    }
                )

                return

            }

            replacements.push(
                {
                    start: t.pos,
                    end: t.end,
                    text: '\n'
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
        unfixableFindings
    }

}

export function fixVarConstToLetTypescript(
    filePath,
    ts,
    sourceText,
    ext
) {
    let tokens = scanTokensTypescript(
        ts,
        sourceText,
        ext === '.tsx'
    )

    let replacements = []

    tokens.forEach(
        function (
            t
        ) {
            let noEsVarNiConst = t.kind !== ts.SyntaxKind.VarKeyword && t.kind !== ts.SyntaxKind.ConstKeyword

            if (
                noEsVarNiConst
            ) {
                return

            }

            let rangoInvalido = typeof t.pos !== 'number' || typeof t.end !== 'number' || t.end < t.pos

            if (
                rangoInvalido
            ) {
                return

            }

            replacements.push(
                {
                    start: t.pos,
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

export function fixArrowFunctionsToFunctionsTypescript(
    filePath,
    ts,
    sourceText,
    ext
) {
    let scriptKind = ts.ScriptKind.TS

    let esTsx = ext === '.tsx'

    if (
        esTsx
    ) {
        scriptKind = ts.ScriptKind.TSX

    }

    let sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
    )

    let replacements = []

    let unfixableFindings = []

    function visit(
        node
    ) {
        let esArrowFunction = node.kind === ts.SyntaxKind.ArrowFunction

        if (
            esArrowFunction
        ) {
            let start = node.getStart(
                sourceFile
            )

            let end = node.getEnd()

            let rangoInvalido = typeof start !== 'number' || typeof end !== 'number' || end < start

            if (
                rangoInvalido
            ) {
                return

            }

            let arrowToken = node.equalsGreaterThanToken

            let arrowPos = -1
            let hayArrowToken = Boolean(
                arrowToken
            )

            if (
                hayArrowToken
            ) {
                arrowPos = arrowToken.getStart(
                    sourceFile
                )

            }

            let posicionDeFlechaInvalida = typeof arrowPos !== 'number' || arrowPos < start

            if (
                posicionDeFlechaInvalida
            ) {
                let lc = sourceFile.getLineAndCharacterOfPosition(
                    start
                )

                unfixableFindings.push(
                    {
                        filePath,
                        line: lc.line + 1,
                        column: lc.character,
                        keyword: '=>',
                        ruleId: 'formatear/no-arrow-function'
                    }
                )

                return

            }

            let headText = sourceText.slice(
                start,
                arrowPos
            ).trimEnd()

            let isAsync =
            Array.isArray(
                node.modifiers
            ) &&
            node.modifiers.some(
                function (
                    m
                ) {
                    return m.kind === ts.SyntaxKind.AsyncKeyword

                }
            )

            if (
                isAsync
            ) {
                headText = headText.replace(
                    /^\s*async\b\s*/,
                    ''
                )

            }

            let paramsText = headText.trim()

            let faltanParentesisEnParametros = !paramsText.startsWith(
                '('
            )

            if (
                faltanParentesisEnParametros
            ) {
                paramsText = `(${paramsText})`

            }

            let functionPrefix = 'function '

            if (
                isAsync
            ) {
                functionPrefix = 'async function '

            }

            let bodyText

            let esBloque = node.body.kind === ts.SyntaxKind.Block

            if (
                esBloque
            ) {
                bodyText = sourceText.slice(
                    node.body.getStart(
                        sourceFile
                    ),
                    node.body.getEnd()
                )

            }

            let faltaCuerpo = !bodyText

            if (
                faltaCuerpo
            ) {
                let bodyStart = node.body.getStart(
                    sourceFile
                )

                let bodyEnd = node.body.getEnd()

                let exprText = sourceText.slice(
                    bodyStart,
                    bodyEnd
                )

                bodyText = `{ return ${exprText} }`

            }

            replacements.push(
                {
                    start,
                    end,
                    text: `${functionPrefix}${paramsText} ${bodyText}`
                }
            )

            return

        }

        ts.forEachChild(
            node,
            visit
        )

    }

    visit(
        sourceFile
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

export function fixTernaryOperatorsTypescript(
    filePath,
    ts,
    sourceText,
    ext
) {
    let scriptKind = ts.ScriptKind.TS
    let esTsx = ext === '.tsx'

    if (
        esTsx
    ) {
        scriptKind = ts.ScriptKind.TSX

    }

    let sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
    )

    let unfixableFindings = []

    function visit(
        node
    ) {
        let noHayNodo = !node

        if (
            noHayNodo
        ) {
            return

        }

        let esConditionalExpression = node.kind === ts.SyntaxKind.ConditionalExpression

        if (
            esConditionalExpression
        ) {
            createTsFinding(
                unfixableFindings,
                filePath,
                '?:',
                'formatear/no-ternary',
                sourceFile,
                node.getStart(
                    sourceFile
                )
            )
        }

        ts.forEachChild(
            node,
            visit
        )

    }

    visit(
        sourceFile
    )

    return {
        fixedText: sourceText,
        unfixableFindings
    }

}

export function fixMissingBracesIfTypescript(
    filePath,
    ts,
    sourceText,
    ext
) {
    let scriptKind = ts.ScriptKind.TS

    let esTsx = ext === '.tsx'

    if (
        esTsx
    ) {
        scriptKind = ts.ScriptKind.TSX

    }

    let sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
    )

    let replacements = []

    let unfixableFindings = []

    function wrapStatement(
        stmt
    ) {
        let noHaySentencia = !stmt

        if (
            noHaySentencia
        ) {
            return

        }

        let yaTieneBloque = stmt.kind === ts.SyntaxKind.Block

        if (
            yaTieneBloque
        ) {
            return

        }

        let start = stmt.getStart(
            sourceFile
        )

        let end = stmt.getEnd()

        let rangoInvalido = typeof start !== 'number' || typeof end !== 'number' || end < start

        if (
            rangoInvalido
        ) {
            let startForLc = 0
            let startEsNumero = typeof start === 'number'

            if (
                startEsNumero
            ) {
                startForLc = start

            }

            let lc = sourceFile.getLineAndCharacterOfPosition(
                startForLc
            )

            unfixableFindings.push(
                {
                    filePath,
                    line: lc.line + 1,
                    column: lc.character,
                    keyword: '{',
                    ruleId: 'formatear/require-braces'
                }
            )

            return

        }

        replacements.push(
            {
                start,
                end: start,
                text: '{ '
            }
        )

        replacements.push(
            {
                start: end,
                end,
                text: ' }'
            }
        )

    }

    function visit(
        node
    ) {
        let esIfStatement = node.kind === ts.SyntaxKind.IfStatement

        if (
            esIfStatement
        ) {
            wrapStatement(
                node.thenStatement
            )

            let tieneElseStatement = Boolean(
                node.elseStatement
            )

            if (
                tieneElseStatement
            ) {
                wrapStatement(
                    node.elseStatement
                )

            }
        }

        ts.forEachChild(
            node,
            visit
        )

    }

    visit(
        sourceFile
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

export function fixFunctionArgumentsLayoutTypescript(
    filePath,
    ts,
    sourceText,
    ext
) {
    let noEsTextoValido = typeof sourceText !== 'string' || sourceText.length === 0

    if (
        noEsTextoValido
    ) {
        return {
            fixedText: sourceText
        }

    }

    let fixedText = sourceText
    let maxPasadas = 8

    let scriptKind = ts.ScriptKind.TS

    let esTsx = ext === '.tsx'

    if (
        esTsx
    ) {
        scriptKind = ts.ScriptKind.TSX

    }

    let sourceFile
    let tokens

    function detectEolLocal(
        text
    ) {
        let hayCrLf = text.includes(
            '\r\n'
        )

        if (
            hayCrLf
        ) {
            return '\r\n'

        }

        let hayLf = text.includes(
            '\n'
        )

        if (
            hayLf
        ) {
            return '\n'

        }

        let hayCr = text.includes(
            '\r'
        )

        if (
            hayCr
        ) {
            return '\r'

        }

        return '\n'

    }

    let eol

    function findLineStartIndexLocal(
        text,
        index
    ) {
        let len = text.length

        let i = Math.max(
            0,
            Math.min(
                len,
                index
            )
        )

        let searchFrom = i - 1

        let lastNl = text.lastIndexOf(
            '\n',
            searchFrom
        )

        let lastCr = text.lastIndexOf(
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

    function findLineEndIndexLocal(
        text,
        index
    ) {
        let len = text.length

        let i = Math.max(
            0,
            Math.min(
                len,
                index
            )
        )

        let nextNl = text.indexOf(
            '\n',
            i
        )

        let nextCr = text.indexOf(
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

    function findLineIndentAtLocal(
        text,
        index
    ) {
        let lineStart = findLineStartIndexLocal(
            text,
            index
        )

        let lineEnd = findLineEndIndexLocal(
            text,
            index
        )

        let lineText = text.slice(
            lineStart,
            lineEnd
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

    function onlyWhitespaceOrCommas(
        text
    ) {
        return !/[^\s,]/.test(
            text
        )
    }

    function lowerBoundTokens(
        pos
    ) {
        function go(
            lo,
            hi
        ) {
            let estaTerminado = lo >= hi

            if (
                estaTerminado
            ) {
                return lo

            }

            let mid = (lo + hi) >> 1

            let t = tokens[mid]

            let tokenPos = 0
            let tokenPosEsNumero = typeof t?.pos === 'number'

            if (
                tokenPosEsNumero
            ) {
                tokenPos = t.pos

            }

            let debeIrDerecha = tokenPos < pos

            if (
                debeIrDerecha
            ) {
                return go(
                    mid + 1,
                    hi
                )

            }

            return go(
                lo,
                mid
            )

        }

        return go(
            0,
            tokens.length
        )
    }

    function upperBoundTokens(
        pos
    ) {
        function go(
            lo,
            hi
        ) {
            let estaTerminado = lo >= hi

            if (
                estaTerminado
            ) {
                return lo

            }

            let mid = (lo + hi) >> 1

            let t = tokens[mid]

            let tokenPos = 0
            let tokenPosEsNumero = typeof t?.pos === 'number'

            if (
                tokenPosEsNumero
            ) {
                tokenPos = t.pos

            }

            let debeIrDerecha = tokenPos <= pos

            if (
                debeIrDerecha
            ) {
                return go(
                    mid + 1,
                    hi
                )

            }

            return go(
                lo,
                mid
            )

        }

        return go(
            0,
            tokens.length
        )
    }

    function findOpenTokenIndex(
        fromPos,
        toPos,
        openChar
    ) {
        let startIndex = lowerBoundTokens(
            fromPos
        )

        let endIndex = upperBoundTokens(
            toPos
        )

        let localIndex = tokens
        .slice(
            startIndex,
            endIndex
        )
        .findIndex(
            function (
                t
            ) {
                let noHayToken = !t

                if (
                    noHayToken
                ) {
                    return false

                }

                let esApertura = t.text === openChar

                if (
                    esApertura
                ) {
                    return true

                }

                return false

            }
        )

        let noEncontrado = localIndex < 0

        if (
            noEncontrado
        ) {
            return -1

        }

        return startIndex + localIndex
    }

    function findMatchingCloseTokenIndex(
        openIndex,
        toPos,
        openChar,
        closeChar
    ) {
        let openIndexInvalido = openIndex < 0

        if (
            openIndexInvalido
        ) {
            return -1

        }

        let endIndex = upperBoundTokens(
            toPos
        )

        let depth = 0

        let localIndex = tokens
        .slice(
            openIndex,
            endIndex
        )
        .findIndex(
            function (
                t
            ) {
                let noHayToken = !t

                if (
                    noHayToken
                ) {
                    return false

                }

                let esApertura = t.text === openChar

                if (
                    esApertura
                ) {
                    depth += 1
                    return false

                }

                let esCierre = t.text === closeChar

                if (
                    esCierre
                ) {
                    depth -= 1

                    let depthCero = depth === 0

                    if (
                        depthCero
                    ) {
                        return true

                    }
                }

                return false

            }
        )

        let noEncontrado = localIndex < 0

        if (
            noEncontrado
        ) {
            return -1

        }

        return openIndex + localIndex
    }

    function buildListReplacement(
        openToken,
        closeToken,
        items,
        openChar,
        closeChar
    ) {
        let indent = findLineIndentAtLocal(
            sourceText,
            openToken.pos
        )

        let desiredIndent = `${indent}    `

        function getLeadingWhitespaceLength(
            line
        ) {
            let match = /^[ \t]*/.exec(
                line
            )

            let outLen = 0

            if (
                match
            ) {
                outLen = match[0].length

            }

            return outLen
        }

        function normalizeMultilineItemText(
            text
        ) {
            let parts = String(
                text
            ).split(
                /\r\n|\n|\r/
            )

            let hasSecondLine = parts.length > 1

            if (
                hasSecondLine
            ) {
                let tailLines = parts
                .slice(
                    1
                )
                .filter(
                    function (
                        line
                    ) {
                        return line.trim().length > 0
                    }
                )

                let minIndent = tailLines.reduce(
                    function (
                        acc,
                        line
                    ) {
                        let current = getLeadingWhitespaceLength(
                            line
                        )

                        let esMenor = current < acc

                        if (
                            esMenor
                        ) {
                            return current
                        }

                        return acc
                    },
                    Number.POSITIVE_INFINITY
                )

                let noHayMin = !Number.isFinite(
                    minIndent
                ) || minIndent === Number.POSITIVE_INFINITY

                if (
                    noHayMin
                ) {
                    minIndent = 0
                }

                parts = parts.map(
                    function (
                        line,
                        index
                    ) {
                        let isFirst = index === 0

                        if (
                            isFirst
                        ) {
                            return line.trimEnd()
                        }

                        let leading = getLeadingWhitespaceLength(
                            line
                        )

                        let cut = Math.min(
                            minIndent,
                            leading
                        )

                        return line.slice(
                            cut
                        ).trimEnd()
                    }
                )

                return parts.join(
                    eol
                )
            }

            return parts.map(
                function (
                    line
                ) {
                    return line.trimEnd()
                }
            ).join(
                eol
            )
        }

        function indentTextBlock(
            text
        ) {
            return String(
                text
            ).split(
                /\r\n|\n|\r/
            ).map(
                function (
                    line
                ) {
                    return `${desiredIndent}${line}`
                }
            ).join(
                eol
            )
        }

        function appendCommaToLastLine(
            text
        ) {
            let parts = String(
                text
            ).split(
                eol
            )

            let lastIndex = parts.length - 1

            return parts.map(
                function (
                    line,
                    index
                ) {
                    let esUltima = index === lastIndex

                    if (
                        esUltima
                    ) {
                        return `${line},`
                    }

                    return line
                }
            ).join(
                eol
            )
        }

        let lines = items.map(
            function (
                item,
                index
            ) {
                let {
                    start,
                    end
                } = item

                let text = sourceText.slice(
                    start,
                    end
                ).trim()

                let esUltimo = index === items.length - 1

                let debeTenerComa = !esUltimo

                let normalized = normalizeMultilineItemText(
                    text
                )

                let indented = indentTextBlock(
                    normalized
                )

                if (
                    debeTenerComa
                ) {
                    return appendCommaToLastLine(
                        indented
                    )
                }

                return indented
            }
        )

        let out = `${openChar}${eol}${lines.join(
            eol
        )}${eol}${indent}${closeChar}`

        return {
            start: openToken.pos,
            end: closeToken.end,
            text: out
        }
    }

    function getNodeRange(
        node
    ) {
        let start = node.getStart(
            sourceFile
        )
        let end = node.getEnd()

        return {
            start,
            end
        }
    }

    function collectItemsFromTsNodeArray(
        nodeArray
    ) {
        let noHayArreglo = !nodeArray || typeof nodeArray !== 'object'

        if (
            noHayArreglo
        ) {
            return []

        }

        let out = []

        nodeArray.forEach(
            function (
                item
            ) {
                let noHayNodo = !item || typeof item !== 'object'

                if (
                    noHayNodo
                ) {
                    return
                }

                let {
                    start,
                    end
                } = getNodeRange(
                    item
                )

                let rangoInvalido = typeof start !== 'number' || typeof end !== 'number' || end < start

                if (
                    rangoInvalido
                ) {
                    return
                }

                out.push(
                    {
                        start,
                        end
                    }
                )
            }
        )

        return out
    }

    let candidates = []

    function maybeAddList(
        fromPos,
        toPos,
        items,
        openChar,
        closeChar
    ) {
        let noHayItems = !Array.isArray(
            items
        ) || items.length === 0

        if (
            noHayItems
        ) {
            return
        }

        let openIndex = findOpenTokenIndex(
            fromPos,
            toPos,
            openChar
        )

        let noHayParenApertura = openIndex < 0

        if (
            noHayParenApertura
        ) {
            return
        }

        let closeIndex = findMatchingCloseTokenIndex(
            openIndex,
            toPos,
            openChar,
            closeChar
        )

        let noHayParenCierre = closeIndex < 0

        if (
            noHayParenCierre
        ) {
            return
        }

        let openToken = tokens[openIndex]
        let closeToken = tokens[closeIndex]

        let faltanTokens = !openToken || !closeToken

        if (
            faltanTokens
        ) {
            return
        }

        let first = items[0]
        let last = items[items.length - 1]

        let headBetween = sourceText.slice(
            openToken.end,
            first.start
        )

        let tailBetween = sourceText.slice(
            last.end,
            closeToken.pos
        )

        let headInvalido = !/^\s*$/.test(
            headBetween
        )

        if (
            headInvalido
        ) {
            return

        }

        let tailInvalido = !onlyWhitespaceOrCommas(
            tailBetween
        )

        if (
            tailInvalido
        ) {
            return

        }

        let gapsValidos = items
        .slice(
            0,
            -1
        )
        .every(
            function (
                item,
                index
            ) {
                let next = items[index + 1]

                let gap = sourceText.slice(
                    item.end,
                    next.start
                )

                return onlyWhitespaceOrCommas(
                    gap
                )
            }
        )

        let gapsInvalidos = !gapsValidos

        if (
            gapsInvalidos
        ) {
            return

        }

        candidates.push(
            buildListReplacement(
                openToken,
                closeToken,
                items,
                openChar,
                closeChar
            )
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

        let esCallExpression = ts.isCallExpression(
            node
        )

        if (
            esCallExpression
        ) {
            let items = collectItemsFromTsNodeArray(
                node.arguments
            )

            maybeAddList(
                node.expression.end,
                node.end,
                items,
                '(',
                ')'
            )
        }

        let esNewExpression = ts.isNewExpression(
            node
        )

        if (
            esNewExpression
        ) {
            let items = collectItemsFromTsNodeArray(
                node.arguments
            )

            maybeAddList(
                node.expression.end,
                node.end,
                items,
                '(',
                ')'
            )
        }

        let {
            kind
        } = node

        let esFunctionDeclaration = kind === ts.SyntaxKind.FunctionDeclaration
        let esFunctionExpression = kind === ts.SyntaxKind.FunctionExpression
        let esArrowFunction = kind === ts.SyntaxKind.ArrowFunction
        let esMethodDeclaration = kind === ts.SyntaxKind.MethodDeclaration
        let esConstructorDeclaration = kind === ts.SyntaxKind.Constructor
        let esGetAccessorDeclaration = kind === ts.SyntaxKind.GetAccessor
        let esSetAccessorDeclaration = kind === ts.SyntaxKind.SetAccessor

        let esAlgunFunction = esFunctionDeclaration ||
        esFunctionExpression ||
        esArrowFunction ||
        esMethodDeclaration ||
        esConstructorDeclaration ||
        esGetAccessorDeclaration ||
        esSetAccessorDeclaration

        if (
            esAlgunFunction
        ) {
            let items = collectItemsFromTsNodeArray(
                node.parameters
            )

            let fromPos = node.getStart(
                sourceFile
            )

            let toPos = node.end

            let bodyPos = node.end
            let bodyPosEsNumero = typeof node.body?.pos === 'number'

            if (
                bodyPosEsNumero
            ) {
                bodyPos = node.body.pos

            }

            let tieneBodyPos = typeof bodyPos === 'number'

            if (
                tieneBodyPos
            ) {
                toPos = bodyPos

            }

            let esArrow = esArrowFunction

            if (
                esArrow
            ) {
                let arrowTokenPos = toPos
                let arrowTokenPosEsNumero = typeof node.equalsGreaterThanToken?.pos === 'number'

                if (
                    arrowTokenPosEsNumero
                ) {
                    arrowTokenPos = node.equalsGreaterThanToken.pos

                }

                let tieneArrowTokenPos = typeof arrowTokenPos === 'number'

                if (
                    tieneArrowTokenPos
                ) {
                    toPos = arrowTokenPos

                }
            }

            maybeAddList(
                fromPos,
                toPos,
                items,
                '(',
                ')'
            )
        }

        let esArrayLiteral = ts.isArrayLiteralExpression(
            node
        )

        if (
            esArrayLiteral
        ) {
            let tieneHuecos = node.elements.some(
                function (
                    el
                ) {
                    return el && el.kind === ts.SyntaxKind.OmittedExpression
                }
            )

            let noTieneHuecos = !tieneHuecos

            if (
                noTieneHuecos
            ) {
                let items = collectItemsFromTsNodeArray(
                    node.elements
                )

                maybeAddList(
                    node.getStart(
                        sourceFile
                    ),
                    node.end,
                    items,
                    '[',
                    ']'
                )
            }
        }

        let esObjectLiteral = ts.isObjectLiteralExpression(
            node
        )

        if (
            esObjectLiteral
        ) {
            let items = collectItemsFromTsNodeArray(
                node.properties
            )

            maybeAddList(
                node.getStart(
                    sourceFile
                ),
                node.end,
                items,
                '{',
                '}'
            )
        }

        let esArrayBindingPattern = ts.isArrayBindingPattern(
            node
        )

        if (
            esArrayBindingPattern
        ) {
            let tieneHuecos = node.elements.some(
                function (
                    el
                ) {
                    return el && el.kind === ts.SyntaxKind.OmittedExpression
                }
            )

            let noTieneHuecos = !tieneHuecos

            if (
                noTieneHuecos
            ) {
                let items = collectItemsFromTsNodeArray(
                    node.elements
                )

                maybeAddList(
                    node.getStart(
                        sourceFile
                    ),
                    node.end,
                    items,
                    '[',
                    ']'
                )
            }
        }

        let esObjectBindingPattern = ts.isObjectBindingPattern(
            node
        )

        if (
            esObjectBindingPattern
        ) {
            let items = collectItemsFromTsNodeArray(
                node.elements
            )

            maybeAddList(
                node.getStart(
                    sourceFile
                ),
                node.end,
                items,
                '{',
                '}'
            )
        }

        ts.forEachChild(
            node,
            visit
        )
    }

    function runPass(
        pasada,
        currentText
    ) {
        let llegoAlMax = pasada >= maxPasadas

        if (
            llegoAlMax
        ) {
            return currentText
        }

        sourceText = currentText
        candidates = []

        eol = detectEolLocal(
            sourceText
        )

        sourceFile = ts.createSourceFile(
            filePath,
            sourceText,
            ts.ScriptTarget.Latest,
            true,
            scriptKind
        )

        tokens = scanTokensTypescript(
            ts,
            sourceText,
            ext === '.tsx'
        )

        visit(
            sourceFile
        )

        let reemplazos = candidates.filter(
            function (
                rep
            ) {
                return sourceText.slice(
                    rep.start,
                    rep.end
                ) !== rep.text
            }
        )

        let noHayReemplazos = reemplazos.length === 0

        if (
            noHayReemplazos
        ) {
            return currentText
        }

        let sorted = reemplazos
        .slice()
        .sort(
            function (
                a,
                b
            ) {
                return a.start - b.start
            }
        )

        let nonOverlapping = []

        sorted.forEach(
            function (
                rep
            ) {
                let ultimo = nonOverlapping[nonOverlapping.length - 1]

                let noHayUltimo = !ultimo

                if (
                    noHayUltimo
                ) {
                    nonOverlapping.push(
                        rep
                    )
                    return
                }

                let noSolapa = rep.start >= ultimo.end

                if (
                    noSolapa
                ) {
                    nonOverlapping.push(
                        rep
                    )
                    return
                }

                let lenUltimo = ultimo.end - ultimo.start
                let lenRep = rep.end - rep.start

                let repEsMasInterno = lenRep < lenUltimo

                if (
                    repEsMasInterno
                ) {
                    nonOverlapping[nonOverlapping.length - 1] = rep
                }
            }
        )

        let nextText = applyReplacements(
            sourceText,
            nonOverlapping
        )

        let noHuboCambios = nextText === sourceText

        if (
            noHuboCambios
        ) {
            return currentText
        }

        return runPass(
            pasada + 1,
            nextText
        )
    }

    fixedText = runPass(
        0,
        fixedText
    )

    return {
        fixedText
    }
}
