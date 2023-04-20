import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, AuthInfo, Connection } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('sf-flow', 'flow.json.display', [
    'summary',
    'description',
    'examples',
    'flags.username.summary',
    'flags.path.summary',
    'flags.apiversion.summary',
    'flags.nospinner.summary',
    'error.paramNotFound',
    'error.flowNotFound',
]);

export type FlowJsonDisplayResult = object;

export default class FlowJsonDisplay extends SfCommand<FlowJsonDisplayResult> {
    public static readonly summary = messages.getMessage('summary');
    public static readonly description = messages.getMessage('description');
    public static readonly examples = messages.getMessages('examples');

    public static flags = {
        username: Flags.string({ summary: messages.getMessage('flags.username.summary'), char: 'u' }),
        path: Flags.string({ summary: messages.getMessage('flags.path.summary'), char: 'p', required: true }),
        apiversion: Flags.string({ summary: messages.getMessage('flags.apiversion.summary'), default: '56.0' }),
        nospinner: Flags.boolean({ summary: messages.getMessage('flags.nospinner.summary') }),
    };

    public async run(): Promise<FlowJsonDisplayResult> {
        const { flags } = await this.parse(FlowJsonDisplay);
        if (!flags.path) {
            throw messages.createError('error.paramNotFound');
        }

        if (!flags.nospinner) this.spinner.start('Retrieving the process metadata');
        const authInfo = await AuthInfo.create({ username: flags.username });
        const conn = await Connection.create({ authInfo });
        conn.setApiVersion(flags.apiversion);
        const flow = await conn.metadata.read('Flow', flags.path);

        if (!flow.fullName) {
            this.spinner.stop('failed.');
            throw messages.createError('error.flowNotFound');
        }
        this.spinner.stop();
        this.log(JSON.stringify(flow, null, '  '));

        return flow;
    }
}
