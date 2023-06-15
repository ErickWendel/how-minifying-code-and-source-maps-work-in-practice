import { SourceMapGenerator } from 'source-map';
import { basename } from 'path';

export default class SourceMapper {
    constructor({ originalCode, nameMap, fileName, minifiedCode }) {
      this.originalCode = originalCode;
      this.nameMap = nameMap;
      this.fileName = fileName;
      this.minifiedCode = minifiedCode;
      this.sourceMap = new SourceMapGenerator({ file: basename(this.getMinifiedFilePath()) });
    }

    getMinifiedFilePath() {
      const name =this.fileName.replace('.js', '');
      return `${name}.min.js`;
    }

    generateSourceMap() {
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
      const sourceContentFileName = basename(this.fileName);
      for (const [originalName, minifiedName] of this.nameMap) {
        const originalPositions = findAllOccurrences(this.originalCode, originalName);
        const minifiedPositions = findAllOccurrences(this.minifiedCode, minifiedName);

        originalPositions.forEach((originalPosition, index) => {
          const minifiedPosition = minifiedPositions[index];
          const mapping = {
            original: { line: originalPosition.line, column: originalPosition.column },
            generated: { line: minifiedPosition.line, column: minifiedPosition.column },
            source: sourceContentFileName,
            name: minifiedName,
          };
          this.sourceMap.addMapping(mapping);
        });
      }

    //   this.sourceMap.file = // this.getMinifiedFilePath();
      this.sourceMap.setSourceContent(sourceContentFileName, this.originalCode);

      return this;
    }

    getSourceMap() {
      return this.sourceMap;
    }
  }