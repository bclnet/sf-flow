import * as ts from 'typescript';
import { Flow, flowCreate, flowParse } from '../types/flow';

export default class FlowTsBuilder {
    private readonly data: string;
    private readonly dataPath: string;

    public constructor(data: string, dataPath: string) {
        this.data = data;
        this.dataPath = dataPath;
    }

    public isSupported(): boolean { return this.data ? true : false; }

    public toFlow(): Flow {
        const sourceFile = ts.createSourceFile(this.dataPath, this.data, ts.ScriptTarget.ES2015, /*setParentNodes */true);
        //this.printRecursiveFrom(sourceFile, 0, sourceFile);
        const flow = flowCreate();
        flowParse(flow, sourceFile);
        return flow;
    }

    private printRecursiveFrom(node: ts.Node, indentLevel: number, sourceFile: ts.SourceFile): void {
        const indentation = '    '.repeat(indentLevel);
        const syntaxKind = ts.SyntaxKind[node.kind];
        const nodeText = node.getText(sourceFile);
        console.log(`${indentation}${syntaxKind}: ${nodeText}`);
        node.forEachChild(child =>
            this.printRecursiveFrom(child, indentLevel + 1, sourceFile)
        );
    }
}
