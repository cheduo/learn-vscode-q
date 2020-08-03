import {
    window, ExtensionContext, languages, IndentAction, commands, WebviewPanel, CompletionItem, CompletionItemKind,
    Range, StatusBarItem, StatusBarAlignment, TextDocument, TextEdit, workspace, CancellationToken, Position
} from 'vscode';
import { QServerTreeProvider } from './modules/q-server-tree';
import { QConn } from './modules/q-conn';
import { QueryView } from './modules/query-view';
import { qCfgInput } from './modules/q-cfg-input';
import { QueryConsole } from './modules/query-console';
import { QConnManager } from './modules/q-conn-manager';
import { semanticTokensProvider } from './modules/q-semantic-token';
import { MODE, QDocumentRangeFormatter } from './modules/q-formatter';

import path = require('path');

import {
    LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from 'vscode-languageclient';

export function activate(context: ExtensionContext): void {
    // extra language configurations
    languages.setLanguageConfiguration('q', {
        onEnterRules: [
            {
                // eslint-disable-next-line no-useless-escape
                beforeText: /^(?!\s+).*[\(\[{].*$/,
                afterText: /^[)}\]]/,
                action: {
                    indentAction: IndentAction.None,
                    appendText: '\n '
                }
            },
            {
                // eslint-disable-next-line no-useless-escape
                beforeText: /^\s[)}\]];?$/,
                action: {
                    indentAction: IndentAction.Outdent
                }
            }
            // {
            //     // eslint-disable-next-line no-useless-escape
            //     beforeText: /^\/.*$/,
            //     action: {
            //         indentAction: IndentAction.None,
            //         appendText: '/ '
            //     }
            // }
        ]
    });

    const formatter = new QDocumentRangeFormatter();
    context.subscriptions.push(languages.registerDocumentFormattingEditProvider(MODE, formatter));
    context.subscriptions.push(languages.registerDocumentRangeFormattingEditProvider(MODE, formatter));
    context.subscriptions.push(languages.registerCompletionItemProvider(MODE, {
        provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken) {
            let items: CompletionItem[] = [];
            // TODO: Fix auto completion when cancelling completion and then retyping...
            // VS Code doesn't seem to handle completion items with double dots too well.

            // let line = document.lineAt(position.line).text;
            // let leading = line.substring(0, position.character);

            // let index = leading.length - 1;
            // let c = leading[index];

            // while (index >= 0 && (c === '.') || (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
            // 	c = leading[--index];
            // }
            // Replace leading dot if there is any.
            let getInsertText = (x: string) => {
                if ((x.match(/\./g) || []).length > 1) {
                    // if (x.startsWith(leading)) {
                    // 	return x.substring(x.lastIndexOf('.') + 1);
                    // }
                    return x.substr(1);
                }
                return x;
            };
            qServers.qConnManager.keywords.forEach(x => items.push({ label: x, kind: CompletionItemKind.Keyword }));
            qServers.qConnManager.functions.forEach(x => items.push({ label: x, insertText: getInsertText(x), kind: CompletionItemKind.Function }));
            qServers.qConnManager.tables.forEach(x => items.push({ label: x, insertText: getInsertText(x), kind: CompletionItemKind.Value }));
            qServers.qConnManager.variables.forEach(x => items.push({ label: x, insertText: getInsertText(x), kind: CompletionItemKind.Variable }));
            return items;
        }
    }));

    // // append space to start [,(,{
    // languages.registerDocumentFormattingEditProvider('q', {
    //     provideDocumentFormattingEdits(document: TextDocument): TextEdit[] {
    //         const textEdit: TextEdit[] = [];
    //         for (let i = 0; i < document.lineCount; i++) {
    //             const line = document.lineAt(i);
    //             if (line.text.match('^[)\\]}]')) {
    //                 textEdit.push(TextEdit.insert(line.range.start, ' '));
    //             }
    //         }
    //         return textEdit;
    //     }
    // });
    // status bar
    // connStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 99);
    // context.subscriptions.push(connStatusBar);
    // updateConnStatus(undefined);
    // connStatusBar.show();
    // status bar

    // q-server-explorer
    const qServers = new QServerTreeProvider();
    window.registerTreeDataProvider('qservers', qServers);

    commands.registerCommand(
        'qservers.refreshEntry', () => qServers.refresh());

    // q cfg input
    commands.registerCommand(
        'qservers.addEntry',
        async () => {
            const qcfg = await qCfgInput(undefined);
            qServers.qConnManager.addCfg(qcfg);
        });

    commands.registerCommand(
        'qservers.editEntry',
        async (qConn: QConn) => {
            const qcfg = await qCfgInput(qConn, false);
            qServers.qConnManager.addCfg(qcfg);

        });

    commands.registerCommand(
        'qservers.deleteEntry',
        (qConn: QConn) => {
            window.showInputBox(
                { prompt: `Confirm to Remove Server '${qConn.label}' (Y/n)` }
            ).then(value => {
                if (value === 'Y') {
                    qServers.qConnManager.removeCfg(qConn.label);
                }
            });
        });

    commands.registerCommand(
        'qservers.connect',
        label => {
            qServers.qConnManager.connect(false, label);
        });

    commands.registerCommand(
        'qservers.reconnect',
        label => {
            qServers.qConnManager.reconnect();
        });

    commands.registerCommand(
        'qservers.switch',
        () => {
            qServers.qConnManager.switch();
        });

    commands.registerCommand(
        'qservers.toggleMode',
        () => {
            QConnManager.toggleMode();
            if (QConnManager.consoleMode) {
                window.showInformationMessage('Switch to Query Console Mode');
                QueryView.currentPanel?.dispose();
            } else {
                window.showInformationMessage('Switch to Query View Mode');
                QueryConsole.current?.dispose();
            }
            // updateModeStatus();
            // updateConnStatusColor();
        });

    context.subscriptions.push(
        commands.registerCommand('queryview.start', () => {
            if (QueryView.currentPanel === undefined) {
                QueryView.createOrShow(context.extensionPath);
            }
        })
    );

    context.subscriptions.push(
        commands.registerCommand('queryconsole.start', () => {
            if (QueryConsole.current === undefined) {
                QueryConsole.createOrShow();
            }
        })
    );

    context.subscriptions.push(
        commands.registerCommand('qservers.queryCurrentLine', () => {
            const n = window.activeTextEditor?.selection.active.line;
            if (n !== undefined) {
                const query = window.activeTextEditor?.document.lineAt(n).text;
                if (query) {
                    qServers.qConnManager.sync(query);
                }
            }
        })
    );

    context.subscriptions.push(
        commands.registerCommand('qservers.querySelection', () => {
            const query = window.activeTextEditor?.document.getText(
                new Range(window.activeTextEditor.selection.start, window.activeTextEditor.selection.end)
            );
            if (query) {
                qServers.qConnManager.sync(query);
            } else {
                commands.executeCommand('qservers.queryCurrentLine');
            }
        })
    );

    context.subscriptions.push(
        commands.registerCommand('qservers.querySelection0', () => {
            const query = window.activeTextEditor?.document.getText(
                new Range(window.activeTextEditor.selection.start, window.activeTextEditor.selection.end)
            );
            if (query) {
                qServers.qConnManager.sync0(query);
            } else {
                const n = window.activeTextEditor?.selection.active.line;
                if (n !== undefined) {
                    const query = window.activeTextEditor?.document.lineAt(n).text;
                    if (query) {
                        qServers.qConnManager.sync0(query);
                    }
                }
            }
        })
    );

    if (window.registerWebviewPanelSerializer) {
        // Make sure we register a serializer in activation event
        window.registerWebviewPanelSerializer(QueryView.viewType, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async deserializeWebviewPanel(webviewPanel: WebviewPanel) {
                QueryView.revive(webviewPanel, context.extensionPath);
            }
        });
    }
    context.subscriptions.push(semanticTokensProvider);
    if (QConnManager.current) {
        context.subscriptions.push(QConnManager.current);
    }
    const qls = path.join(context.extensionPath, 'out', 'server', 'start-server.js');

    // The debug options for the server
    // runs the server in Node's Inspector mode for debugging
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    if (false) {
        // If launched in debug mode then the debug server options are used
        // Otherwise the run options are used
        const serverOptions: ServerOptions = {
            run: { module: qls, transport: TransportKind.ipc },
            debug: {
                module: qls,
                transport: TransportKind.ipc,
                options: debugOptions
            }
        };

        // Options to control the language client
        const clientOptions: LanguageClientOptions = {
            // Register the server for plain text documents
            documentSelector: [{ scheme: 'file', language: 'q' }],
            synchronize: {
                // Notify the server about file changes to '.clientrc files contained in the workspace
                fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
            }
        };

        // Create the language client and start the client.
        const client = new LanguageClient(
            'qLangServer',
            'q Language Server',
            serverOptions,
            clientOptions
        );

        // Push the disposable to the context's subscriptions so that the
        // client can be deactivated on extension deactivation
        context.subscriptions.push(client.start());
    }
}

export function deactivate(): void {
    QueryView.currentPanel?.dispose();
}
