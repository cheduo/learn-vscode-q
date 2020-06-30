"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QConnManager = void 0;
/* eslint-disable quotes */
const vscode_1 = require("vscode");
const q = require("node-q");
const os_1 = require("os");
const fs = require("fs");
const q_conn_1 = require("./q-conn");
const query_view_1 = require("./query-view");
const query_console_1 = require("./query-console");
const cfgDir = os_1.homedir() + '/.vscode/';
const cfgPath = cfgDir + 'q-server-cfg.json';
class QConnManager {
    constructor() {
        this.qConnPool = new Map();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.qCfg = [];
        this.loadCfg();
        QConnManager.updateQueryWrapper();
    }
    static create() {
        if (this.current) {
            return this.current;
        }
        else {
            return new QConnManager();
        }
    }
    static toggleMode() {
        QConnManager.consoleMode = !QConnManager.consoleMode;
        QConnManager.updateQueryWrapper();
    }
    static updateQueryWrapper() {
        if (QConnManager.consoleMode) {
            QConnManager.queryWrapper = '{{.Q.trp[x;y;{x,"\n",.Q.sbt@(-4)_y}]}[{.Q.S[system"c";0j;value x]};x]}';
        }
        else {
            QConnManager.queryWrapper = '@[{r:value x;r:$[99h<>t:type r;r;98h=type key r;0!r;enlist r];`exception`type`data`cols!(0b;t;r;$[t in 98 99h;cols r;()])};;{`exception`data!(1b;x)}]';
        }
    }
    getConn(label) {
        return this.qConnPool.get(label);
    }
    connect(label) {
        try {
            const qConn = this.getConn(label);
            if (qConn) {
                const conn = qConn.conn;
                if (conn) {
                    this.activeConn = conn;
                    this.activeConnLabel = label;
                    vscode_1.commands.executeCommand('qservers.updateStatusBar', label);
                }
                else {
                    q.connect(qConn, (err, conn) => {
                        if (err)
                            vscode_1.window.showErrorMessage(err.message);
                        if (conn) {
                            conn.addListener("close", _hadError => {
                                if (_hadError) {
                                    console.log("Error happened during closing connection");
                                }
                                // todo: remove connection, update status bar
                                this.removeConn(label);
                            });
                            qConn === null || qConn === void 0 ? void 0 : qConn.setConn(conn);
                            this.activeConn = conn;
                            this.activeConnLabel = label;
                            vscode_1.commands.executeCommand('qservers.updateStatusBar', label);
                        }
                    });
                }
            }
        }
        catch (error) {
            vscode_1.window.showErrorMessage(`Failed to connect to '${label}', please check q-server-cfg.json`);
        }
    }
    sync(query) {
        if (this.activeConn) {
            this.activeConn.k(QConnManager.queryWrapper, query, (err, res) => {
                var _a, _b, _c, _d;
                if (err) {
                    if (QConnManager.consoleMode) {
                        vscode_1.commands.executeCommand('queryconsole.start');
                        (_a = query_console_1.QueryConsole.current) === null || _a === void 0 ? void 0 : _a.append(res);
                    }
                    else {
                        vscode_1.commands.executeCommand('queryview.start');
                        (_b = query_view_1.QueryView.currentPanel) === null || _b === void 0 ? void 0 : _b.update({
                            exception: true,
                            data: err
                        });
                    }
                }
                if (res) {
                    if (QConnManager.consoleMode) {
                        vscode_1.commands.executeCommand('queryconsole.start');
                        (_c = query_console_1.QueryConsole.current) === null || _c === void 0 ? void 0 : _c.append(res);
                    }
                    else {
                        vscode_1.commands.executeCommand('queryview.start');
                        (_d = query_view_1.QueryView.currentPanel) === null || _d === void 0 ? void 0 : _d.update(res);
                    }
                }
            });
        }
        else {
            vscode_1.window.showErrorMessage('No Active q Connection');
        }
    }
    loadCfg() {
        // read the q server configuration file from home dir
        if (fs.existsSync(cfgPath)) {
            this.qCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
            // reserver current conn
            const currentQconnPool = new Map(this.qConnPool);
            this.qConnPool.clear();
            this.qCfg.forEach((qcfg) => {
                var _a;
                if (qcfg.label in currentQconnPool) {
                    const qConn = new q_conn_1.QConn(qcfg);
                    qConn.setConn((_a = currentQconnPool.get(qcfg.label)) === null || _a === void 0 ? void 0 : _a.conn);
                    this.qConnPool.set(qcfg.label, qConn);
                }
                else {
                    this.qConnPool.set(qcfg['label'], new q_conn_1.QConn(qcfg));
                }
            });
        }
        else {
            if (!fs.existsSync(cfgDir)) {
                fs.mkdirSync(cfgDir);
            }
            fs.writeFileSync(cfgPath, '[]', 'utf8');
        }
    }
    addCfg(qcfg) {
        const label = qcfg.label;
        this.qCfg = this.qCfg.filter(qcfg => qcfg.label !== label);
        this.qCfg.push(qcfg);
        this.qCfg.sort((q1, q2) => q1.label.localeCompare(q2.label));
        this.dumpCfg();
        vscode_1.commands.executeCommand('qservers.refreshEntry');
    }
    removeCfg(label) {
        this.qCfg = this.qCfg.filter(qcfg => qcfg.label !== label);
        this.dumpCfg();
        vscode_1.commands.executeCommand('qservers.refreshEntry');
    }
    dumpCfg() {
        fs.writeFileSync(cfgPath, JSON.stringify(this.qCfg, null, 4), 'utf8');
    }
    removeConn(label) {
        const qConn = this.getConn(label);
        qConn === null || qConn === void 0 ? void 0 : qConn.setConn(undefined);
        if (this.activeConnLabel === label) {
            this.activeConn = undefined;
            vscode_1.commands.executeCommand('qservers.updateStatusBar', undefined);
        }
        vscode_1.window.showWarningMessage(`Lost connection to ${label.toUpperCase()}`);
    }
}
exports.QConnManager = QConnManager;
// exception: true|false
// type: number
// data: return
// cols: columns of table
QConnManager.queryWrapper = "";
QConnManager.consoleMode = true;
//# sourceMappingURL=q-conn-manager.js.map