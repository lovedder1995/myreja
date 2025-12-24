import * as assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'vitest'

function getCliPath() {
    return fileURLToPath(
        new URL(
            '../../bin/meriyah.mjs',
            import.meta.url
        )
    )

}

describe(
'meriyah CLI - --reglas',
function () {
    it(
        'sin flags imprime ayuda y sale con status 2',
        function () {
            let cliPath = getCliPath()

            let result = spawnSync(
                process.execPath,
                [
                    cliPath
                ],
                {
                    encoding: 'utf8'
                }
            )

            assert.equal(
                result.status,
                2
            )

            assert.equal(
                result.stderr,
                ''
            )

            assert.ok(
                result.stdout.includes(
                    'Uso:'
                )
            )

        }
    )

    it(
        'imprime reglas y devuelve exit code 0',
        function () {
            let cliPath = getCliPath()

            let result = spawnSync(
                process.execPath,
                [
                    cliPath,
                    '--reglas'
                ],
                {
                    encoding: 'utf8'
                }
            )

            assert.equal(
                result.status,
                0
            )

            assert.equal(
                result.stderr,
                ''
            )

            assert.ok(
                result.stdout.includes(
                    'formatear/no-this\t'
                )
            )

            assert.ok(
                result.stdout.includes(
                    'formatear/no-ternary\t'
                )
            )

            assert.ok(
                result.stdout.includes(
                    'formatear/no-interface\t'
                )
            )

        }
    )

    it(
        'imprime las reglas ordenadas por id',
        function () {
            let cliPath = getCliPath()

            let result = spawnSync(
                process.execPath,
                [
                    cliPath,
                    '--reglas'
                ],
                {
                    encoding: 'utf8'
                }
            )

            assert.equal(
                result.status,
                0
            )

            let ids = result.stdout
            .split(
                /\r?\n/g
            )
            .filter(
                Boolean
            )
            .map(
                function (
                    line
                ) {
                    return line.split(
                        '\t'
                    )[0]
                }
            )

            let sorted = ids.slice().sort(
                function (
                    a,
                    b
                ) {
                    return a.localeCompare(
                        b
                    )

                }
            )

            assert.deepEqual(
                ids,
                sorted
            )

        }
    )

}
)
