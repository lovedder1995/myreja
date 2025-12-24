export function parseSourceMeriyah(
    parse,
    sourceText
) {
    let parseOptions = {
        loc: true,
        ranges: true,
        next: true,
        jsx: true,
        webcompat: true
    }

    let tokens = []

    let onToken = function (
        type,
        start,
        end,
        loc
    ) {
        tokens.push(
            {
                type,
                start,
                end,
                loc,
                text: sourceText.slice(
                    start,
                    end
                )
            }
        )

    }

    let ast

    let moduleError

    try {
        ast = parse(
            sourceText,
            {
                ...parseOptions,
                sourceType: 'module',
                onToken
            }
        )

    } catch (error) {
        moduleError = error

    }

    let noHayAst = !ast

    if (
        noHayAst
    ) {
        try {
            ast = parse(
                sourceText,
                {
                    ...parseOptions,
                    sourceType: 'script',
                    onToken
                }
            )

        } catch {
            let err = moduleError
            let moduleErrorEsError = moduleError instanceof Error
            let moduleErrorNoEsError = !moduleErrorEsError

            if (
                moduleErrorNoEsError
            ) {
                err = new Error(
                    String(
                        moduleError
                    )
                )

            }

            throw err

        }
    }

    return {
        ast,
        tokens
    }

}

export function parseCommentsMeriyah(
    parse,
    sourceText
) {
    let parseOptions = {
        loc: true,
        ranges: true,
        next: true,
        jsx: true,
        webcompat: true
    }

    let comments = []

    let ast

    let moduleError

    try {
        ast = parse(
            sourceText,
            {
                ...parseOptions,
                sourceType: 'module',
                onComment: comments
            }
        )

    } catch (error) {
        moduleError = error

    }

    let noHayAst = !ast

    if (
        noHayAst
    ) {
        try {
            ast = parse(
                sourceText,
                {
                    ...parseOptions,
                    sourceType: 'script',
                    onComment: comments
                }
            )

        } catch {
            let err = moduleError
            let moduleErrorEsError = moduleError instanceof Error
            let moduleErrorNoEsError = !moduleErrorEsError

            if (
                moduleErrorNoEsError
            ) {
                err = new Error(
                    String(
                        moduleError
                    )
                )

            }

            throw err

        }
    }

    return {
        ast,
        comments
    }

}
