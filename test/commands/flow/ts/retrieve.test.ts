import { expect, test } from '@oclif/test';
// import { FlowTsRetrieveResult } from '../../../../src/commands/flow/ts/retrieve';

describe('flow:ts:retrieve', () => {
  test
    .stdout()
    .command(['flow:ts:retrieve'])
    .it('runs flow:ts:retrieve', (ctx) => {
      expect(ctx.stdout).to.contain('hello world');
    });

  test
    .stdout()
    .command(['flow:ts:retrieve', '-p', 'Path'])
    .it('runs flow:ts:retrieve -p Path', (ctx) => {
      expect(ctx.stdout).to.contain('hello Astro');
    });
});
