import * as ts from 'typescript';
import { Flow, Debug, flowBuild } from '../types/flow';

export default class FlowTsBuilder {
    private readonly flow: Flow;

    public constructor(flow: Flow) {
        this.flow = flow;
    }

    public isSupported(): boolean { return this.flow ? true : false; }

    public toTypescript(debug: boolean, targetPath: string): string {
        const node = flowBuild(debug ? new Debug() : undefined, this.flow);
        const result = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
            .printNode(ts.EmitHint.Unspecified, node, ts.createSourceFile(targetPath, '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS));
        return result;
    }
}
