import { expect } from '@oclif/test';
import * as fs from 'fs-extra';
import FlowParser from '../../src/flow/flowTsParser';

describe('flow/flowTsParser', () => {
    const path = 'Approve_Order_Summary.ts';
    let flowTsParser: FlowParser;

    before(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const data = fs.readFileSync(`../../files.ts/${path}`, { encoding: 'utf8', flag: 'r' }) as string;
        flowTsParser = new FlowParser(data, 'test_flow');
    });

    it('supported flow', () => {
        expect(flowTsParser.isSupported()).to.be.true;
    });

    it('to flow', () => {
        const flow = flowTsParser.toFlow(undefined);
        expect(flow.fullName).to.equal('');
    });
});
