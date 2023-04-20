import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { FlowJsonRetrieveResult } from '../../../../src/commands/flow/json/retrieve';

describe('flow:json:retrieve NUTs', () => {
  let session: TestSession;
  before(async () => { session = await TestSession.create(); });
  after(async () => { await session?.clean(); });

  it('should display provided path', () => {
    const path = 'Path';
    const command = `flow:json:retrieve -p ${path}`;
    const output = execCmd<FlowJsonRetrieveResult>(command, { ensureExitCode: 0 }).shellOutput.stdout;
    expect(output).to.contain(path);
  });
});
