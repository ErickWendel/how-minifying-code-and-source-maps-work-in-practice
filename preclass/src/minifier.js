import * as acorn from 'acorn';
import escodegen from 'escodegen';

export default class Minifier {
    #nameMap = new Map();
    // limited to 26 characters
    #alphabet = Array.from('abcdefghijklmnopqrstuvwxyz');

    #generateName(oldName = '') {
        // If the name exists in the nameMap, return the corresponding new name
        if (this.#nameMap.has(oldName)) {
            return this.#nameMap.get(oldName);
        }
        // Throw an error if the alphabet is empty
        if (!this.#alphabet.length) {
            throw new Error('Alphabet is empty - we expect at most 26 keyword to be used in the code');
        }

        // Shift the next character from the alphabet
        return this.#alphabet.shift();
    }

    #handleDeclaration(declaration) {
        const oldName = declaration.name;
        const newName = this.#generateName(oldName);
        this.#nameMap.set(oldName, newName);
        declaration.name = newName;
    }

    #handleVariableDeclaration(node) {
        for (const declaration of node.declarations) {
            this.#handleDeclaration(declaration.id);
        }
    }

    #handleFunctionDeclaration(node) {
        this.#handleDeclaration(node.id);
        for (const param of node.params) {
            this.#handleDeclaration(param);
        }
    }

    #handleIdentifier(node) {
        const oldName = node.name;
        const newName = this.#nameMap.get(oldName);
        if (newName) {
            node.name = newName;
        }
    }


    #traverse(node) {
        const handlers = {
            VariableDeclaration: this.#handleVariableDeclaration.bind(this),
            FunctionDeclaration: this.#handleFunctionDeclaration.bind(this),
            Identifier: this.#handleIdentifier.bind(this),
        };

        const handler = handlers[node.type];
        if (handler) {
            handler.call(this, node);
        }

        for (const key in node) {
            if (typeof node[key] === 'object' && node[key] !== null) {
                this.#traverse(node[key]);
            }
        }
    }

    traverseAST(originalCode) {
        // Parse the original code into an AST
        const ast = acorn.parse(originalCode, { ecmaVersion: 2022 });

        // Traverse the AST and minify names
        this.#traverse(ast);

        // Generate the minified code
        const minifiedCode = escodegen.generate(ast, { format: { compact: true, space: false } });

        return {
            minifiedCode,
            nameMap: this.#nameMap,
        };
    }
}