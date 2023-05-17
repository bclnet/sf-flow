
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, AuthInfo, Connection } from '@salesforce/core';
import * as fs from 'fs-extra';
import { jsonStringify } from '../../../utils';
import { Flow, flowSort } from '../../../types/flow';
import FlowTsBuilder from '../../../flow/flowTsBuilder';
import FlowTsParser from '../../../flow/flowTsParser';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('sf-flow', 'flow.ts.retrieve', [
    'summary',
    'description',
    'examples',
    'flags.username.summary',
    'flags.path.summary',
    'flags.apiversion.summary',
    'flags.indir.summary',
    'flags.outdir.summary',
    'flags.nospinner.summary',
    'flags.debug.summary',
    'flags.paranoid.summary',
    'flags.force.summary',
    'error.paramNotFound',
    'error.flowNotFound',
    'error.unsupportedFlow',
    'error.paranoidFlow',
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
        indir: Flags.string({ summary: messages.getMessage('flags.indir.summary'), char: 'i', default: './files.json' }),
        outdir: Flags.string({ summary: messages.getMessage('flags.outdir.summary'), char: 'o' }),
        nospinner: Flags.boolean({ summary: messages.getMessage('flags.nospinner.summary') }),
        debug: Flags.boolean({ summary: messages.getMessage('flags.debug.summary'), char: 'd' }),
        paranoid: Flags.boolean({ summary: messages.getMessage('flags.paranoid.summary'), default: true }),
        force: Flags.boolean({ summary: messages.getMessage('flags.force.summary'), default: true }),
    };

    public async run(): Promise<FlowTsRetrieveResult> {
        const { flags } = await this.parse(FlowTsRetrieve);
        if (!flags.path) {
            throw messages.createError('error.paramNotFound');
        }

        if (!flags.nospinner) this.spinner.start('Retrieving the process metadata');

        let flow: Flow;
        if (flags.indir) {
            const sourcePath = `${flags.path}.json`;
            const indir = flags.indir ? flags.indir : '.';
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            flow = JSON.parse(fs.readFileSync(`${indir}/${sourcePath}`, { encoding: 'utf8', flag: 'r' }) as string) as Flow;
        } else {
            const authInfo = await AuthInfo.create({ username: flags.username });
            const conn = await Connection.create({ authInfo });
            conn.setApiVersion(flags.apiversion);
            flow = await conn.metadata.read('Flow', flags.path) as unknown as Flow;
        }

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
        const data = fb.toTypescript(flags.debug, targetPath);

        const outdir = flags.outdir ? flags.outdir : '.';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await fs.ensureDir(outdir);

        // check paranoid
        if (flags.paranoid) {
            flowSort(flow);
            const flowJson = jsonStringify(flow, '  ');

            // rebuild new-flow
            const fp = new FlowTsParser(data, flags.path);
            if (!fp.isSupported()) {
                this.spinner.stop('failed.');
                throw messages.createError('error.unsupportedFlow');
            }
            const newFlow = fp.toFlow(flags.debug);
            flowSort(newFlow);
            const newFlowJson = jsonStringify(newFlow, '  ');

            // compare flow and new-flow
            if (flowJson !== newFlowJson) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                fs.writeFileSync(`${outdir}/${targetPath}.orig`, flowJson);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                fs.writeFileSync(`${outdir}/${targetPath}.fail`, newFlowJson);

                // overide with --force flag
                if (flags.force) {
                    this.log('PARANOIA: ignoring paranoid check.');
                } else {
                    this.spinner.stop('failed.');
                    throw messages.createError('error.paranoidFlow');
                }
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        fs.writeFileSync(`${outdir}/${targetPath}`, data);

        const label: string = flow.label;
        this.log(`'${label}' flow retrieved.`);
    }
}