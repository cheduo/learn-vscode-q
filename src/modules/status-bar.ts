import {window, StatusBarItem, StatusBarAlignment} from 'vscode';

import { QConn } from "./q-conn";

export class ConnStatus {
    // public static current: ConnStatus | undefined;
    connStatusBar: StatusBarItem;
    constructor() {
        this.connStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 99);
        this.update(undefined);
        this.connStatusBar.show();
    }

    public update(qConn: QConn | undefined) {
        if (qConn) {
            this.connStatusBar.text = qConn.label.toUpperCase();
            this.connStatusBar.color = qConn.pending ? 'red' : 'green';
        } else {
            this.connStatusBar.text = 'Disconnected';
            this.connStatusBar.color = 'grey';
        }
    }

    public dispose(): void {
        this.connStatusBar.dispose();
    }
}

export class ModeStatus {
    // public static current: ConnStatus | undefined;
    modeStatusBar: StatusBarItem;
    constructor() {
        this.modeStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 100);
        this.update(true);
        this.modeStatusBar.show();
        // context.subscriptions.push(modeStatusBar);   
    }

    public update(consoleMode: boolean) {
        if (consoleMode) {
            this.modeStatusBar.text = '$(debug-console)';
            this.modeStatusBar.color = '#FF79C6';
        } else {
            this.modeStatusBar.text = '$(graph)';
            this.modeStatusBar.color = '#8BE9FD';
        }
    }

    public dispose(): void {
        this.modeStatusBar.dispose();
    }
}
