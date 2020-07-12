/* eslint-disable quotes */
import { window, commands } from "vscode";
import * as q from "node-q";
import { homedir } from "os";
import * as fs from "fs";
import { QConn } from "./q-conn";
import { QueryView } from "./query-view";
import { QueryConsole } from "./query-console";

const cfgDir = homedir() + '/.vscode/';
const cfgPath = cfgDir + 'q-server-cfg.json';

export class QConnManager {
    public static current: QConnManager | undefined;
    qConnPool = new Map<string, QConn>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qCfg: QCfg[] = [];
    activeConn: q.Connection | undefined;
    activeConnLabel: string | undefined;
    qConn: QConn | undefined;
    // exception: true|false
    // type: number
    // data: return
    // cols: columns of table
    public static queryWrapper = "";
    public static consoleMode = true;

    public static create(): QConnManager {
        if (this.current) {
            return this.current;
        } else {
            return new QConnManager();
        }
    }

    private constructor() {
        this.loadCfg();
        QConnManager.updateQueryWrapper();
    }

    public static toggleMode(): void {
        QConnManager.consoleMode = !QConnManager.consoleMode;
        QConnManager.updateQueryWrapper();
    }

    public static updateQueryWrapper(): void {
        if (QConnManager.consoleMode) {
            QConnManager.queryWrapper = '{{.Q.trp[x;y;{x,"\n",.Q.sbt@(-4)_y}]}[{.Q.S[system"c";0j;0 x]};x]}';
        } else {
            QConnManager.queryWrapper = '@[{r:value x;r:$[99h<>t:type r;r;98h=type key r;0!r;enlist r];`exception`type`data`cols!(0b;t;r;$[t in 98 99h;cols r;()])};;{`exception`data!(1b;x)}]';
        }
    }

    getConn(label: string): QConn | undefined {
        return this.qConnPool.get(label);
    }

    connect(label: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.qConn = this.getConn(label);
                if (this.qConn) {
                    const conn = this.qConn.conn;
                    if (conn) {
                        this.activeConn = conn;
                        this.activeConnLabel = label;
                        commands.executeCommand('qservers.updateStatusBar', label);
                        resolve();
                    } else {
                        q.connect(this.qConn,
                            (err, conn) => {
                                if (err) window.showErrorMessage(err.message);
                                if (conn) {
                                    conn.addListener("close", _hadError => {
                                        if (_hadError) {
                                            console.log("Error happened during closing connection");
                                        }
                                        // todo: remove connection, update status bar
                                        this.removeConn(label);
                                    });
                                    this.qConn?.setConn(conn);
                                    this.activeConn = conn;
                                    this.activeConnLabel = label;
                                    commands.executeCommand('qservers.updateStatusBar', label);
                                }
                                resolve();
                            }
                        );
                    }
                }
            } catch (error) {
                window.showErrorMessage(`Failed to connect to '${label}', please check q-server-cfg.json`);
                resolve();
            }
        })
    }

    async switch() {
        this.activeConnLabel = await window.showQuickPick(
            Array.from(this.qConnPool.keys()),
            { placeHolder: 'select a Q server' }
        );
        this.activeConnLabel ? await this.connect(this.activeConnLabel) : window.showErrorMessage('No Active q Connection');
    }

    async syncx(queryWrapper: string, query: string) {
        if (!this.activeConn || !this.qConn) {
            this.activeConnLabel ? await this.connect(this.activeConnLabel) : await this.switch();
        }
        if (this.activeConn && this.qConn) {
            if (this.qConn.pending) {
                window.showErrorMessage(this.qConn.label + ' is still running ...');
                return;
            }
            this.qConn.pending = true;
            commands.executeCommand('qservers.toggleConnColor', this.qConn.pending);
            this.activeConn.k(queryWrapper, query,
                (err, res) => {
                    if (err) {
                        if (QConnManager.consoleMode) {
                            commands.executeCommand('queryconsole.start');
                            QueryConsole.current?.append(res);
                        } else {
                            commands.executeCommand('queryview.start');
                            QueryView.currentPanel?.update(
                                {
                                    exception: true,
                                    data: err
                                }
                            );
                        }
                    }
                    if (res) {
                        if (QConnManager.consoleMode) {
                            commands.executeCommand('queryconsole.start');
                            QueryConsole.current?.append(res);
                        } else {
                            commands.executeCommand('queryview.start');
                            QueryView.currentPanel?.update(res);
                        }
                    }
                    if (this.qConn) {
                        this.qConn.pending = false;
                        commands.executeCommand('qservers.toggleConnColor', this.qConn.pending);
                    }
                }
            );
        }
    }

    sync(query: string): void {
        this.syncx(QConnManager.queryWrapper, query);
    }

    sync0(query: string): void {
        this.syncx("0", query);
    }

    loadCfg(): void {
        // read the q server configuration file from home dir
        if (fs.existsSync(cfgPath)) {
            this.qCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
            // reserver current conn
            const currentQconnPool = new Map(this.qConnPool);
            this.qConnPool.clear();
            this.qCfg.forEach((qcfg: QCfg) => {
                if (qcfg.label in currentQconnPool) {
                    const qConn = new QConn(qcfg);
                    qConn.setConn(currentQconnPool.get(qcfg.label)?.conn);
                    this.qConnPool.set(qcfg.label, qConn);
                } else {
                    this.qConnPool.set(qcfg['label'], new QConn(qcfg));
                }
            });
        } else {
            if (!fs.existsSync(cfgDir)) {
                fs.mkdirSync(cfgDir);
            }
            fs.writeFileSync(cfgPath, '[]', 'utf8');
        }
    }

    addCfg(qcfg: QCfg): void {
        const label = qcfg.label;
        this.qCfg = this.qCfg.filter(qcfg => qcfg.label !== label);
        this.qCfg.push(qcfg);
        this.qCfg.sort((q1, q2) => q1.label.localeCompare(q2.label));
        this.dumpCfg();
        commands.executeCommand('qservers.refreshEntry');
    }

    removeCfg(label: string): void {
        this.qCfg = this.qCfg.filter(qcfg => qcfg.label !== label);
        this.dumpCfg();
        commands.executeCommand('qservers.refreshEntry');
    }

    dumpCfg(): void {
        fs.writeFileSync(cfgPath, JSON.stringify(this.qCfg, null, 4), 'utf8');
    }

    removeConn(label: string): void {
        const qConn = this.getConn(label);
        qConn?.setConn(undefined);
        if (this.activeConnLabel === label) {
            this.activeConn = undefined;
            commands.executeCommand('qservers.updateStatusBar', undefined);
        }
        window.showWarningMessage(`Lost connection to ${label.toUpperCase()}`);
    }
}

export type QCfg = {
    host: string;
    port: number;
    user: string;
    password: string;
    socketNoDelay: boolean;
    socketTimeout: number;
    label: string;
}
