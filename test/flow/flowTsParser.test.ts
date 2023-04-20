import { expect } from '@oclif/test';
import FlowParser from '../../src/flow/flowTsParser';
import * as fs from 'fs-extra';

describe('flow/flowTsParser', () => {
    let flowTsParser;

    beforeAll(() => {
        const path = 'Approve_Order_Summary.ts';
        const data = fs.readFileSync(`../../files.ts/${path}`, { encoding: 'utf8', flag: 'r' }) as string;
        flowTsParser = new FlowParser(data, 'test_flow');
    });

    it('supported flow', () => {
        expect(flowTsParser.isSupported()).to.be.true;
    });

    it('to flow', () => {
        const flow = flowTsParser.toFlow();
        expect(flow.name).to.equal('');
    });
});
