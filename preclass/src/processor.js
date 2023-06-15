import fs from 'fs';
import { basename } from 'path';
import Minifier from './minifier.js';
import SourceMapper from './sourcemapper.js';

export default class Processor {
    static #readFile(fileName) {
        return fs.readFileSync(fileName, 'utf8');
    }

    static #writeFile(filePath, content) {
        fs.writeFileSync(filePath, content);
    }

    static run(fileName) {
        const originalCode = this.#readFile(fileName);

        const minifier = new Minifier(originalCode);
        minifier.traverseAST();

        const sourceMapper = new SourceMapper({
            originalCode: minifier.originalCode,
            nameMap: minifier.getNameMap(),
            fileName,
            minifiedCode: minifier.getMinifiedCode(),
        });
        sourceMapper.generateSourceMap();

        const minifiedFilePath = sourceMapper.getMinifiedFilePath();
        const sourceMapPath = `${minifiedFilePath}.map`;

        this.#writeFile(minifiedFilePath, minifier.getMinifiedCode() + `\n//# sourceMappingURL=${basename(sourceMapPath)}`);

        const sourceMapContent = sourceMapper.getSourceMap().toString()
        this.#writeFile(sourceMapPath, sourceMapContent);

        console.log('Minified code and source map generated successfully.');
    }
}
