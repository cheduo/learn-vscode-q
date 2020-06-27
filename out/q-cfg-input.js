"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qCfgInput = void 0;
const vscode_1 = require("vscode");
const q_conn_manager_1 = require("./q-conn-manager");
async function qCfgInput(qcfg, requireUnique = true) {
    async function collectInputs() {
        const state = qcfg ? qcfg :
            {
                host: '',
                port: 0,
                user: '',
                password: '',
                socketNoDelay: false, socketTimeout: 0,
                label: ''
            };
        await QCfgInput.run(input => inputHost(input, state));
        return state;
    }
    const title = 'Create q Server';
    async function inputHost(input, state) {
        state.host = await input.showInputBox({
            title,
            step: 1,
            totalSteps: 7,
            value: state.host,
            prompt: 'Input q server hostname',
            validate: validateNothing,
            shouldResume: shouldResume
        });
        return (input) => inputPort(input, state);
    }
    async function inputPort(input, state) {
        const value = await input.showInputBox({
            title,
            step: 2,
            totalSteps: 7,
            value: state.port.toString(),
            prompt: 'Input q server port',
            validate: validateNumber,
            shouldResume: shouldResume
        });
        state.port = Number(value);
        return (input) => inputUser(input, state);
    }
    async function inputUser(input, state) {
        state.user = await input.showInputBox({
            title,
            step: 3,
            totalSteps: 7,
            value: state.user,
            prompt: `Input user for ${state.host}:${state.port}`,
            validate: validateNothing,
            shouldResume: shouldResume
        });
        return (input) => inputPassword(input, state);
    }
    async function inputPassword(input, state) {
        state.password = await input.showInputBox({
            title,
            step: 4,
            totalSteps: 7,
            value: state.password,
            prompt: `Input password for ${state.host}:${state.port}:${state.user}`,
            password: true,
            validate: validateNothing,
            shouldResume: shouldResume
        });
        return (input) => inputSocketNoDelay(input, state);
    }
    async function inputSocketNoDelay(input, state) {
        const value = await input.showInputBox({
            title,
            step: 5,
            totalSteps: 7,
            value: `${state.socketNoDelay}`,
            prompt: 'Set Socket No Delay (true|false)',
            validate: validateBoolean,
            shouldResume: shouldResume
        });
        state.socketNoDelay = value === 'true' ? true : false;
        return (input) => inputSocketTimeout(input, state);
    }
    async function inputSocketTimeout(input, state) {
        const value = await input.showInputBox({
            title,
            step: 6,
            totalSteps: 7,
            value: state.socketTimeout.toString(),
            prompt: 'Input query timeout(ms)',
            validate: validateNumber,
            shouldResume: shouldResume
        });
        state.socketTimeout = Number(value);
        return (input) => inputLabel(input, state);
    }
    async function inputLabel(input, state) {
        state.label = await input.showInputBox({
            title,
            step: 7,
            totalSteps: 7,
            value: state.label,
            prompt: `Input label for ${state.host}:${state.port}`,
            validate: validateUnique,
            shouldResume: shouldResume
        });
    }
    function shouldResume() {
        // Could show a notification with the option to resume.
        return new Promise(() => {
            // noop
        });
    }
    async function validateNumber(num) {
        return num !== '' && isNaN(Number(num)) ? 'Require Number' : undefined;
    }
    async function validateBoolean(bool) {
        return bool !== 'true' && bool !== 'false' ? 'Require true/false' : undefined;
    }
    async function validateNothing() {
        return undefined;
    }
    async function validateUnique(label) {
        var _a;
        if (requireUnique) {
            return ((_a = q_conn_manager_1.QConnManager.current) === null || _a === void 0 ? void 0 : _a.qConnPool.has(label)) ? 'Label exists' : undefined;
        }
        else {
            return undefined;
        }
    }
    const state = await collectInputs();
    // window.showInformationMessage(`Creating q Server '${state.label}'`);
    return state;
}
exports.qCfgInput = qCfgInput;
class InputFlowAction {
}
InputFlowAction.back = new InputFlowAction();
InputFlowAction.cancel = new InputFlowAction();
InputFlowAction.resume = new InputFlowAction();
class QCfgInput {
    constructor() {
        this.steps = [];
    }
    static async run(start) {
        const input = new QCfgInput();
        return input.stepThrough(start);
    }
    async stepThrough(start) {
        let step = start;
        while (step) {
            this.steps.push(step);
            if (this.current) {
                this.current.enabled = false;
                this.current.busy = true;
            }
            try {
                step = await step(this);
            }
            catch (err) {
                if (err === InputFlowAction.back) {
                    this.steps.pop();
                    step = this.steps.pop();
                }
                else if (err === InputFlowAction.resume) {
                    step = this.steps.pop();
                }
                else if (err === InputFlowAction.cancel) {
                    step = undefined;
                }
                else {
                    throw err;
                }
            }
        }
        if (this.current) {
            this.current.dispose();
        }
    }
    async showInputBox({ title, step, totalSteps, value, prompt, password, validate, buttons, shouldResume }) {
        const disposables = [];
        try {
            return await new Promise((resolve, reject) => {
                const input = vscode_1.window.createInputBox();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.value = value || '';
                input.prompt = prompt;
                input.password = password ? password : false;
                input.buttons = [
                    ...(this.steps.length > 1 ? [vscode_1.QuickInputButtons.Back] : []),
                    ...(buttons || [])
                ];
                let validating = validate('');
                disposables.push(input.onDidTriggerButton(item => {
                    if (item === vscode_1.QuickInputButtons.Back) {
                        reject(InputFlowAction.back);
                    }
                    else {
                        resolve(item);
                    }
                }), input.onDidAccept(async () => {
                    const value = input.value;
                    input.enabled = false;
                    input.busy = true;
                    if (!(await validate(value))) {
                        resolve(value);
                    }
                    input.enabled = true;
                    input.busy = false;
                }), input.onDidChangeValue(async (text) => {
                    const current = validate(text);
                    validating = current;
                    const validationMessage = await current;
                    if (current === validating) {
                        input.validationMessage = validationMessage;
                    }
                }), input.onDidHide(() => {
                    (async () => {
                        reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
                    })()
                        .catch(reject);
                }));
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        }
        finally {
            disposables.forEach(d => d.dispose());
        }
    }
}
//# sourceMappingURL=q-cfg-input.js.map