import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { FlowTsRetrieveResult } from '../../../../src/commands/flow/ts/retrieve';

describe('flow:ts:deploy NUTs', () => {
  let session: TestSession;
  before(async () => { session = await TestSession.create(); });
  after(async () => { await session?.clean(); });

  it('should display provided path', () => {
    const path = 'Path';
    const command = `flow:ts:retrieve -p ${path}`;
    const output = execCmd<FlowTsRetrieveResult>(command, { ensureExitCode: 0 }).shellOutput.stdout;
    expect(output).to.contain(path);
  });
});
