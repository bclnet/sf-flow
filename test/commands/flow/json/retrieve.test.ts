import { expect, test } from '@oclif/test';

describe('flow:json:retrieve', () => {
  test
    .stdout()
    .command(['flow:json:retrieve'])
    .it('runs flow:json:retrieve with no provided file', (ctx) => {
      expect(ctx.stdout).to.contain('hello world');
    });

  test
    .stdout()
    .command(['flow:json:retrieve', '-p', 'Path'])
    .it('runs flow:json:retrieve -p Path', (ctx) => {
      expect(ctx.stdout).to.contain('hello Astro');
    });
});
