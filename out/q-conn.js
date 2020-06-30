"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QConn = void 0;
const vscode_1 = require("vscode");
const path = require("path");
class QConn extends vscode_1.TreeItem {
    constructor(cfg) {
        super(cfg['label'], vscode_1.TreeItemCollapsibleState.None);
        // get description(): string {
        //     if(this.conn){
        //         return 'connected';
        //     }else{
        //         return '';
        //     }
        // }
        this.iconPath = {
            light: path.join(__filename, '..', '..', 'resources', 'light', 'cpu.svg'),
            dark: path.join(__filename, '..', '..', 'resources', 'dark', 'cpu.svg')
        };
        this.contextValue = 'qconn';
        this.host = ('host' in cfg) ? cfg['host'] : 'localhost';
        if (~'port' in cfg) {
            throw new Error('No port found in cfg file');
        }
        this.label = cfg['label'];
        this.port = cfg['port'];
        this.user = ('user' in cfg) ? cfg['user'] : '';
        this.password = ('password' in cfg) ? cfg['password'] : '';
        this.socketNoDelay = ('socketNoDelay' in cfg) ? cfg['socketNoDelay'] : false;
        this.socketTimeout = ('socketTimeout' in cfg) ? cfg['socketTimeout'] : 0;
        this.command = {
            command: 'qservers.connect',
            title: 'connect to q server',
            arguments: [this.label]
        };
    }
    setConn(conn) {
        this.conn = conn;
    }
    get tooltip() {
        return `${this.host}:${this.port}`;
    }
}
exports.QConn = QConn;
//# sourceMappingURL=q-conn.js.map