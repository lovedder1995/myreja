// Las condiciones no deben contener directamente la lógica, sino una variable que describa esa lógica.
import { addFinding } from '../utils/meriyah_findings.mjs'

export function collectConditionSingleVariableFindingsMeriyah(
    ast,
    filePath
) {
    let findings = []

    function checkTest(
        node
    ) {
        let noEsNodo = !node || typeof node !== 'object'

        if (
            noEsNodo
        ) {
            return

        }

        let {
            test
        } = node

        let noEsTestValido = !test || typeof test !== 'object'

        if (
            noEsTestValido
        ) {
            return

        }

        let esIdentificador = test.type === 'Identifier'

        if (
            esIdentificador
        ) {
            return

        }

        addFinding(
            findings,
            filePath,
            'condicion',
            test,
            'formatear/condition-single-variable'
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

        let esListaDeNodos = Array.isArray(
            node
        )

        if (
            esListaDeNodos
        ) {
            node.forEach(
                visit
            )

            return

        }

        let tieneTipoString = typeof node.type === 'string'

        if (
            tieneTipoString
        ) {
            let {
                type
            } = node

            let esNodoConCondicion =
            type === 'IfStatement' ||
            type === 'WhileStatement' ||
            type === 'DoWhileStatement' ||
            type === 'ForStatement'

            if (
                esNodoConCondicion
            ) {
                checkTest(
                    node
                )

            }
        }

        Object.entries(
            node
        ).forEach(
            function (
                pair
            ) {
                let key = pair[0]

                let esClaveIgnorable = key === 'loc' || key === 'range' || key === 'start' || key === 'end'

                if (
                    esClaveIgnorable
                ) {
                    return

                }

                visit(
                    pair[1]
                )

            }
        )

    }

    visit(
        ast
    )

    return findings

}
