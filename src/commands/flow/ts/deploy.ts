
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import * as fs from 'fs-extra';

// import { Flow } from '../../../types/flow';
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
  'flags.nospinner.summary',
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
    nospinner: Flags.boolean({ summary: messages.getMessage('flags.nospinner.summary') }),
  };

  public async run(): Promise<FlowTsDeployResult> {
    const { flags } = await this.parse(FlowTsDeploy);
    if (!flags.file) {
      throw messages.createError('error.paramNotFound');
    }

    const targetPath = `${flags.path}.ts`;

    const outdir = flags.outdir ? flags.outdir : '.';
    const data = fs.readFileSync(`${outdir}/${targetPath}`, { encoding: 'utf8', flag: 'r' }).toString();

    const fp = new FlowTsParser(data, flags.path);
    if (!fp.isSupported()) {
      this.spinner.stop('failed.');
      throw messages.createError('error.unsupportedFlow');
    }
    this.spinner.stop();
  }
}
