"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QServerTreeProvider = void 0;
const vscode_1 = require("vscode");
const q_conn_manager_1 = require("./q-conn-manager");
class QServerTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.qConnManager = q_conn_manager_1.QConnManager.create();
    }
    // TODO: keep active conns after refresh
    refresh() {
        this.qConnManager.loadCfg();
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(e) {
        return e;
    }
    getChildren(e) {
        if (e) {
            return Promise.resolve([]);
        }
        else {
            return Promise.resolve(Array.from(this.qConnManager.qConnPool.values()));
        }
    }
}
exports.QServerTreeProvider = QServerTreeProvider;
//# sourceMappingURL=q-server-tree.js.map