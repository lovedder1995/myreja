import * as assert from 'node:assert/strict'
import { describe, it, vi } from 'vitest'

describe('meriyah-cli/shared.mjs', function () {
    it(
        'printHelp incluye la opción --reglas',
        async function () {
            let mod = await import(
                '../../bin/meriyah-cli/shared.mjs'
            )

            let buffer = ''

            let writeSpy = vi.spyOn(
                process.stdout,
                'write'
            ).mockImplementation(
                function (
                    chunk: any
                ) {
                    buffer += String(
                        chunk
                    )

                    return true

                }
            )

            try {
                mod.printHelp()

            } catch {
                writeSpy.mockRestore()

            }

            assert.ok(
                buffer.includes(
                    'meriyah --reglas'
                )
            )

        }
    )

})
