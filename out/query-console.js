"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryConsole = void 0;
const vscode_1 = require("vscode");
class QueryConsole {
    constructor(console) {
        this._disposables = [];
        this._console = console;
    }
    static createOrShow() {
        if (QueryConsole.current) {
            QueryConsole.current._console.show(true);
        }
        else {
            const _console = vscode_1.window.createOutputChannel('q Console');
            _console.show(true);
            QueryConsole.current = new QueryConsole(_console);
        }
    }
    dispose() {
        QueryConsole.current = undefined;
        // Clean up our resources
        this._console.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    append(output) {
        this._console.clear();
        this._console.appendLine('========== cut line ==========');
        if (Array.isArray(output)) {
            output.forEach(o => this._console.appendLine(o));
        }
        else {
            this._console.appendLine(output);
        }
        this._console.show(true);
    }
}
exports.QueryConsole = QueryConsole;
QueryConsole.viewType = 'query-console';
//# sourceMappingURL=query-console.js.map