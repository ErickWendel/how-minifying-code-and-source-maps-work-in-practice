import * as acorn from 'acorn';
import escodegen from 'escodegen';

export default class Minifier {
    constructor(originalCode) {
        this.originalCode = originalCode;
        this.nameMap = new Map();
        this.minifiedCode = '';
        this.alphabet = 'abcdefghijklmnopqrstuvwxyz';
        this.currentAlphabetIndex = 0;
    }

    traverseAST() {
        const generateName = () => {
            let newName = '';
            if (this.currentAlphabetIndex < this.alphabet.length) {
                newName = this.alphabet[this.currentAlphabetIndex];
            } else {
                const suffix = Math.floor(this.currentAlphabetIndex / this.alphabet.length);
                newName = this.alphabet[suffix - 1] + this.alphabet[this.currentAlphabetIndex % this.alphabet.length];
            }
            this.currentAlphabetIndex++;
            return newName;
        };

        const traverse = (node) => {
            const handlers = {
                VariableDeclaration: (node) => {
                    for (const declaration of node.declarations) {
                        const oldName = declaration.id.name;
                        const newName = this.nameMap.get(oldName) || generateName();
                        this.nameMap.set(oldName, newName);
                        declaration.id.name = newName;
                    }
                },
                FunctionDeclaration: (node) => {
                    const oldName = node.id.name;
                    const newName = this.nameMap.get(oldName) || generateName();
                    this.nameMap.set(oldName, newName);
                    node.id.name = newName;

                    for (const param of node.params) {
                        const oldParamName = param.name;
                        const newParamName = this.nameMap.get(oldParamName) || generateName();
                        this.nameMap.set(oldParamName, newParamName);
                        param.name = newParamName;
                    }
                },
                Identifier: (node) => {
                    const oldName = node.name;
                    const newName = this.nameMap.get(oldName);
                    if (newName) {
                        node.name = newName;
                    }
                },
            };

            const handler = handlers[node.type];
            if (handler) {
                handler(node);
            }

            for (const key in node) {
                if (typeof node[key] === 'object' && node[key] !== null) {
                    traverse(node[key]);
                }
            }
        };

        // Parse the original code into an AST
        const ast = acorn.parse(this.originalCode, { ecmaVersion: 2022 });

        // Traverse the AST and minify names
        traverse(ast);

        // Generate the minified code
        this.minifiedCode = escodegen.generate(ast, { format: { compact: true, space: false } });

        return this;
    }

    getMinifiedCode() {
        return this.minifiedCode;
    }

    getNameMap() {
        return this.nameMap;
    }
}