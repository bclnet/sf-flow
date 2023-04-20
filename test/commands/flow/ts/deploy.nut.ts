import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { FlowTsDeployResult } from '../../../../src/commands/flow/ts/deploy';

describe('flow:ts:deploy NUTs', () => {
  let session: TestSession;
  before(async () => { session = await TestSession.create(); });
  after(async () => { await session?.clean(); });

  it('should display provided path', () => {
    const path = 'Path';
    const command = `flow:ts:deploy -p ${path}`;
    const output = execCmd<FlowTsDeployResult>(command, { ensureExitCode: 0 }).shellOutput.stdout;
    expect(output).to.contain(path);
  });
});
