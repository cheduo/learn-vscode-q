"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.semanticTokensProvider = void 0;
const vscode_1 = require("vscode");
const tokenTypes = new Map();
const tokenModifiers = new Map();
const legend = (function () {
    const tokenTypesLegend = ['variable', 'parameter'];
    tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));
    const tokenModifiersLegend = [];
    tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));
    return new vscode_1.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();
class DocumentSemanticTokensProvider {
    async provideDocumentSemanticTokens(document, token) {
        const allTokens = this._parseText(document.getText());
        const builder = new vscode_1.SemanticTokensBuilder();
        allTokens.forEach((token) => {
            builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
        });
        return builder.build();
    }
    _encodeTokenType(tokenType) {
        var _a;
        if (tokenTypes.has(tokenType)) {
            return (_a = tokenTypes.get(tokenType)) !== null && _a !== void 0 ? _a : 0;
        }
        else if (tokenType === 'notInLegend') {
            return tokenTypes.size + 2;
        }
        return 0;
    }
    _encodeTokenModifiers(strTokenModifiers) {
        var _a;
        let result = 0;
        for (let i = 0; i < strTokenModifiers.length; i++) {
            const tokenModifier = strTokenModifiers[i];
            if (tokenModifiers.has(tokenModifier)) {
                result = result | (1 << ((_a = tokenModifiers.get(tokenModifier)) !== null && _a !== void 0 ? _a : 0));
            }
            else if (tokenModifier === 'notInLegend') {
                result = result | (1 << tokenModifiers.size + 2);
            }
        }
        return result;
    }
    _parseText(text) {
        const ipt = [];
        const lines = text.split(/\r\n|\r|\n/);
        let offset = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const openOffset = line.indexOf('{', offset);
            if (openOffset === -1) {
                offset = 0;
            }
            else {
                const pos = this._parseParameter(new vscode_1.Position(i, openOffset + 1), lines, ipt);
                // search current in next loop, set -1 to cancel i++
                i = pos.line - 1;
                offset = pos.character;
            }
        }
        return ipt;
    }
    // start from next char of '{'
    _parseParameter(p, lines, ipt) {
        var _a, _b;
        let params = [];
        let startPos = p;
        if (lines[p.line].charAt(p.character) === '[') {
            const closeOffset = lines[p.line].indexOf(']', p.character);
            if (closeOffset > p.character) {
                params = lines[p.line].substring(p.character + 1, closeOffset).replace(/ /g, '').split(';');
                startPos = new vscode_1.Position(p.line, closeOffset + 1);
            }
        }
        let offset = startPos.character;
        // if params undefine, continue to find '}', else set token to the word
        for (let i = startPos.line; i < lines.length; i++) {
            const line = lines[i];
            const openOffset = line.indexOf('{', offset);
            const closeOffset = line.indexOf('}', offset);
            if (openOffset > offset) {
                // case: *** } *** {
                if (closeOffset > offset && closeOffset < openOffset) {
                    this._matchParamters(i, offset, closeOffset - 1, line, ipt, params);
                    return new vscode_1.Position(i, closeOffset + 1);
                }
                else if (closeOffset > openOffset || closeOffset === -1) {
                    // case: *** { *** } | *** { ***
                    this._matchParamters(i, offset, openOffset - 1, line, ipt, params);
                    const pos = this._parseParameter(new vscode_1.Position(i, openOffset + 1), lines, ipt);
                    // search current in next loop, set -1 to cancel i++
                    i = pos.line - 1;
                    offset = pos.character;
                }
            }
            else if (closeOffset > offset) {
                // case: *** } ***
                this._matchParamters(i, offset, closeOffset - 1, line, ipt, params);
                return new vscode_1.Position(i, closeOffset + 1);
            }
            else {
                // case : ***
                this._matchParamters(i, offset, line.length, line, ipt, params);
                offset = 0;
            }
        }
        return new vscode_1.Position(lines.length - 1, ((_b = (_a = lines.slice(-1).pop()) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0));
    }
    _matchParamters(i, start, end, line, ipt, params) {
        params.forEach(p => {
            if (p === '') {
                return;
            }
            const regex = new RegExp('\\b' + p + '\\b', 'g');
            let match;
            while ((match = regex.exec(line)) != null) {
                if (match.index > start && match.index <= end) {
                    ipt.push({
                        line: i,
                        startCharacter: match.index,
                        length: p.length,
                        tokenType: 'parameter',
                        tokenModifiers: []
                    });
                }
            }
        });
    }
}
exports.semanticTokensProvider = vscode_1.languages.registerDocumentSemanticTokensProvider({ language: 'q' }, new DocumentSemanticTokensProvider(), legend);
//# sourceMappingURL=q-semantic-token.js.map