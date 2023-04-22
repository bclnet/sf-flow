import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
type RequireOne<T, K extends keyof T = keyof T> = K extends keyof T ? PartialRequire<T, K> : never;
type PartialRequire<O, K extends keyof O> = { [P in K]-?: O[P]; } & O;

export function triviaSetComment(s: ts.Node, e: object, k: string): void {
    const ranges = ts.getLeadingCommentRanges(s.getFullText(), 0)
    if (!ranges) return;
    const range = ranges[0];
    e[k] = s.getFullText().slice(range.pos + 2, range.end).trim();
}

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
    numberValue?: string;
    booleanValue?: string;
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
        case sk.StringKeyword: return [isCollection, DataType.Number, undefined, typeName];
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
        default: throw Error(`Unknown dataType ${dataType}`);
    }
    return !isCollection ? typeNode : sf.createArrayTypeNode(typeNode);
}

export function valueToExpression(s: Value, dataType: DataType): ts.Expression {
    switch (dataType) {
        case DataType.Boolean: return s.booleanValue ? sf.createToken(sk.TrueKeyword) : sf.createToken(sk.FalseKeyword);
        case DataType.String: return sf.createStringLiteral(s.stringValue, true);
        case DataType.Number: return sf.createNumericLiteral(s.numberValue);
        default: throw Error(`Unknown dataType ${dataType}`);
    }
}

// function hasValue(arg: any): arg is Value {
//     return (
//         arg.stringValue !== undefined ||
//         arg.numberValue !== undefined ||
//         arg.booleanValue !== undefined ||
//         arg.elementReference !== undefined
//     );
// }

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
    name: string;
    field: string;
    value: Value;
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
