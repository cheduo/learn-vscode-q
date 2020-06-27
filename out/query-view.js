"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryView = void 0;
const vscode_1 = require("vscode");
const path = require("path");
const fs = require("fs");
const templatePath = './media/qview';
class QueryView {
    constructor(panel, extensionPath) {
        this._disposables = [];
        this._panel = panel;
        this._extensionPath = extensionPath;
        // Set the webview's initial html content
        this.update({ exception: false, data: '' });
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview();
    }
    static createOrShow(extensionPath) {
        const column = vscode_1.window.activeTextEditor ? vscode_1.window.activeTextEditor.viewColumn : undefined;
        if (QueryView.currentPanel) {
            QueryView.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode_1.window.createWebviewPanel(QueryView.viewType, 'Query Result', {
            viewColumn: vscode_1.ViewColumn.Two,
            preserveFocus: true,
        }, {
            // Enable javascript in the webview
            enableScripts: true,
            // And restrict the webview to only loading content from media directory.
            localResourceRoots: [vscode_1.Uri.file(path.join(extensionPath, 'media'))]
        });
        QueryView.currentPanel = new QueryView(panel, extensionPath);
    }
    static revive(panel, extensionPath) {
        QueryView.currentPanel = new QueryView(panel, extensionPath);
    }
    dispose() {
        QueryView.currentPanel = undefined;
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    update(result) {
        this._panel.title = 'Query Result';
        // console.log(result);
        this._panel.webview.postMessage(result);
    }
    _getHtmlForWebview() {
        // Local path to javascript run in the webview
        const jqueryJsFile = vscode_1.Uri.file(path.join(this._extensionPath, templatePath, 'jquery.min.js'));
        const tableJsFile = vscode_1.Uri.file(path.join(this._extensionPath, templatePath, 'tabulator.min.js'));
        const tableCssFile = vscode_1.Uri.file(path.join(this._extensionPath, templatePath, 'tabulator.min.css'));
        const frameJsFile = vscode_1.Uri.file(path.join(this._extensionPath, templatePath, 'bootstrap.min.js'));
        const frameCssFile = vscode_1.Uri.file(path.join(this._extensionPath, templatePath, 'bootstrap.min.css'));
        const webview = this._panel.webview;
        // And the uri we use to load this script in the webview
        const jqueryJsUri = webview.asWebviewUri(jqueryJsFile);
        const tableJsUri = webview.asWebviewUri(tableJsFile);
        const tableCssUri = webview.asWebviewUri(tableCssFile);
        const frameJsUri = webview.asWebviewUri(frameJsFile);
        const frameCssUri = webview.asWebviewUri(frameCssFile);
        let template = fs.readFileSync(path.join(this._extensionPath, templatePath, 'main.html')).toString();
        template = template.replace('{jquery-js}', jqueryJsUri.toString());
        template = template.replace('{table-js}', tableJsUri.toString());
        template = template.replace('{table-css}', tableCssUri.toString());
        template = template.replace('{frame-js}', frameJsUri.toString());
        template = template.replace('{frame-css}', frameCssUri.toString());
        return template;
    }
}
exports.QueryView = QueryView;
QueryView.viewType = 'qResultView';
//# sourceMappingURL=query-view.js.map