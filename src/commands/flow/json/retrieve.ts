import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, AuthInfo, Connection } from '@salesforce/core';
import * as fs from 'fs-extra';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('sf-flow', 'flow.json.retrieve', [
    'summary',
    'description',
    'examples',
    'flags.username.summary',
    'flags.path.summary',
    'flags.apiversion.summary',
    'flags.outdir.summary',
    'flags.nospinner.summary',
    'error.paramNotFound',
    'error.flowNotFound',
]);

export type FlowJsonRetrieveResult = void;

export default class FlowJsonRetrieve extends SfCommand<FlowJsonRetrieveResult> {
    public static readonly summary = messages.getMessage('summary');
    public static readonly description = messages.getMessage('description');
    public static readonly examples = messages.getMessages('examples');

    public static flags = {
        username: Flags.string({ summary: messages.getMessage('flags.username.summary'), char: 'u' }),
        path: Flags.string({ summary: messages.getMessage('flags.path.summary'), char: 'p' }),
        apiversion: Flags.string({ summary: messages.getMessage('flags.apiversion.summary'), default: '56.0' }),
        outdir: Flags.string({ summary: messages.getMessage('flags.outdir.summary'), char: 'o' }),
        nospinner: Flags.boolean({ summary: messages.getMessage('flags.nospinner.summary') }),
    };

    public async run(): Promise<FlowJsonRetrieveResult> {
        const { flags } = await this.parse(FlowJsonRetrieve);
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

        const targetPath = `${flags.path}.json`;
        const outdir = flags.outdir ? flags.outdir : '.';
        await fs.ensureDir(outdir);
        fs.writeFileSync(`${outdir}/${targetPath}`, JSON.stringify(flow, null, '  '));

        const label: string = flow.label;
        this.log(`'${label}' flow retrieved.`);
    }
}
