
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import * as fs from 'fs-extra';
import { jsonStringify } from '../../../utils';
import { flowSort } from '../../../types/flow';
import FlowTsParser from '../../../flow/flowTsParser';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('sf-flow', 'flow.ts.deploy', [
    'summary',
    'description',
    'examples',
    'flags.username.summary',
    'flags.path.summary',
    'flags.apiversion.summary',
    'flags.outdir.summary',
    'flags.jsondir.summary',
    'flags.nospinner.summary',
    'flags.debug.summary',
    'error.paramNotFound',
    'error.flowNotFound',
    'error.unsupportedFlow',
]);

export type FlowTsDeployResult = void;

export default class FlowTsDeploy extends SfCommand<FlowTsDeployResult> {
    public static readonly summary = messages.getMessage('summary');
    public static readonly description = messages.getMessage('description');
    public static readonly examples = messages.getMessages('examples');

    public static readonly flags = {
        username: Flags.string({ summary: messages.getMessage('flags.username.summary'), char: 'u' }),
        path: Flags.string({ summary: messages.getMessage('flags.path.summary'), char: 'p' }),
        apiversion: Flags.string({ summary: messages.getMessage('flags.apiversion.summary'), default: '56.0' }),
        outdir: Flags.string({ summary: messages.getMessage('flags.outdir.summary'), char: 'o' }),
        jsondir: Flags.string({ summary: messages.getMessage('flags.jsondir.summary'), char: 'j', default: 'files.json2' }),
        nospinner: Flags.boolean({ summary: messages.getMessage('flags.nospinner.summary') }),
        debug: Flags.boolean({ summary: messages.getMessage('flags.debug.summary'), char: 'd' }),
    };

    public async run(): Promise<FlowTsDeployResult> {
        const { flags } = await this.parse(FlowTsDeploy);
        if (!flags.path) {
            throw messages.createError('error.paramNotFound');
        }

        const targetPath = `${flags.path}.ts`;
        const outdir = flags.outdir ? flags.outdir : '.';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const data = fs.readFileSync(`${outdir}/${targetPath}`, { encoding: 'utf8', flag: 'r' }) as string;

        const fp = new FlowTsParser(data, flags.path);
        if (!fp.isSupported()) {
            this.spinner.stop('failed.');
            throw messages.createError('error.unsupportedFlow');
        }
        this.spinner.stop();
        const flow = fp.toFlow(flags.debug);
        flowSort(flow);

        if (flags.jsondir) {
            const jsonPath = `${flags.path}.json`;
            const jsondir = flags.jsondir ? flags.jsondir : '.';
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await fs.ensureDir(jsondir);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            fs.writeFileSync(`${jsondir}/${jsonPath}`, jsonStringify(flow, '  '));
        }
    }
}
