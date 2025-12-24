import * as assert from 'node:assert/strict'
import { describe, it } from 'vitest'

describe(
    'meriyah-cli/formatting.mjs',
    function () {
        it(
            'stripTrailingWhitespace elimina espacios y tabs al final de línea',
            async function () {
                const mod = await import(
                    '../../bin/meriyah-cli/formatting.mjs'
                )

                const input = 'a  \n\tb\t\r\nc \t'

                const out = mod.stripTrailingWhitespace(
                    input
                )

                assert.equal(
                    out,
                    'a\n\tb\r\nc'
                )

            }
        )

        it(
            'applyReplacements aplica reemplazos sin solaparse',
            async function () {
                const mod = await import(
                    '../../bin/meriyah-cli/formatting.mjs'
                )

                const sourceText = '0123456789'

                const out = mod.applyReplacements(
                    sourceText,
                    [
                        {
                            start: 1,
                            end: 3,
                            text: 'AA'
                        },
                        {
                            start: 2,
                            end: 4,
                            text: 'BB'
                        },
                        {
                            start: 6,
                            end: 7,
                            text: 'C'
                        }
                    ]
                )

                assert.equal(
                    out,
                    '01BB45C789'
                )

            }
        )

        it(
            'convertTabsToFourSpacesOutsideTokens preserva spans',
            async function () {
                const mod = await import(
                    '../../bin/meriyah-cli/formatting.mjs'
                )

                const sourceText = 'a\tb\tc'

                const out = mod.convertTabsToFourSpacesOutsideTokens(
                    sourceText,
                    [
                        {
                            start: 3,
                            end: 4
                        }
                    ]
                )

                assert.equal(
                    out,
                    'a    b\tc'
                )

            }
        )

    }
)
