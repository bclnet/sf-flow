
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, AuthInfo, Connection } from '@salesforce/core';
import * as fs from 'fs-extra';

import { Flow } from '../../../types/flow';
import FlowTsBuilder from '../../../flow/flowTsBuilder';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('sf-flow', 'flow.ts.retrieve', [
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
    'error.unsupportedFlow',
]);

export type FlowTsRetrieveResult = void;

export default class FlowTsRetrieve extends SfCommand<FlowTsRetrieveResult> {
    public static readonly summary = messages.getMessage('summary');
    public static readonly description = messages.getMessage('description');
    public static readonly examples = messages.getMessages('examples');

    public static readonly flags = {
        username: Flags.string({ summary: messages.getMessage('flags.username.summary'), char: 'u' }),
        path: Flags.string({ summary: messages.getMessage('flags.path.summary'), char: 'p' }),
        apiversion: Flags.string({ summary: messages.getMessage('flags.apiversion.summary'), default: '56.0' }),
        outdir: Flags.string({ summary: messages.getMessage('flags.outdir.summary'), char: 'o' }),
        nospinner: Flags.boolean({ summary: messages.getMessage('flags.nospinner.summary') }),
    };

    public async run(): Promise<FlowTsRetrieveResult> {
        const { flags } = await this.parse(FlowTsRetrieve);
        if (!flags.path) {
            throw messages.createError('error.paramNotFound');
        }

        if (!flags.nospinner) this.spinner.start('Retrieving the process metadata');

        // const authInfo = await AuthInfo.create({ username: flags.username });
        // const conn = await Connection.create({ authInfo });
        // conn.setApiVersion(flags.apiversion);
        // const flow = await conn.metadata.read('Flow', flags.path);
        const flow = JSON.parse(fs.readFileSync(`./files.json/${flags.path}.json`, { encoding: 'utf8', flag: 'r' })) as Flow;

        if (!flow.fullName) {
            this.spinner.stop('failed.');
            throw messages.createError('error.flowNotFound');
        }
        const fb = new FlowTsBuilder((flow as unknown) as Flow);
        if (!fb.isSupported()) {
            this.spinner.stop('failed.');
            throw messages.createError('error.unsupportedFlow');
        }
        this.spinner.stop();

        const targetPath = `${flags.path}.ts`;
        const data = fb.toTypescript(targetPath);
        this.log(data);

        const outdir = flags.outdir ? flags.outdir : '.';
        await fs.ensureDir(outdir);
        fs.writeFileSync(`${outdir}/${targetPath}`, data);

        const label: string = flow.label;
        this.log(`'${label}' flow retrieved.`);
    }
}

//cls & bin\dev flow:ts:retrieve -u sky.morey@merklecxm.com1.dev01 -p Approve_Order_Summary -o files.ts