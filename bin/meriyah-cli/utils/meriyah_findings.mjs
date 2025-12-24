export function isSkippableIdentifierContext(
    parent,
    key
) {
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

export function addFinding(
    findings,
    filePath,
    keyword,
    node,
    ruleId
) {
    let line = node?.loc?.start?.line ?? 1

    let column = node?.loc?.start?.column ?? 0

    findings.push(
        {
            filePath,
            line,
            column,
            keyword,
            ruleId
        }
    )

}

export function addFindingAtLoc(
    findings,
    filePath,
    keyword,
    loc,
    ruleId
) {
    let line = loc?.start?.line ?? 1

    let column = loc?.start?.column ?? 0

    findings.push(
        {
            filePath,
            line,
            column,
            keyword,
            ruleId
        }
    )

}

