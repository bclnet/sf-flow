import { expect } from '@oclif/test';
import FlowTsBuilder from '../../src/flow/flowTsBuilder';
import { Flow } from '../../src/types/flow';
import * as fs from 'fs-extra';

describe('flow/flowTsBuilder', () => {
    let flowTsBuilder;
    beforeAll(() => {
        const path = 'Approve_Order_Summary.json';
        const flow = JSON.parse(fs.readFileSync(`../../files.json/${path}`, { encoding: 'utf8', flag: 'r' })) as Flow;
        flowTsBuilder = new FlowTsBuilder(flow, 'test_flow');
    });

    it('supported flow', () => {
        expect(flowTsBuilder.isSupported()).to.be.true;
    });

    it('to typescript', () => {
        const data = flowTsBuilder.toTypescript();
        expect(data).to.equal('');
    });
});
