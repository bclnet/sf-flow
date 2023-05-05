/* eslint-disable spaced-comment */
import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
type RequireOne<T, K extends keyof T = keyof T> = K extends keyof T ? PartialRequire<T, K> : never;
type PartialRequire<O, K extends keyof O> = { [P in K]-?: O[P]; } & O;
import { Debug } from './flow';
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
    const src = s.getSourceFile().getFullText();
    const ranges = ts.getTrailingCommentRanges(src, s.end)
    return ranges
        ? ranges.map(r => src.slice(r.pos + 2, r.end).trim())
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
    return name && locationX === undefined && locationY === undefined ? `${name}`
        : !name && locationX !== undefined && locationY !== undefined ? `${locationX}, ${locationY}`
            : name && locationX !== undefined && locationY ? `${name}, ${locationX}, ${locationY}`
                : 'ERROR';
}

export function parseLeadingComment(s: ts.Node): [string, string, string, ProcessMetadataValue[]] {
    function parseProcessMetadataValue(k: string): ProcessMetadataValue {
        const [name, ...rest] = k.substring(6).split(' = '); const value = rest.join(' = ');
        return {
            name,
            value: value ? valueFromString(value) : undefined,
        };
    }
    const c = getLeadingComments(s);
    if (!c || c.length === 0) return [undefined, undefined, undefined, []];
    const processMetadataValues = c.filter(x => x.startsWith('meta:')).map(x => parseProcessMetadataValue(x));
    const values = c.filter(x => !x.startsWith('meta:'));
    const description = values.length > 1 ? values[0].trim() : undefined;
    const labelLocation = values.length > 0 ? values[values.length - 1].replace(']', '').split('[', 2) : undefined;
    return [labelLocation?.length > 0 ? labelLocation[0].trim() : undefined, labelLocation?.length > 1 ? labelLocation[1].trim() : undefined, description, processMetadataValues];
}

export function buildLeadingComment(s: ts.Node, label: string, location: string, description: string, processMetadataValues: ProcessMetadataValue[]): void {
    function buildProcessMetadataValue(k: ProcessMetadataValue): string {
        return `meta: ${k.name}${k.value ? ` = ${valueToString(k.value)}` : ''}`;
    }
    if (description) ts.addSyntheticLeadingComment(s, sk.SingleLineCommentTrivia, ` ${description}`, true);
    if (label || location) ts.addSyntheticLeadingComment(s, sk.SingleLineCommentTrivia, `${label ? ` ${label}` : ''}${location ? ` [${location}]` : ''}`, true);
    if (processMetadataValues) processMetadataValues.forEach(v => {
        ts.addSyntheticLeadingComment(s, sk.SingleLineCommentTrivia, ` ${buildProcessMetadataValue(v)}`, true);
    });
}

export function parseTrailingComment(s: ts.Node): [string, string] {
    const c = getTrailingComments(s);
    if (!c || c.length === 0) return [undefined, undefined];
    const values = c.filter(x => !x.startsWith('meta:'));
    const labelLocation = values[values.length - 1].replace(']', '').split('[', 2);
    return [labelLocation[0].trim(), labelLocation.length > 1 ? labelLocation[1].trim() : undefined];
}

export function buildTrailingComment(s: ts.Node, label: string, location: string): void {
    ts.addSyntheticTrailingComment(s, sk.SingleLineCommentTrivia, `${label ? ` ${label}` : ''}${location ? ` [${location}]` : ''}`, true);
}

//#endregion

//#region Query

export function genericFromQuery(s: string, queryName: string, actionName: string): [query: string, action: string, from: string, where: string, limit: string] {
    const endx = s.length; const queryl = queryName.length + 1; const actionl = actionName.length + 1;
    let queryx = s.indexOf(`${queryName} `); if (queryx === -1) throw Error(`missing ${queryName}`); queryx += queryl;
    let actionx = s.indexOf(`${actionName} `, queryx); if (actionx === -1) actionx = queryx; else actionx += actionl;
    let fromx = s.indexOf('FROM ', actionx); if (fromx === -1) fromx = actionx; else fromx += 5;
    let wherex = s.indexOf('WHERE ', fromx); if (wherex === -1) wherex = fromx; else wherex += 6;
    let limitx = s.indexOf('LIMIT ', wherex); if (limitx === -1) limitx = endx; else limitx += 6;
    const query = s.substring(queryx, queryx === actionx ? fromx - 6 : actionx - actionl - 1);
    const action = queryx === actionx ? undefined : s.substring(actionx, actionx === fromx ? actionx === wherex ? limitx === endx ? endx : wherex - 7 : wherex - 7 : fromx - 6);
    const from = fromx === actionx ? undefined : s.substring(fromx, fromx === wherex ? limitx === endx ? endx : limitx - 7 : wherex - 7);
    const where = wherex === fromx ? undefined : s.substring(wherex, endx === limitx ? endx : limitx - 7);
    const limit = limitx === endx ? undefined : s.substring(limitx, endx);
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

    public static parseTargetStatement(s: ts.Statement): [obj: Connectable, field: string] {
        return [{ name: (s as ts.BreakStatement).label.text }, undefined];
    }

    public static buildTargetStatement(s: Connector): ts.Statement {
        return sf.createBreakStatement(s.targetReference); //s.isGoTo ? sf.createContinueStatement(s.targetReference)
    }

    public static parseTargetFaultArgument(s: ts.Expression): Connector {
        const stmt = s as ts.ArrowFunction;
        if (stmt.kind !== sk.ArrowFunction && stmt.body.kind !== sk.Block) throw Error('parseTargetFaultArgument: invalid arrow function');
        const [connect,] = Context.parseTargetStatement((stmt.body as ts.Block).statements[0]);
        return {
            targetReference: connect.name,
            processMetadataValues: [],
        };
    }

    public static buildTargetFaultArgument(s: Connector): ts.Expression {
        return sf.createArrowFunction(undefined, undefined, [], undefined, undefined, sf.createBlock([Context.buildTargetStatement(s)], false));
    }

    public moveNext(): Connector {
        this.counted = {};
        const refs = Object.keys(this.remain).sort((l, r) => this.countReference(l) - this.countReference(r));
        if (refs.length === 0) return undefined;
        return {
            targetReference: refs[0],
            processMetadataValues: []
        };
    }

    public hasRemain(s: Connector): boolean { return s.targetReference in this.remain; }

    public count(s: Connector): number {
        this.counting = true;
        if (!s) return 0;
        else if (!this.hasRemain(s)) return 1;
        const ref = this.remain[s.targetReference] as Element;
        if (!ref) throw Error(`count: unknown targetReference '${s.targetReference}`);
        return 1 + (ref.build(undefined, ref, this) as number);
    }

    public build(debug: Debug, s: Connector): ts.ClassElement {
        this.counting = false;
        if (!s) return;
        else if (!this.hasRemain(s)) { this.stmts.push(Context.buildTargetStatement(s)); return; }
        const ref = this.remain[s.targetReference] as Element;
        if (!ref) throw Error(`build: unknown targetReference '${s.targetReference}`);
        debug?.log('build', ref.build.name.substring(0, ref.build.name.length - 5), ref.name);
        this.visted[s.targetReference] = ref;
        delete this.remain[s.targetReference];
        ref.build(debug, ref, this);
        return undefined;
    }

    public buildBlock(debug: Debug, s: Connector): ts.Statement {
        if (!s) return;
        else if (!this.hasRemain(s)) { return sf.createBlock([Context.buildTargetStatement(s)], false); }
        const lastStmts = this.stmts;
        this.stmts = [];
        debug?.push();
        this.build(debug, s);
        debug?.pop();
        const block = sf.createBlock(this.stmts, true);
        this.stmts = lastStmts;
        return block;
    }

    private countReference(s: string): number {
        let count = this.counted[s] as number;
        if (count) return count;
        count = this.count({ targetReference: s, processMetadataValues: [] } as Connector);
        this.counted[s] = count;
        return count;
    }
}

//#endregion

//#region Connector

export interface Connectable {
    name: string;
}

export interface Connector {
    isGoTo?: boolean;
    targetReference: string;
    processMetadataValues: ProcessMetadataValue[];
}

export function connectorCreate(targetReference: string, isGoTo?: boolean): Connector {
    return {
        isGoTo,
        targetReference,
        processMetadataValues: [],
    };
}

//#endregion

//#region Value

export enum DataType {
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
    let args: ts.TypeNode[];
    switch (s.kind) {
        case sk.TypeReference:
            args = (s as unknown as ts.TypeReference).typeArguments as unknown as ts.TypeNode[];
            if (typeName.startsWith('apex.')) return [isCollection, DataType.Apex, undefined, typeName.substring(5)];
            else if (typeName.startsWith('Number')) return [isCollection, DataType.Number, args?.length > 0 ? Number(args[0].getText()) : 0, undefined];
            else if (typeName.startsWith('Currency')) return [isCollection, DataType.Currency, args?.length > 0 ? Number(args[0].getText()) : 0, undefined];
            else if (typeName === 'Date') return [isCollection, DataType.Date, undefined, undefined];
            else if (typeName === 'DateTime') return [isCollection, DataType.DateTime, undefined, undefined];
            else if (typeName === 'Picklist') return [isCollection, DataType.Picklist, undefined, undefined];
            else return [isCollection, DataType.SObject, undefined, typeName];
        case sk.BooleanKeyword: return [isCollection, DataType.Boolean, undefined, undefined];
        case sk.StringKeyword: return [isCollection, DataType.String, undefined, undefined];
        case sk.NumberKeyword: return [isCollection, DataType.Number, 0, undefined];
        default: throw Error(`valueFromTypeNode: unknown dataType ${sk[s.kind]}`);
    }
}

export function valueToTypeNode(isCollection: boolean, dataType: DataType, scale?: number, typeName?: string): ts.TypeNode {
    let typeNode: ts.TypeNode;
    switch (dataType) {
        case DataType.Apex: typeNode = sf.createTypeReferenceNode(`apex.${typeName}`); break;
        case DataType.SObject: typeNode = sf.createTypeReferenceNode(typeName); break;
        case DataType.Boolean: typeNode = sf.createKeywordTypeNode(sk.BooleanKeyword); break;
        case DataType.String: typeNode = sf.createKeywordTypeNode(sk.StringKeyword); break;
        case DataType.Number: typeNode = scale === 0 ? sf.createKeywordTypeNode(sk.NumberKeyword) : sf.createTypeReferenceNode(sf.createIdentifier('Number'), [sf.createLiteralTypeNode(sf.createNumericLiteral(scale))]); break;
        case DataType.Currency: typeNode = sf.createTypeReferenceNode(sf.createIdentifier('Currency'), [sf.createLiteralTypeNode(sf.createNumericLiteral(scale))]); break;
        case DataType.Date: typeNode = sf.createTypeReferenceNode('Date'); break;
        case DataType.DateTime: typeNode = sf.createTypeReferenceNode('DateTime'); break;
        case DataType.Picklist: typeNode = sf.createTypeReferenceNode('Picklist'); break;
        // default: throw Error(`valueToTypeNode: unknown dataType '${dataType}'`);
    }
    return !isCollection ? typeNode : sf.createArrayTypeNode(typeNode);
}

// eslint-disable-next-line complexity
export function valueFromExpression(s: ts.Expression, dataType?: DataType): Value {
    if (!s) return undefined;
    if (!dataType) {
        if (s.kind === sk.NullKeyword) return undefined;
        else if (s.kind === sk.TrueKeyword || s.kind === sk.FalseKeyword) return { booleanValue: s.kind === sk.TrueKeyword };
        else if (s.kind === sk.StringLiteral) return { stringValue: (s as ts.StringLiteral).text };
        else if (s.kind === sk.Identifier || s.kind === sk.PropertyAccessExpression) return { elementReference: (s as ts.PropertyAccessExpression).getText() };
        else if (s.kind === sk.FirstLiteralToken && !isNaN(Number(s.getText()))) return { numberValue: Number(s.getText()) };
        // else if (s.endsWith('Z')) return { dateValue: s.substring(0, s.length - 1) } as Value;
        else throw Error(`valueFromExpression: unknown dataType ${sk[s.kind]}`);
    }
    if (s.kind === sk.Identifier || s.kind === sk.PropertyAccessExpression) return { elementReference: s.getText() };
    switch (dataType) {
        case DataType.Boolean: return { booleanValue: s.kind === sk.TrueKeyword };
        case DataType.String: return { stringValue: (s as ts.StringLiteral).text };
        case DataType.Number: return { numberValue: Number((s as ts.NumericLiteral).text) };
        case DataType.Currency: return { numberValue: Number((s as ts.NumericLiteral).text) };
        case DataType.Date: return { dateValue: (s as ts.StringLiteral).text?.substring(0, (s as ts.StringLiteral).text.length - 1) };
        case DataType.DateTime: return { dateValue: (s as ts.StringLiteral).text };
        case DataType.Picklist: return { stringValue: (s as ts.StringLiteral).text };
        case DataType.SObject: return { elementReference: (s as ts.StringLiteral).text };
        default: throw Error(`valueFromExpression: unknown dataType '${dataType}'`);
    }
}

export function valueToExpression(s: Value): ts.Expression {
    if (!s) return sf.createToken(sk.NullKeyword);
    else if ('booleanValue' in s) return s.booleanValue ? sf.createToken(sk.TrueKeyword) : sf.createToken(sk.FalseKeyword);
    else if ('stringValue' in s) return sf.createStringLiteral(s.stringValue, true);
    else if ('elementReference' in s) return sf.createIdentifier(s.elementReference);
    else if ('numberValue' in s) return sf.createNumericLiteral(s.numberValue);
    else if ('dateValue' in s) return sf.createStringLiteral(`${s.dateValue}Z`, true); //sf.createNewExpression(sf.createIdentifier('Date'), undefined, [sf.createStringLiteral(`${s.dateValue}Z`, true)]);
    else throw Error(`valueToExpression: unknown dataType ${Object.keys(s).join(', ')}`);
}

export function valueFromString(s: string): Value {
    if (!s) return undefined;
    else if (s === 'true' || s === 'false') return { booleanValue: s === 'true' };
    else if (s.startsWith('\'')) return { stringValue: s.substring(1, s.length - 1) };
    else if (s.startsWith(':')) return { elementReference: s.substring(1) };
    else if (!isNaN(Number(s))) return { numberValue: Number(s) };
    else if (s.endsWith('Z')) return { dateValue: s.substring(0, s.length - 1) };
    else throw Error('valueFromString: unknown dataType');
}

export function valueToString(s: Value): string {
    if (!s) return undefined;
    else if ('booleanValue' in s) return String(s.booleanValue);
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

//#endregion

//#region Input/Output

export interface InputAssignment {
    field: string;
    processMetadataValues: ProcessMetadataValue[];
    value: Value;
}

export function inputAssignmentFromString(s: string): InputAssignment {
    const [field, ...rest] = s.split(' = '); const value = rest.join(' = ');
    if (!value) throw Error(`inputAssignmentFromString '${s}'`);
    return {
        field,
        processMetadataValues: [],
        value: valueFromString(value),
    };
}

export function inputAssignmentToString(s: InputAssignment): string {
    return `${s.field} = ${valueToString(s.value)}`;
}

export interface OutputAssignment {
    assignToReference: string;
    field: string;
    processMetadataValues: ProcessMetadataValue[];
}

export function outputAssignmentFromString(s: string): OutputAssignment {
    const [assignToReference, ...rest] = s.split(' = '); const field = rest.join(' = ');
    if (!field) throw Error(`outputAssignmentFromString '${s}'`);
    return {
        assignToReference,
        field,
        processMetadataValues: [],
    };
}

export function outputAssignmentToString(s: OutputAssignment): string {
    return `${s.assignToReference} = ${s.field}`;
}

export interface InputParameter {
    name: string;
    processMetadataValues: ProcessMetadataValue[];
    value: Value;
}

export function inputParameterFromString(s: string): InputParameter {
    const [name, ...rest] = s.split(' = '); const value = rest.join(' = ');
    if (!value) throw Error(`inputParameterFromString '${s}'`);
    return {
        name,
        processMetadataValues: [],
        value: valueFromString(value),
    };
}

export function inputParameterToString(s: InputParameter): string {
    return `${s.name} = ${valueToString(s.value)}`;
}

export interface OutputParameter {
    assignToReference: string;
    name: string;
    processMetadataValues: ProcessMetadataValue[];
}

export function outputParameterFromString(s: string): OutputParameter {
    const [assignToReference, ...rest] = s.split(' = '); const name = rest.join(' = ');
    if (!name) throw Error(`outputParameterFromString '${s}'`);
    return {
        assignToReference,
        name,
        processMetadataValues: [],
    };
}

export function outputParameterToString(s: OutputParameter): string {
    return `${s.assignToReference} = ${s.name}`;
}

//#endregion

//#region Step

export interface Step {
}

export function stepParse(s: ts.Node): Step {
    throw Error('stepParse');
}

/* eslint-disable complexity */
export function stepBuild(s: Step) {
    throw Error('stepBuild');
}

//#endregion

//#region Wait

export interface Wait {
}

export function waitParse(s: ts.Node): Wait {
    throw Error('waitParse');
}

/* eslint-disable complexity */
export function waitBuild(s: Wait) {
    throw Error('waitBuild');
}

//#endregion
