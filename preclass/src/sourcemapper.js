import { SourceMapGenerator } from 'source-map';

export default class SourceMapper {
  #minifiedLocalFilePath
  #sourceMap

  constructor({ minifiedLocalFilePath }) {
    this.#minifiedLocalFilePath = minifiedLocalFilePath;
    this.#sourceMap = new SourceMapGenerator({ file: this.#minifiedLocalFilePath });
  }

  #findAllOccurrences(str, substring) {
    const positions = Array.from(str.matchAll(new RegExp(substring, 'g')), (match) =>
      this.#getLineAndColumn(str, match.index)
    );
    return positions;
  }

  #getLineAndColumn(str, position) {
    const lines = str.slice(0, position).split('\n');
    const lineLength = lines.length;
    const column = lines[lineLength - 1].length;
    return { line: lineLength, column };
  }

  #addMappingToSourceMap({ originalPosition, minifiedPosition, minifiedName }) {
    const mapping = {
      original: { line: originalPosition.line, column: originalPosition.column },
      generated: { line: minifiedPosition.line, column: minifiedPosition.column },
      source: this.#minifiedLocalFilePath,
      name: minifiedName,
    };
    this.#sourceMap.addMapping(mapping);
  }

  generateSourceMap({ originalCode, nameMap, minifiedCode }) {
    for (const [originalName, minifiedName] of nameMap) {
      const originalPositions = this.#findAllOccurrences(originalCode, originalName);
      const minifiedPositions = this.#findAllOccurrences(minifiedCode, minifiedName);

      originalPositions.forEach((originalPosition, index) => {
        const minifiedPosition = minifiedPositions[index];
        this.#addMappingToSourceMap({
          originalPosition,
          minifiedPosition,
          minifiedName
        });
      });
    }

    this.#sourceMap.setSourceContent(this.#minifiedLocalFilePath, originalCode);

    return this.#sourceMap.toString()
  }
}
