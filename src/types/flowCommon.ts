import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
type RequireOne<T, K extends keyof T = keyof T> = K extends keyof T ? PartialRequire<T, K> : never;
type PartialRequire<O, K extends keyof O> = { [P in K]-?: O[P]; } & O;
import { Element } from './flowElements';

export function objectPurge(s: object): object {
    Object.keys(s).forEach(k => s[k] === undefined && delete s[k])
    return s;
}

export function triviaGetComment(s: ts.Node): string {
    const ranges = ts.getLeadingCommentRanges(s.getFullText(), 0)
    if (!ranges) return undefined;
    const range = ranges[0];
    return s.getFullText().slice(range.pos + 2, range.end).trim();
}

//#region Context

export class Context {
    public stmts: ts.Statement[];
    public counting: boolean;
    private counted: object;
    private readonly remain: object;
    private readonly visted: object;

    public constructor(s: object) {
        this.stmts = [];
        this.counting = false;
        this.remain = s;
        this.visted = {};
    }

    public static targetStatement(s: Connector, useBreak?: boolean): ts.Statement {
        return useBreak ?? true ? sf.createBreakStatement(s.targetReference) : sf.createContinueStatement(s.targetReference);
    }

    public static targetFaultArgument(s: Connector, useBreak?: boolean): ts.Expression {
        return sf.createArrowFunction(undefined, undefined, [], undefined, undefined, sf.createBlock([Context.targetStatement(s, useBreak)], false));
    }

    public moveNext(): Connector {
        this.counted = {};
        const refs = Object.keys(this.remain).sort((l, r) => this.countReference(l) - this.countReference(r));
        if (refs.length === 0) return null;
        return { targetReference: refs[0] } as Connector
    }

    public hasRemain(s: Connector): boolean { return s.targetReference in this.remain; }

    public count(s: Connector): number {
        this.counting = true;
        if (!s) return 0;
        else if (!this.hasRemain(s)) return 1;
        const ref = this.remain[s.targetReference] as Element;
        if (!ref) throw Error(`Unknown targetReference '${s.targetReference}`);
        return 1 + (ref.build(ref, this) as number);
    }

    public build(s: Connector): ts.ClassElement {
        this.counting = false;
        if (!s) return;
        else if (!this.hasRemain(s)) { /*this.stmts.push(Context.targetStatement(s));*/ return; }
        const ref = this.remain[s.targetReference] as Element;
        if (!ref) throw Error(`Unknown targetReference '${s.targetReference}`);
        console.log(ref.name, ref.build);
        this.visted[s.targetReference] = ref;
        delete this.remain[s.targetReference];
        ref.build(ref, this);
        return undefined;
    }

    public buildBlock(s: Connector): ts.Statement {
        if (!s) return;
        else if (!this.hasRemain(s)) { return sf.createBlock([Context.targetStatement(s)], false); }
        const lastStmts = this.stmts;
        this.stmts = [];
        this.build(s);
        const block = sf.createBlock(this.stmts, true);
        this.stmts = lastStmts;
        return block;
    }

    private countReference(s: string): number {
        let count = this.counted[s] as number;
        if (count) return count;
        count = this.count({ targetReference: s } as Connector);
        this.counted[s] = count;
        return count;
    }
}

//#endregion

//#region Connector

export interface Connector {
    isGoTo?: boolean;
    targetReference: string;
    processMetadataValues: ProcessMetadataValue[];
}

//#endregion

//#region Value

export enum DataType {
    Default = undefined,
    Apex = 'Apex',
    SObject = 'SObject',
    Boolean = 'Boolean',
    String = 'String',
    Number = 'Number',
}

export type Value = RequireOne<{
    stringValue?: string;
    numberValue?: number;
    booleanValue?: boolean;
    elementReference?: string;
}>;

export function valueFromTypeNode(s: ts.TypeNode): [boolean, DataType, number, string] {
    const isCollection = s.kind === sk.ArrayType;
    if (isCollection) s = (s as ts.ArrayTypeNode).elementType;
    const typeName = s.getText();
    switch (s.kind) {
        case sk.TypeReference: return typeName.startsWith('apex.')
            ? [isCollection, DataType.Apex, undefined, typeName.substring(5)]
            : [isCollection, DataType.SObject, undefined, typeName];
        case sk.BooleanKeyword: return [isCollection, DataType.Boolean, undefined, typeName];
        case sk.StringKeyword: return [isCollection, DataType.String, undefined, typeName];
        case sk.NumberKeyword: return [isCollection, DataType.Number, 0, typeName];
        default: throw Error(`Unknown dataType ${sk[s.kind]}`);
    }
}

export function valueToTypeNode(isCollection: boolean, dataType: DataType, scale?: number, typeName?: string): ts.TypeNode {
    let typeNode: ts.TypeNode;
    switch (dataType) {
        case DataType.Apex: typeNode = sf.createTypeReferenceNode(`apex.${typeName}`); break;
        case DataType.SObject: typeNode = sf.createTypeReferenceNode(typeName); break;
        case DataType.Boolean: typeNode = sf.createKeywordTypeNode(sk.BooleanKeyword); break;
        case DataType.String: typeNode = sf.createKeywordTypeNode(sk.StringKeyword); break;
        case DataType.Number: typeNode = sf.createKeywordTypeNode(sk.NumberKeyword); break;
        default: throw Error(`valueToTypeNode: Unknown dataType '${dataType}'`);
    }
    return !isCollection ? typeNode : sf.createArrayTypeNode(typeNode);
}

export function valueFromExpression(s: ts.Expression, dataType: DataType): Value {
    switch (dataType) {
        case DataType.Boolean: return { booleanValue: s.kind === sk.TrueKeyword };
        case DataType.String: return { stringValue: (s as ts.StringLiteral).text };
        case DataType.Number: return { numberValue: Number((s as ts.NumericLiteral).text) };
        default: throw Error(`valueFromExpression: Unknown dataType '${dataType}'`);
    }
}

export function valueToExpression(s: Value): ts.Expression {
    if ('booleanValue' in s) return s.booleanValue ? sf.createToken(sk.TrueKeyword) : sf.createToken(sk.FalseKeyword);
    else if ('stringValue' in s) return sf.createStringLiteral(s.stringValue, true);
    else if ('elementReference' in s) return sf.createStringLiteral(`:${s.elementReference}`, true);
    else if ('numberValue' in s) return sf.createNumericLiteral(s.numberValue);
    else throw Error('valueToExpression: Unknown dataType');
}

export function valueToString(s: Value): string {
    if ('booleanValue' in s) return String(s.booleanValue);
    else if ('stringValue' in s) return `'${s.stringValue}'`;
    else if ('elementReference' in s) return `:${s.elementReference}`;
    else if ('numberValue' in s) return String(s.numberValue);
    else throw Error('valueToString: Unknown dataType');
}

//#endregion

//#region ProcessMetadataValue

export interface ProcessMetadataValue {
    name: string;
    value?: Value;
}

export function processMetadataValueParse(flow: Flow, s: ts.Node): void {
}

/* eslint-disable complexity */
export function processMetadataValueBuild(s: ProcessMetadataValue) {
}

// export function hasProcessMetadataValue(arg: any): arg is ProcessMetadataValue {
//     return arg.name !== undefined && (arg.value === undefined || hasValue(arg.value));
// }

//#endregion

//#region Input/Output

export interface InputAssignment {
    field: string;
    value: Value;
}

export function inputAssignmentToString(s: InputAssignment): string {
    return `${s.field} = ${valueToString(s.value)}`;
}

export interface OutputAssignment {
    assignToReference: string;
    field: string;
    name: string;
}

export interface InputParameter {
    name: string;
    value: Value;
}

export interface OutputParameter {
    assignToReference: string;
    name: string;
}

//#endregion

//#region Step

export interface Step {
}

export function stepParse(s: ts.Node): Step {
}

/* eslint-disable complexity */
export function stepBuild(s: Step) {
}

//#endregion

//#region Wait

export interface Wait {
}

export function waitParse(s: ts.Node): Wait {
}

/* eslint-disable complexity */
export function waitBuild(s: Wait) {
}

//#endregion
