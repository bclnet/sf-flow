import { expect, test } from '@oclif/test';
// import { FlowTsDeployResult } from '../../../../src/commands/flow/ts/deploy';

describe('flow:ts:deploy', () => {
  test
    .stdout()
    .command(['flow:ts:deploy'])
    .it('runs flow:ts:deploy', (ctx) => {
      expect(ctx.stdout).to.contain('hello world');
    });

  test
    .stdout()
    .command(['flow:ts:deploy', '-p', 'Path'])
    .it('runs flow:ts:deploy -p Path', (ctx) => {
      expect(ctx.stdout).to.contain('hello Astro');
    });
});
