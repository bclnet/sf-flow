import * as ts from 'typescript';
import { Flow, flowBuild } from '../types/flow';

export default class FlowTsBuilder {
    private readonly flow: Flow;

    public constructor(flow: Flow) {
        this.flow = flow;
    }

    public isSupported(): boolean { return this.flow ? true : false; }

    public toTypescript(targetPath: string): string {
        const node = flowBuild(this.flow);
        const sourceFile = ts.createSourceFile(targetPath, '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        const result = printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);
        return result;
    }
}

//:cls & bin\dev flow:ts:retrieve -u sky.morey@merklecxm.com1.dev01 -p Approve_Order_Summary -o files.ts