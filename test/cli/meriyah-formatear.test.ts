import * as assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
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
    'meriyah CLI - --formatear',
    function () {
        it(
            'formatea un archivo TypeScript sin errores',
            async function () {
                let tempDir = await fs.mkdtemp(
                    path.join(
                        os.tmpdir(),
                        'meriyah-cli-'
                    )
                )

                let filePath = path.join(
                    tempDir,
                    'file.ts'
                )

                try {
                    await fs.writeFile(
                        filePath,
                        'let x\t= 1 \t \n',
                        'utf8'
                    )

                    let cliPath = getCliPath()

                    let result = spawnSync(
                        process.execPath,
                        [
                            cliPath,
                            '--formatear',
                            tempDir
                        ],
                        {
                            encoding: 'utf8'
                        }
                    )

                    assert.equal(
                        result.status,
                        0
                    )

                    let out = await fs.readFile(
                        filePath,
                        'utf8'
                    )

                    assert.equal(
                        out,
                        'let x    = 1\n'
                    )

                } catch {
                    await fs.rm(
                        tempDir,
                        {
                            recursive: true,
                            force: true
                        }
                    )

                }
            }
        )

    }
)
