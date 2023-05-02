import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
type RequireOne<T, K extends keyof T = keyof T> = K extends keyof T ? PartialRequire<T, K> : never;
type PartialRequire<O, K extends keyof O> = { [P in K]-?: O[P]; } & O;
import { Element } from './flowElements';

export function createStringLiteralX(s: string): ts.StringLiteral {
    return sf.createStringLiteral(s, !s.includes('\''));
}

//#region Comments

export function getLeadingComments(s: ts.Node): string[] {
    const ranges = ts.getLeadingCommentRanges(s.getFullText(), 0)
    return ranges
        ? ranges.map(r => s.getFullText().slice(r.pos + 2, r.end).trim())
        : undefined;
}

export function getTrailingComments(s: ts.Node): string[] {
    const ranges = ts.getTrailingCommentRanges(s.getFullText(), 0)
    return ranges
        ? ranges.map(r => s.getFullText().slice(r.pos + 2, r.end).trim())
        : undefined;
}

export function parseLocation(s: string): [string, number, number] {
    if (!s) return [undefined, undefined, undefined];
    const values = s.split(',');
    if (values.length === 1) return [values[0], undefined, undefined];
    else if (values.length === 2) return [undefined, Number(values[0]), Number(values[1])];
    else if (values.length === 3) return [values[0], Number(values[1]), Number(values[2])];
    else throw Error(`Parse location error ${s}`);
}

export function buildLocation(name: string, locationX: number, locationY: number): string {
    return name && !locationX && !locationY ? `${name}`
        : !name && locationX && locationY ? `${locationX}, ${locationY}`
            : name && locationX && locationY ? `${name}, ${locationX}, ${locationY}`
                : 'ERROR'
}

export function parseLeadingComment(s: ts.Node): [string, string, string, ProcessMetadataValue[]] {
    const c = getLeadingComments(s);
    if (!c || c.length < 1 || c.length > 2) return [undefined, undefined, undefined, undefined];
    const description = c.length > 1 ? c[0] : undefined;
    const values = c[c.length - 1].replace(']', '').split('[', 2);
    return [values[0], values.length > 1 ? values[1] : undefined, description, undefined];
}

export function buildLeadingComment(s: ts.Statement, label: string, location: string, description: string, processMetadataValues: ProcessMetadataValue[]): void {
    if (description) ts.addSyntheticLeadingComment(s, sk.SingleLineCommentTrivia, ` ${description}`, true);
    ts.addSyntheticLeadingComment(s, sk.SingleLineCommentTrivia, ` ${label}${location ? ` [${location}]` : ''}`, true);
    if (processMetadataValues) processMetadataValues.forEach(v => {
        ts.addSyntheticLeadingComment(s, sk.SingleLineCommentTrivia, ` meta: ${v.name}${v.value ? ` = ${valueToString(v.value)}` : ''}`, true);
    });
}

//#endregion

//#region Query

export function genericFromQuery(s: string, queryName: string, actionName: string): [string, string, string, string, string] {
    const endx = s.length;
    let queryx = s.indexOf(`${queryName} `); if (queryx === -1) throw Error(`missing ${queryName}`); queryx += queryName.length + 1;
    let actionx = s.indexOf(`${actionName} `, queryx); if (actionx === -1) actionx = queryx; else actionx += 7;
    let fromx = s.indexOf('FROM ', actionx); if (fromx === -1) fromx = actionx; else fromx += 5;
    let wherex = s.indexOf('WHERE ', fromx); if (wherex === -1) wherex = fromx; else wherex += 6;
    let limitx = s.indexOf('LIMIT ', wherex); if (limitx === -1) limitx = endx; else limitx += 6;
    const query = s.substring(queryx, queryx === actionx ? fromx - 6 : actionx - 8);
    const action = queryx === actionx ? null : s.substring(actionx, fromx - 6);
    const from = fromx === actionx ? null : s.substring(fromx, wherex === fromx ? limitx - 7 : wherex - 7);
    const where = wherex === fromx ? null : s.substring(wherex, limitx === endx ? endx : limitx - 7);
    const limit = limitx === endx ? null : s.substring(limitx, endx);
    // console.log(s);
    // console.log(`query:[${query}]`);
    // console.log(`action:[${action}]`);
    // console.log(`from:[${from}]`);
    // console.log(`where:[${where}]`);
    // console.log(`limit:[${limit}]`);
    return [query, action, from, where, limit];
}

export function genericToQuery(queryName: string, actionName: string, query: string, action: string, from: string, where: string, limit: string): string {
    const b = [];
    b.push(`${queryName} ${query}`);
    if (action) b.push(` ${actionName} ${action}`);
    if (from) b.push(` FROM ${from}`);
    if (where) b.push(` WHERE ${where}`);
    if (limit) b.push(` LIMIT ${limit}`);
    return b.join('');
}

//#endregion

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

    public static parseTargetStatement(s: ts.Statement, useBreak?: boolean): Connector {
        return undefined; // useBreak ?? true ? sf.createBreakStatement(s.targetReference) : sf.createContinueStatement(s.targetReference);
    }

    public static buildTargetStatement(s: Connector, useBreak?: boolean): ts.Statement {
        return useBreak ?? true ? sf.createBreakStatement(s.targetReference) : sf.createContinueStatement(s.targetReference);
    }

    public static parseTargetFaultArgument(s: ts.Statement, useBreak?: boolean): Connector {
        return undefined; // sf.createArrowFunction(undefined, undefined, [], undefined, undefined, sf.createBlock([Context.buildTargetStatement(s, useBreak)], false));
    }

    public static buildTargetFaultArgument(s: Connector, useBreak?: boolean): ts.Expression {
        return sf.createArrowFunction(undefined, undefined, [], undefined, undefined, sf.createBlock([Context.buildTargetStatement(s, useBreak)], false));
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
        //console.log(ref.name, ref.build);
        this.visted[s.targetReference] = ref;
        delete this.remain[s.targetReference];
        ref.build(ref, this);
        return undefined;
    }

    public buildBlock(s: Connector): ts.Statement {
        if (!s) return;
        else if (!this.hasRemain(s)) { return sf.createBlock([Context.buildTargetStatement(s)], false); }
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
    Currency = 'Currency',
    Date = 'Date',
    DateTime = 'DateTime',
    Picklist = 'Picklist',
}

export type Value = RequireOne<{
    stringValue?: string;
    numberValue?: number;
    dateValue?: string;
    booleanValue?: boolean;
    elementReference?: string;
}>;

export function valueFromTypeNode(s: ts.TypeNode): [isCollection: boolean, dataType: DataType, scale: number, typeName: string] {
    const isCollection = s.kind === sk.ArrayType;
    if (isCollection) s = (s as ts.ArrayTypeNode).elementType;
    const typeName = s.getText();
    switch (s.kind) {
        case sk.TypeReference:
            if (typeName.startsWith('apex.')) return [isCollection, DataType.Apex, undefined, typeName.substring(5)];
            else if (typeName === 'Currency') return [isCollection, DataType.Currency, undefined, typeName];
            else if (typeName === 'Date') return [isCollection, DataType.Date, undefined, typeName];
            else if (typeName === 'DateTime') return [isCollection, DataType.DateTime, undefined, typeName];
            else if (typeName === 'Picklist') return [isCollection, DataType.Picklist, undefined, typeName];
            else return [isCollection, DataType.SObject, undefined, typeName];
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
        case DataType.Currency: typeNode = sf.createTypeReferenceNode('Currency'); break;
        case DataType.Date: typeNode = sf.createTypeReferenceNode('Date'); break;
        case DataType.DateTime: typeNode = sf.createTypeReferenceNode('DateTime'); break;
        case DataType.Picklist: typeNode = sf.createTypeReferenceNode('Picklist'); break;
        default: throw Error(`valueToTypeNode: Unknown dataType '${dataType}'`);
    }
    return !isCollection ? typeNode : sf.createArrayTypeNode(typeNode);
}

export function valueFromExpression(s: ts.Expression, dataType?: DataType): Value {
    if (!dataType) {
        if (s.kind === sk.TrueKeyword || s.kind === sk.FalseKeyword) return { booleanValue: s.kind === sk.TrueKeyword };
        else if (s.kind === sk.StringLiteral) return { stringValue: (s as ts.StringLiteral).text };
        // else if (s.startsWith(':')) return { elementReference: s.substring(1) };
        else if (!isNaN(Number(s))) return { numberValue: Number(s) };
        // else if (s.endsWith('Z')) return { dateValue: s.substring(0, s.length - 1) } as Value;
        else throw Error('valueFromExpression: Unknown dataType');
    }
    switch (dataType) {
        case DataType.Boolean: return { booleanValue: s.kind === sk.TrueKeyword };
        case DataType.String: return { stringValue: (s as ts.StringLiteral).text };
        case DataType.Number: return { numberValue: Number((s as ts.NumericLiteral).text) };
        case DataType.Currency: return { numberValue: Number((s as ts.NumericLiteral).text) };
        case DataType.Date: return { dateValue: (s as ts.StringLiteral).text };
        case DataType.DateTime: return { dateValue: (s as ts.StringLiteral).text };
        case DataType.Picklist: return { stringValue: (s as ts.StringLiteral).text };
        default: throw Error(`valueFromExpression: Unknown dataType '${dataType}'`);
    }
}

export function valueToExpression(s: Value): ts.Expression {
    if ('booleanValue' in s) return s.booleanValue ? sf.createToken(sk.TrueKeyword) : sf.createToken(sk.FalseKeyword);
    else if ('stringValue' in s) return sf.createStringLiteral(s.stringValue, true);
    else if ('elementReference' in s) return sf.createStringLiteral(`:${s.elementReference}`, true);
    else if ('numberValue' in s) return sf.createNumericLiteral(s.numberValue);
    else if ('dateValue' in s) return sf.createNumericLiteral(`${s.dateValue}Z`);
    else throw Error(`valueToExpression: Unknown dataType ${Object.keys(s)}`);
}

export function valueFromString(s: string): Value {
    if (s === 'true' || s === 'false') return { booleanValue: Boolean(s) };
    else if (s.startsWith('\'')) return { stringValue: s.substring(1, s.length - 1) };
    else if (s.startsWith(':')) return { elementReference: s.substring(1) };
    else if (!isNaN(Number(s))) return { numberValue: Number(s) };
    else if (s.endsWith('Z')) return { dateValue: s.substring(0, s.length - 1) };
    else throw Error('valueToString: Unknown dataType');
}

export function valueToString(s: Value): string {
    if ('booleanValue' in s) return String(s.booleanValue);
    else if ('stringValue' in s) return `'${s.stringValue}'`;
    else if ('elementReference' in s) return `:${s.elementReference}`;
    else if ('numberValue' in s) return String(s.numberValue);
    else if ('dateValue' in s) return `${s.dateValue}Z`;
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

//#endregion

//#region Input/Output

export interface InputAssignment {
    field: string;
    value: Value;
}

export function inputAssignmentFromString(s: string): InputAssignment {
}

export function inputAssignmentToString(s: InputAssignment): string {
    return `${s.field} = ${valueToString(s.value)}`;
}

export interface OutputAssignment {
    assignToReference: string;
    field: string;
}

export function outputAssignmentFromString(s: string): OutputAssignment {
}

export function outputAssignmentToString(s: OutputAssignment): string {
    return `${s.assignToReference} = ${s.field}`;
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
