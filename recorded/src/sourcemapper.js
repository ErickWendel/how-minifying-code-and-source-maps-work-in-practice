import { SourceMapGenerator } from 'source-map'
import * as acorn from 'acorn'
import escodegen from 'escodegen'
import ASTHelper from './ast-helper.js'

export default class SourceMapper {
    #minifiedLocalFilePath
    #sourceMaps
    #minifiedItems = new Map()
    constructor({ minifiedLocalFilePath }) {
        this.#minifiedLocalFilePath = minifiedLocalFilePath
        this.#sourceMaps = new SourceMapGenerator({ file: minifiedLocalFilePath })
    }
    #handleDeclaration({ loc: { start }, name }) {
        if (this.#minifiedItems.has(name)) {
            const nameMap = this.#minifiedItems.get(name)
            nameMap.positions.push(start)
            this.#minifiedItems.set(name, nameMap)
            return
        }
        this.#minifiedItems.set(name, { positions: [start] })
    }
    #traverse(node) {
        const astHelper = new ASTHelper()
        astHelper
            .setVariableDeclarationHook(node => {
                for (const declaration of node.declarations) {
                    this.#handleDeclaration(declaration.id)
                }
            })
            .setFunctionDeclarationHook(node => {
                this.#handleDeclaration(node.id)
                for (const param of node.params) {
                    this.#handleDeclaration(param)
                }
            })
            .setIdentifierHook(node => {
                const oldName = node.name
                const name = this.#minifiedItems.get(oldName)
                if (!name) return

                this.#handleDeclaration(node)
                node.name = name
            })
            .traverse(node)
    }
    #generateSourceMapData({ nameMap, originalCode }) {
        const originalItems = [...nameMap.values()]
        this.#sourceMaps.setSourceContent(this.#minifiedLocalFilePath, originalCode)
        originalItems.forEach(({ newName, positions }) => {
            const minifiedPositions = this.#minifiedItems.get(newName).positions

            // remove the first line of each position is replicated
            minifiedPositions.shift()
            minifiedPositions.forEach((minifiedPosition, index) => {
                const originalPositions = positions[index]

                const mappings = {
                    source: this.#minifiedLocalFilePath,
                    original: originalPositions,
                    generated: minifiedPosition,
                    name: newName
                }
                this.#sourceMaps.addMapping(mappings)
            })

        })
    }
    generateSourceMap({ originalCode, minifiedCode, nameMap }) {
        const minifiedAST = acorn.parse(minifiedCode, { ecmaVersion: 2022, locations: true })
        this.#traverse(minifiedAST)
        this.#generateSourceMapData({ nameMap, originalCode });
        const sourceMap = this.#sourceMaps.toString()

        return sourceMap
    }
}