/* eslint-disable quotes */
import { window, commands } from "vscode";
import * as q from "node-q";
import { homedir } from "os";
import * as fs from "fs";
import { QConn } from "./q-conn";
import { QueryView } from "./query-view";
import { QueryConsole } from "./query-console";
import { ConnStatus, ModeStatus } from './status-bar';
import { KdbExplorerProvider } from './explorer';
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
    static explorerProvider: KdbExplorerProvider = new KdbExplorerProvider(null);
    globals: any;
    functions: string[] = [];
    variables: string[] = [];
    tables: string[] = [];
    keywords: string[] = [];

    public static connStatus: ConnStatus = new ConnStatus();
    public static modeStatus: ModeStatus = new ModeStatus();
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
        QConnManager.modeStatus.update(QConnManager.consoleMode);
        QConnManager.updateQueryWrapper();
    }

    public static updateQueryWrapper(): void {
        if (QConnManager.consoleMode) {
            QConnManager.queryWrapper = '{{.Q.trp[x;y;{x,"\n",.Q.sbt@(-4)_y}]}[{.Q.S[system"c";0j;.d0.z.res:0 x]};x]}';
        } else {
            QConnManager.queryWrapper = '@[{r:.d0.z.res:value x;r:$[99h<>t:type r;r;98h=type key r;0!r;enlist r];`exception`type`data`cols!(0b;t;r;$[t in 98 99h;cols r;()])};;{`exception`data!(1b;x)}]';
        }
    }

    updateGlobals(result: any): void {
        this.globals = result;

        let entries: [string, any][] = Object.entries(this.globals);

        this.functions = [];
        this.tables = [];
        this.variables = [];

        entries.forEach(([key, value]) => {
            // Append dot to key, replace null with empty string.
            key = key === "null" ? "." : (key + ".");

            let f = value[key + "Functions"];
            let t = value[key + "Tables"];
            let v = value[key + "Variables"];

            // Stuff in global and .q namespace should be simplified to "".
            key = (key === "." || key === ".q.") ? "" : key;

            if (f instanceof Array) {
                f.forEach((obj: any) => this.functions.push(`${key}${obj}`));
            }

            if (t instanceof Array) {
                t.forEach((obj: any) => this.tables.push(`${key}${obj}`));
            }

            if (v instanceof Array) {
                v = v.filter((x: any) => !t.includes(x));
                v.forEach((obj: any) => this.variables.push(`${key}${obj}`));
            }
        });
        QConnManager.explorerProvider.refresh(result);
    }

    getConn(label: string): QConn | undefined {
        return this.qConnPool.get(label);
    }

    reconnect(): void {
        if (this.activeConnLabel) {
            this.connect(true, this.activeConnLabel);
        } else {
            this.switch();
        }
    }

    connect(reset: boolean, label: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.qConn = this.getConn(label);
                if (this.qConn) {
                    const conn = this.qConn.conn;
                    if (!reset && conn) {
                        this.activeConn = conn;
                        this.activeConnLabel = label;
                        QConnManager.connStatus.update(this.qConn);
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
                                    reset ? this.qConn?.resetConn(conn) : this.qConn?.setConn(conn);
                                    this.activeConn = conn;
                                    this.activeConnLabel = label;
                                    QConnManager.connStatus.update(this.qConn);

                                    let globalQuery = "{[q] t:system\"T\";tm:@[{$[x>0;[system\"T \",string x;1b];0b]};0;{0b}];r:$[tm;@[0;(q;::);{[tm; t; msgs] if[tm;system\"T \",string t];'msgs}[tm;t]];@[q;::;{'x}]];if[tm;system\"T \",string t];r}{do[1000;2+2];{@[{.z.ide.ns.r1:x;:.z.ide.ns.r1};x;{r:y;:r}[;x]]}({:x!{![sv[`;] each x cross `Tables`Functions`Variables; system each \"afv\" cross enlist[\" \"] cross enlist string x]} each x} [{raze x,.z.s'[{x where{@[{1#get x};x;`]~1#.q}'[x]}` sv'x,'key x]}`]),(enlist `.z)!flip (`.z.Tables`.z.Functions`.z.Variables)!(enlist 0#`;enlist `ac`bm`exit`pc`pd`pg`ph`pi`pm`po`pp`ps`pw`vs`ts`s`wc`wo`ws;enlist `a`b`e`f`h`i`k`K`l`o`q`u`w`W`x`X`n`N`p`P`z`Z`t`T`d`D`c`zd)}";
                                    conn.k(globalQuery, (err, result) => {
                                        if (err) {
                                            window.showErrorMessage(`Failed to retrieve kdb+ global variables: '${err.message}`);
                                            return;
                                        }
                                        this.updateGlobals(result);
                                    });
                                    // Update reserved keywords upon successful connection.
                                    let reservedQuery = ".Q.res union key .q";
                                    conn.k(reservedQuery, (err, result) => {
                                        if (err) {
                                            window.showErrorMessage(`Failed to retrieve kdb+ reserved keywords: '${err.message}`);
                                            return;
                                        }
                                        this.keywords = result;
                                    });
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
        this.activeConnLabel ? await this.connect(false, this.activeConnLabel) : window.showErrorMessage('No Active q Connection');
    }

    async syncx(queryWrapper: string, query: string) {
        if (!this.activeConn || !this.qConn) {
            this.activeConnLabel ? await this.connect(false, this.activeConnLabel) : await this.switch();
        }
        if (this.activeConn && this.qConn) {
            if (this.qConn.pending) {
                window.showErrorMessage(this.qConn.label + ' is still running ...');
                return;
            }
            this.qConn.pending = true;
            QConnManager.connStatus.update(this.qConn);
            this.activeConn.k(queryWrapper, query[0] == '`' ? ' ' + query : query,
                (err: Error, res) => {
                    if (err) {
                        if (QConnManager.consoleMode) {
                            commands.executeCommand('queryconsole.start').then(
                                () => QueryConsole.current?.append(err.message)
                            )
                        } else {
                            commands.executeCommand('queryview.start').then(
                                () => QueryView.currentPanel?.update(
                                    {
                                        exception: true,
                                        data: err
                                    }
                                )
                            )
                        }
                    }
                    if (res) {
                        if (QConnManager.consoleMode) {
                            commands.executeCommand('queryconsole.start').then(
                                () => QueryConsole.current?.append(res)
                            )
                        } else {
                            commands.executeCommand('queryview.start').then(
                                () => QueryView.currentPanel?.update(res)
                            )
                        }
                    }
                    if (this.qConn) {
                        this.qConn.pending = false;
                        QConnManager.connStatus.update(this.qConn);
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
            QConnManager.connStatus.update(undefined);
        }
        window.showWarningMessage(`Lost connection to ${label.toUpperCase()}`);
    }

    public dispose(): void {
        QConnManager.connStatus.dispose();
        QConnManager.modeStatus.dispose();
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
