"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode_1 = require("vscode");
const q_server_tree_1 = require("./q-server-tree");
const query_view_1 = require("./query-view");
const q_cfg_input_1 = require("./q-cfg-input");
const query_console_1 = require("./query-console");
const q_conn_manager_1 = require("./q-conn-manager");
const q_semantic_token_1 = require("./q-semantic-token");
let connStatusBar;
let modeStatusBar;
function activate(context) {
    // extra language configurations
    vscode_1.languages.setLanguageConfiguration('q', {
        onEnterRules: [
            {
                // eslint-disable-next-line no-useless-escape
                beforeText: /^(?!\s+).*[\(\[{].*$/,
                afterText: /^[)}\]]/,
                action: {
                    indentAction: vscode_1.IndentAction.None,
                    appendText: '\n '
                }
            },
            {
                // eslint-disable-next-line no-useless-escape
                beforeText: /^\s[)}\]];?$/,
                action: {
                    indentAction: vscode_1.IndentAction.Outdent
                }
            },
            {
                // eslint-disable-next-line no-useless-escape
                beforeText: /^\/.*$/,
                action: {
                    indentAction: vscode_1.IndentAction.None,
                    appendText: '/ '
                }
            }
        ]
    });
    // append space to start [,(,{
    vscode_1.languages.registerDocumentFormattingEditProvider('q', {
        provideDocumentFormattingEdits(document) {
            const textEdit = [];
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                if (line.text.match('^[)\\]}]')) {
                    textEdit.push(vscode_1.TextEdit.insert(line.range.start, ' '));
                }
            }
            return textEdit;
        }
    });
    // status bar
    connStatusBar = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 99);
    context.subscriptions.push(connStatusBar);
    updateConnStatus(undefined);
    connStatusBar.show();
    // status bar
    modeStatusBar = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 100);
    context.subscriptions.push(modeStatusBar);
    updateModeStatus();
    modeStatusBar.show();
    vscode_1.commands.registerCommand('qservers.updateStatusBar', name => updateConnStatus(name));
    // q-server-explorer
    const qServers = new q_server_tree_1.QServerTreeProvider();
    vscode_1.window.registerTreeDataProvider('qservers', qServers);
    vscode_1.commands.registerCommand('qservers.refreshEntry', () => qServers.refresh());
    // q cfg input
    vscode_1.commands.registerCommand('qservers.addEntry', async () => {
        const qcfg = await q_cfg_input_1.qCfgInput(undefined);
        qServers.qConnManager.addCfg(qcfg);
    });
    vscode_1.commands.registerCommand('qservers.editEntry', async (qConn) => {
        const qcfg = await q_cfg_input_1.qCfgInput(qConn, false);
        qServers.qConnManager.addCfg(qcfg);
    });
    vscode_1.commands.registerCommand('qservers.deleteEntry', (qConn) => {
        vscode_1.window.showInputBox({ prompt: `Confirm to Remove Server '${qConn.label}' (Y/n)` }).then(value => {
            if (value === 'Y') {
                qServers.qConnManager.removeCfg(qConn.label);
            }
        });
    });
    vscode_1.commands.registerCommand('qservers.connect', label => {
        qServers.qConnManager.connect(label);
    });
    vscode_1.commands.registerCommand('qservers.toggleMode', () => {
        var _a, _b;
        q_conn_manager_1.QConnManager.toggleMode();
        if (q_conn_manager_1.QConnManager.consoleMode) {
            vscode_1.window.showInformationMessage('Switch to Query Console Mode');
            (_a = query_view_1.QueryView.currentPanel) === null || _a === void 0 ? void 0 : _a.dispose();
        }
        else {
            vscode_1.window.showInformationMessage('Switch to Query View Mode');
            (_b = query_console_1.QueryConsole.current) === null || _b === void 0 ? void 0 : _b.dispose();
        }
        updateModeStatus();
        updateConnStatusColor();
    });
    context.subscriptions.push(vscode_1.commands.registerCommand('queryview.start', () => {
        if (query_view_1.QueryView.currentPanel === undefined) {
            query_view_1.QueryView.createOrShow(context.extensionPath);
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('queryconsole.start', () => {
        if (query_console_1.QueryConsole.current === undefined) {
            query_console_1.QueryConsole.createOrShow();
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('qservers.queryCurrentLine', () => {
        var _a, _b;
        const n = (_a = vscode_1.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.selection.active.line;
        if (n !== undefined) {
            const query = (_b = vscode_1.window.activeTextEditor) === null || _b === void 0 ? void 0 : _b.document.lineAt(n).text;
            if (query) {
                qServers.qConnManager.sync(query);
            }
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('qservers.querySelection', () => {
        var _a;
        const query = (_a = vscode_1.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.getText(new vscode_1.Range(vscode_1.window.activeTextEditor.selection.start, vscode_1.window.activeTextEditor.selection.end));
        if (query) {
            qServers.qConnManager.sync(query);
        }
    }));
    if (vscode_1.window.registerWebviewPanelSerializer) {
        // Make sure we register a serializer in activation event
        vscode_1.window.registerWebviewPanelSerializer(query_view_1.QueryView.viewType, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async deserializeWebviewPanel(webviewPanel) {
                query_view_1.QueryView.revive(webviewPanel, context.extensionPath);
            }
        });
    }
    context.subscriptions.push(q_semantic_token_1.semanticTokensProvider);
}
exports.activate = activate;
function updateConnStatus(name) {
    if (name) {
        if (q_conn_manager_1.QConnManager.consoleMode) {
            connStatusBar.text = name.toUpperCase();
            connStatusBar.color = '#FF79C6';
        }
        else {
            connStatusBar.text = name.toUpperCase();
            connStatusBar.color = '#8BE9FD';
        }
    }
    else {
        connStatusBar.text = 'Disconnected';
        connStatusBar.color = '#6272A4';
    }
}
function updateConnStatusColor() {
    if (q_conn_manager_1.QConnManager.consoleMode) {
        connStatusBar.color = '#FF79C6';
    }
    else {
        connStatusBar.color = '#8BE9FD';
    }
}
function updateModeStatus() {
    if (q_conn_manager_1.QConnManager.consoleMode) {
        modeStatusBar.text = '$(debug-console)';
        modeStatusBar.color = '#FF79C6';
    }
    else {
        modeStatusBar.text = '$(graph)';
        modeStatusBar.color = '#8BE9FD';
    }
}
function deactivate() {
    var _a;
    (_a = query_view_1.QueryView.currentPanel) === null || _a === void 0 ? void 0 : _a.dispose();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map