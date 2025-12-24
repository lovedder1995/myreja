import * as assert from 'node:assert/strict'
import { describe, it } from 'vitest'

describe(
    'meriyah-cli/formatting.mjs',
    function () {
        it(
            'stripTrailingWhitespace elimina espacios y tabs al final de línea',
            async function () {
                let mod = await import(
                    '../../bin/meriyah-cli/formatting.mjs'
                )

                let input = 'a  \n\tb\t\r\nc \t'

                let out = mod.stripTrailingWhitespace(
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
                let mod = await import(
                    '../../bin/meriyah-cli/formatting.mjs'
                )

                let sourceText = '0123456789'

                let out = mod.applyReplacements(
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
                let mod = await import(
                    '../../bin/meriyah-cli/formatting.mjs'
                )

                let sourceText = 'a\tb\tc'

                let out = mod.convertTabsToFourSpacesOutsideTokens(
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
