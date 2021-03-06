import * as Parser from 'web-tree-sitter';

export async function initializeParser(): Promise<Parser> {
    await Parser.init();
    const qParser = new Parser();
    const lang = await Parser.Language.load(`${__dirname}/../../resources/tree-sitter-q.wasm`);
    qParser.setLanguage(lang);
    return qParser;
}
