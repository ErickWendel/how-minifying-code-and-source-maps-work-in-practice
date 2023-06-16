import * as acorn from 'acorn';
import escodegen from 'escodegen';
import ASTHelper from './ast-helper.js';
export default class Minifier {
    #nameMap = new Map();
    // limit the alphabet to 52 characters
    #alphabet = Array.from('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

    #generateNameIfNotExists(oldName = '') {
        // If the name exists in the nameMap, return the corresponding new name
        if (this.#nameMap.has(oldName)) {
            return this.#nameMap.get(oldName).name;
        }
        // Throw an error if the alphabet is empty
        if (!this.#alphabet.length) {
            throw new Error('Alphabet is empty - we expect at most 52 keyword to be used in the code');
        }

        // Shift the next character from the alphabet
        return this.#alphabet.shift();
    }

    #updateNameMap(oldName, newName, { loc: { start } }) {
        if (this.#nameMap.has(oldName)) {
            const nameMap = this.#nameMap.get(oldName)
            nameMap.positions.push(start)
            this.#nameMap.set(oldName, nameMap);
            return;
        }

        this.#nameMap.set(oldName, { newName, oldName, positions: [start] });
    }

    #handleDeclaration(declaration) {
        const oldName = declaration.name;
        const newName = this.#generateNameIfNotExists(oldName);

        this.#updateNameMap(oldName, newName, declaration);
        declaration.name = newName;
    }

    #traverse(minifiedAST) {
        const astHelper = new ASTHelper();
        astHelper
            .setVariableDeclarationHook((node) => {
                for (const declaration of node.declarations) {
                    this.#handleDeclaration(declaration.id);
                }
            })
            .setFunctionDeclarationHook((node) => {
                this.#handleDeclaration(node.id);
                for (const param of node.params) {
                    this.#handleDeclaration(param);
                }
            })
            .setIdentifierHook((node) => {
                const oldName = node.name;
                const name = this.#nameMap.get(oldName)?.newName;
                if (!name) return;

                this.#updateNameMap(oldName, name, node);
                node.name = name;
            })
            .traverse(minifiedAST);
    }

    traverseAST(originalCode) {
        // Parse the original code into an AST
        const originalAST = acorn.parse(originalCode, { ecmaVersion: 2022, locations: true });

        this.#traverse(originalAST);

        // Generate the minified code
        const minifiedCode = escodegen.generate(originalAST, { format: { compact: true, space: false } });

        return {
            minifiedCode,
            nameMap: this.#nameMap,
        };
    }
}