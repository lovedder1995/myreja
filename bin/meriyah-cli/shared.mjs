import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

export async function importMeriyah() {
    try {
        return await import(new URL(
            '../../dist/meriyah.mjs',
            import.meta.url
        ))

    } catch {
        throw new Error(
            'No se encontró `dist/meriyah.mjs`. Ejecutá `bun run build` y reintentá.'
        )

    }
}

export async function loadForbiddenWords() {
    let fallback = new Set(
        [
            'this'
        ]
    )

    let scriptPath = process.argv[1]

    let esScriptPathInvalido = typeof scriptPath !== 'string' || scriptPath.length === 0

    if (
        esScriptPathInvalido
    ) {
        scriptPath = process.cwd()

    }

    let tokenFilePath = path.resolve(
        path.dirname(
            path.resolve(
                scriptPath
            )
        ),
        '..',
        'src',
        'token.ts'
    )

    let content

    try {
        content = await fs.readFile(
            tokenFilePath,
            'utf8'
        )

    } catch {
        return fallback

    }

    let forbidden = new Set()

    let entryRegExp = /^\s*([A-Za-z_$][\w$]*):\s*Token\.[A-Za-z0-9_$]+,\s*\/\/\s*Prohibida\b/gm

    Array.from(
        content.matchAll(
            entryRegExp
        )
    ).forEach(
        function (
            match
        ) {
            forbidden.add(
                match[1]
            )

        }
    )

    let hayPalabrasProhibidas = forbidden.size > 0

    if (
        hayPalabrasProhibidas
    ) {
        return forbidden

    }

    return fallback

}

export function printHelp() {
    process.stdout.write(
        `Uso:
          meriyah --reglas
          meriyah --formatear <archivo|directorio> [...]
        `
    )

}

export function isPathLike(
    value
) {
    return typeof value === 'string' && value.length > 0

}

export async function pathKind(
    p
) {
    try {
        let stats = await fs.stat(
            p
        )

        let esDirectorio = stats.isDirectory()

        if (
            esDirectorio
        ) {
            return 'dir'

        }

        let esArchivo = stats.isFile()

        if (
            esArchivo
        ) {
            return 'file'

        }

        return 'other'

    } catch {
        return 'missing'

    }
}

export async function collectFiles(
    inputPath,
    out
) {
    let kind = await pathKind(
        inputPath
    )

    let esArchivo = kind === 'file'

    if (
        esArchivo
    ) {
        let esExtensionSoportada = /\.(?:[cm]?jsx?|mjs|cjs)$/.test(
            inputPath
        )

        let noEsUnaExtensionSoportada = !esExtensionSoportada

        if (
            noEsUnaExtensionSoportada
        ) {
            return

        }

        out.add(
            path.resolve(
                inputPath
            )
        )

        return

    }
    let noEsDirectorio = kind !== 'dir'

    if (
        noEsDirectorio
    ) {
        return

    }

    let entries = await fs.readdir(
        inputPath,
        {
            withFileTypes: true
        }
    )

    await Promise.all(
        entries.map(
            async function (
                entry
            ) {
                let fullPath = path.join(
                    inputPath,
                    entry.name
                )

                let esDirectorio = entry.isDirectory()

                if (
                    esDirectorio
                ) {
                    let esSaltado = entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage'

                    if (
                        esSaltado
                    ) {
                        return

                    }

                    await collectFiles(
                        fullPath,
                        out
                    )

                    return

                }

                let noEsArchivo = !entry.isFile()

                if (
                    noEsArchivo
                ) {
                    return

                }

                let noEsExtensionSoportada = !/\.(?:[cm]?jsx?|mjs|cjs)$/.test(
                    entry.name
                )

                if (
                    noEsExtensionSoportada
                ) {
                    return

                }

                out.add(
                    path.resolve(
                        fullPath
                    )
                )

            }
        )
    )

}
