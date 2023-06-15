import fs from 'fs';
import { basename } from 'path';
import Minifier from './minifier.js';
import SourceMapper from './sourcemapper.js';

export default class Processor {
    static #readFile(fileName) {
        return fs.readFileSync(fileName, 'utf8');
    }

    static #generateMinifiedCode({ originalCode, minifiedFilePath, minifiedLocalFilePath }) {
        const minifier = new Minifier();
        const minifiedCodeAndNameMap = minifier.traverseAST(originalCode);
        const sourceMapPath = `${minifiedLocalFilePath}.map`;
        const sourceMapUrl = `\n//# sourceMappingURL=${sourceMapPath}`;

        fs.writeFileSync(minifiedFilePath, minifiedCodeAndNameMap.minifiedCode.concat(sourceMapUrl));

        return minifiedCodeAndNameMap;
    }

    static #generateSourceMap({ originalCode, minifiedCode, minifiedFilePath, minifiedLocalFilePath, nameMap }) {
        const sourceMapper = new SourceMapper({
            minifiedLocalFilePath,
        });
        const sourceMapContent = sourceMapper.generateSourceMap({
            originalCode,
            nameMap,
            minifiedCode,
        });

        const sourceMapPath = `${minifiedFilePath}.map`;
        fs.writeFileSync(sourceMapPath, sourceMapContent);
    }

    static #getMinifiedFilePath(fileName) {
        const name = fileName.replace('.js', '');
        return `${name}.min.js`;
    }

    static run(fileName) {
        const originalCode = this.#readFile(fileName);
        const minifiedFilePath = this.#getMinifiedFilePath(fileName);
        const minifiedLocalFilePath = basename(minifiedFilePath);

        const { nameMap, minifiedCode } = this.#generateMinifiedCode({
            originalCode,
            minifiedFilePath,
            minifiedLocalFilePath,
        });

        this.#generateSourceMap({
            originalCode,
            minifiedCode,
            minifiedFilePath,
            minifiedLocalFilePath,
            nameMap
        });
        console.log('Minified code and source map generated successfully.');
    }
}
