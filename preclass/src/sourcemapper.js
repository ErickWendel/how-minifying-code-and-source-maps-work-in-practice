import { SourceMapGenerator } from 'source-map';
import * as acorn from 'acorn';
import ASTHelper from './ast-helper.js';

export default class SourceMapper {
  #minifiedLocalFilePath
  #sourceMap
  #minifiedItems = new Map();
  constructor({ minifiedLocalFilePath }) {
    this.#minifiedLocalFilePath = minifiedLocalFilePath;
    this.#sourceMap = new SourceMapGenerator({ file: this.#minifiedLocalFilePath });
  }

  #handleDeclaration({ loc: { start }, name }) {
    if (this.#minifiedItems.has(name)) {
      const nameMap = this.#minifiedItems.get(name)
      nameMap.positions.push(start)
      this.#minifiedItems.set(name, nameMap);
      return;
    }

    this.#minifiedItems.set(name, { name, positions: [start] });
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
        const name = this.#minifiedItems.get(oldName);
        if (!name) return;

        this.#handleDeclaration(node);
      })
      .traverse(minifiedAST);
  }

  generateSourceMap({ originalCode, nameMap, minifiedCode }) {
    const ast = acorn.parse(minifiedCode, { ecmaVersion: 2022, locations: true });
    this.#traverse(ast);
    this.#generateSourceMapData({ nameMap, originalCode });

    return this.#sourceMap.toString()
  }

  #generateSourceMapData({ nameMap, originalCode }) {
    const originalItems = [...nameMap.values()];
    this.#sourceMap.setSourceContent(this.#minifiedLocalFilePath, originalCode);

    originalItems.forEach(({ newName, positions }) => {
      const minifiedPositions = this.#minifiedItems.get(newName).positions
      // workaround
      minifiedPositions.shift();

      minifiedPositions.forEach((minifiedPosition, index) => {
        const originalPosition = positions[index];

        const mapping = {
          original: originalPosition,
          generated: minifiedPosition,
          source: this.#minifiedLocalFilePath,
          name: newName,
        };

        this.#sourceMap.addMapping(mapping);
      });
    });
  }

}
