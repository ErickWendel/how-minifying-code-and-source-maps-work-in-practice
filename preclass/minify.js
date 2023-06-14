const fs = require('fs');
const acorn = require('acorn');
const escodegen = require('escodegen');
const { SourceMapGenerator } = require('source-map');

class Minifier {
  constructor(fileName) {
    this.fileName = fileName;
    this.originalCode = '';
    this.nameMap = new Map();
    this.minifiedCode = '';
    this.sourceMap = new SourceMapGenerator({ file: this.getMinifiedFilePath() });
    this.alphabet = 'abcdefghijklmnopqrstuvwxyz';
    this.currentAlphabetIndex = 0;
  }

  readOriginalCode() {
    this.originalCode = fs.readFileSync(this.fileName, 'utf8');
    return this;
  }

  generateName() {
    return () => {
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
  }

  traverseAST() {
    const ast = acorn.parse(this.originalCode, { ecmaVersion: 2022 });
    const generateName = this.generateName();

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

    traverse(ast);

    this.minifiedCode = escodegen.generate(ast, { format: { compact: true, space: false } });

    return this;
  }

  generateSourceMap() {
    const sourceMap = this.sourceMap;

    const findAllOccurrences = (str, substring) => {
      const positions = [];
      let position = 0;
      while (position !== -1) {
        position = str.indexOf(substring, position);
        if (position !== -1) {
          positions.push(getLineAndColumn(str, position));
          position += substring.length;
        }
      }
      return positions;
    };

    const getLineAndColumn = (str, position) => {
      let line = 1;
      let column = 0;
      for (let i = 0; i < position; i++) {
        if (str[i] === '\n') {
          line++;
          column = 0;
        } else {
          column++;
        }
      }
      return { line, column };
    };

    for (const [originalName, minifiedName] of this.nameMap) {
      const originalPositions = findAllOccurrences(this.originalCode, originalName);
      const minifiedPositions = findAllOccurrences(this.minifiedCode, minifiedName);

      originalPositions.forEach((originalPosition, index) => {
        const minifiedPosition = minifiedPositions[index];
        const mapping = {
          original: { line: originalPosition.line, column: originalPosition.column },
          generated: { line: minifiedPosition.line, column: minifiedPosition.column },
          source: this.fileName,
          name: minifiedName,
        };
        sourceMap.addMapping(mapping);
      });
    }

    sourceMap.file = this.getMinifiedFilePath();
    sourceMap.setSourceContent(this.fileName, this.originalCode);

    return this;
  }

  getMinifiedFilePath() {
    const name = this.fileName.replace('.js', '');
    return `${name}.min.js`;
  }

  writeFiles() {
    const minifiedFilePath = this.getMinifiedFilePath();
    const sourceMapPath = `${minifiedFilePath}.map`;

    const sourceMapWithContent = {
      ...this.sourceMap.toJSON(),
      sourcesContent: [this.originalCode],
      sourceRoot: '',
    };

    const minifiedCodeWithSourceMap = this.minifiedCode + `\n//# sourceMappingURL=${sourceMapPath}`;

    fs.writeFileSync(minifiedFilePath, minifiedCodeWithSourceMap);
    fs.writeFileSync(sourceMapPath, JSON.stringify(sourceMapWithContent, null, 2));

    return this;
  }

  run() {
    this.readOriginalCode()
      .traverseAST()
      .generateSourceMap()
      .writeFiles();

    console.log('Minified code and source map generated successfully.');
  }
}

function main() {
  const fileName = process.argv[2];
  const minifier = new Minifier(fileName);
  minifier.run();
}

main();
