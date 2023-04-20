import { expect, test } from '@oclif/test';

describe('flow:json:display', () => {
  test
    .stdout()
    .command(['flow:json:display'])
    .it('runs flow:json:display with no provided file', (ctx) => {
      expect(ctx.stdout).to.contain('hello world');
    });

  test
    .stdout()
    .command(['flow:json:display', '-p', 'Path'])
    .it('runs flow:json:display -p Path', (ctx) => {
      expect(ctx.stdout).to.contain('hello Astro');
    });
});
