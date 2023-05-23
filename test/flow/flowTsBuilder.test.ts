import { expect } from '@oclif/test';
import * as fs from 'fs-extra';
import FlowTsBuilder from '../../src/flow/flowTsBuilder';
import { Flow } from '../../src/types/flow';

describe('flow/flowTsBuilder', () => {
    const path = 'Approve_Order_Summary.json';
    let flowTsBuilder: FlowTsBuilder;

    before(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const flow = JSON.parse(
            fs.readFileSync(`../../files.json/${path}`, { encoding: 'utf8', flag: 'r' }) as string
        ) as Flow;
        flowTsBuilder = new FlowTsBuilder(flow);
    });

    it('supported flow', () => {
        expect(flowTsBuilder.isSupported()).to.be.true;
    });

    it('to typescript', () => {
        const targetPath = `${path}.ts`;
        const data = flowTsBuilder.toTypescript(undefined, targetPath);
        expect(data).to.equal('');
    });
});
