import * as ts from 'typescript';
import { Flow, flowParseFlow } from '../types/flow';

export default class FlowTsBuilder {
    private readonly data: string;
    private readonly dataPath: string;

    public constructor(data: string, dataPath: string) {
        this.data = data;
        this.dataPath = dataPath;
    }

    public isSupported() { return true; }

    public toFlow(): Flow {
        const sourceFile = ts.createSourceFile(this.dataPath, this.data, ts.ScriptTarget.ES2015, /*setParentNodes */true);
        const flow = flowParseFlow(sourceFile);
        return flow;
    }
}
