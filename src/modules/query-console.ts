import { OutputChannel, window, Disposable, commands } from 'vscode';
export class QueryConsole {
    public static current: QueryConsole | undefined;
    public static readonly viewType = 'query-console';
    private readonly _console: OutputChannel;
    private _disposables: Disposable[] = [];
    public static createOrShow(): void {
        if (QueryConsole.current) {
            // QueryConsole.current._console.show(true);
        } else {
            const _console = window.createOutputChannel('q Console');
            // _console.show(true);
            QueryConsole.current = new QueryConsole(_console);
        }
    }
    private constructor(console: OutputChannel) {
        this._console = console;
    }

    public dispose(): void {
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

    public append(output: string | string[]): void {
        this._console.clear();
        this._console.appendLine('========== cut line ==========');
        if (Array.isArray(output)) {
            // could change parameter: 300
            let max_row = 300;
            max_row += 3;
            if (output.length >= max_row) {
                output.slice(0, max_row).forEach(o => this._console.appendLine(o));
                this._console.appendLine("...");
            } else {
                output.forEach(o => this._console.appendLine(o));
            }
        } else {
            this._console.appendLine(output);
        }
        this._console.show(true);
        // commands.executeCommand('workbench.action.terminal.scrollToTop');
    }
}
