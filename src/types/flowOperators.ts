/* eslint-disable spaced-comment */
import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
import { toPascalCase } from '../utils';
import {
    ProcessMetadataValue,
    Value, valueFromExpression, valueToExpression, valueFromString, valueToString
} from './flowCommon';

//#region Operator

export enum Operator {
    DoesNotEqual = 'DoesNotEqual',
    EqualTo = 'EqualTo',
    IsNull = 'IsNull',
    NotEqualTo = 'NotEqualTo',
    GreaterThan = 'GreaterThan',
    LessThanOrEqualTo = 'LessThanOrEqualTo',
    Contains = 'Contains',
}

export function operatorFromString(s: string): [Operator, string, Value] {
    const [left, op, ...rest] = s.split(' '); const right = rest.join(' ');
    switch (op) {
        case '!==': return [Operator.DoesNotEqual, left, valueFromString(right)];
        case '=': return [Operator.EqualTo, left, valueFromString(right)];
        case 'in': return right === 'null' || right === '!null'
            ? [Operator.IsNull, left, { booleanValue: right === 'null' } as Value]
            : [Operator.Contains, left, valueFromString(right)];
        case '!=': return [Operator.NotEqualTo, left, valueFromString(right)];
        case '>': return [Operator.GreaterThan, left, valueFromString(right)];
        case '>=': return [Operator.LessThanOrEqualTo, left, valueFromString(right)];
        default: throw Error(`Unknown Operator ${op}`);
    }
}

export function operatorToString(s: Operator, left: string, right: Value): string {
    switch (s) {
        case Operator.DoesNotEqual: return `${left} !== ${valueToString(right)}`;
        case Operator.EqualTo: return `${left} = ${valueToString(right)}`;
        case Operator.IsNull: return `${left} in ${right.booleanValue ? 'null' : '!null'}`;
        case Operator.NotEqualTo: return `${left} != ${valueToString(right)}`;
        case Operator.GreaterThan: return `${left} > ${valueToString(right)}`;
        case Operator.Contains: return `${left} in ${valueToString(right)}`;
        case Operator.LessThanOrEqualTo: return `${left} >= ${valueToString(right)}`;
        // default: throw Error(`Unknown Operator ${s}`);
    }
}

export function operatorFromExpression(s: ts.BinaryExpression): [operator: Operator, left: string, right: Value] {
    const left = s.left.getText(); const right = s.right;
    switch (s.operatorToken.kind) {
        case sk.ExclamationEqualsEqualsToken: return [Operator.DoesNotEqual, left, valueFromExpression(right)];
        case sk.EqualsEqualsToken: return [Operator.EqualTo, left, valueFromExpression(right)];
        case sk.InKeyword: return right.kind === sk.NullKeyword || right.kind === sk.PrefixUnaryExpression
            ? [Operator.IsNull, left, { booleanValue: right.kind === sk.NullKeyword } as Value]
            : [Operator.Contains, left, valueFromExpression(right)];
        case sk.ExclamationEqualsToken: return [Operator.NotEqualTo, left, valueFromExpression(right)];
        case sk.GreaterThanToken: return [Operator.GreaterThan, left, valueFromExpression(right)];
        case sk.LessThanEqualsToken: return [Operator.LessThanOrEqualTo, left, valueFromExpression(right)];
        default: throw Error(`Unknown Operator ${s.toString()}`);
    }
}

export function operatorToExpression(s: Operator, left: ts.Expression, right: ts.Expression): ts.BinaryExpression {
    switch (s) {
        case Operator.DoesNotEqual: return sf.createBinaryExpression(left, sk.ExclamationEqualsEqualsToken, right);
        case Operator.EqualTo: return sf.createBinaryExpression(left, sk.EqualsEqualsToken, right);
        case Operator.IsNull: return sf.createBinaryExpression(left, sk.InKeyword, right.kind === sk.TrueKeyword ? sf.createNull() : sf.createPrefixUnaryExpression(sk.ExclamationToken, sf.createNull()));
        case Operator.NotEqualTo: return sf.createBinaryExpression(left, sk.ExclamationEqualsToken, right);
        case Operator.GreaterThan: return sf.createBinaryExpression(left, sk.GreaterThanToken, right);
        case Operator.Contains: return sf.createBinaryExpression(left, sk.InKeyword, right);
        case Operator.LessThanOrEqualTo: return sf.createBinaryExpression(left, sk.LessThanEqualsToken, right);
        // default: throw Error(`Unknown Operator ${s}`);
    }
}

//#endregion

//#region Conditions - https://help.salesforce.com/s/articleView?id=sf.flow_ref_operators_condition.htm&type=5

export enum ConditionLogic {
    and = 'and',
    or = 'or',
}

export interface Condition {
    leftValueReference: string;
    operator: Operator;
    processMetadataValues: ProcessMetadataValue[];
    rightValue: Value;
}

export function conditionsFromExpression(s: ts.Expression): [logic: ConditionLogic, conditions: Condition[]] {
    let c = s as ts.BinaryExpression;
    const operatorKind = c.operatorToken.kind;
    let logic: ConditionLogic;
    switch (operatorKind) {
        case sk.AmpersandAmpersandToken: logic = ConditionLogic.and; break;
        case sk.BarBarToken: logic = ConditionLogic.or; break;
        default: logic = ConditionLogic.and; break;
    };
    const conditions: Condition[] = [];
    while (c.operatorToken.kind === sk.AmpersandAmpersandToken || c.operatorToken.kind === sk.BarBarToken) {
        conditions.push(conditionFromExpression(c.right));
        c = c.left as ts.BinaryExpression;
    }
    conditions.push(conditionFromExpression(c));
    conditions.reverse();
    return [logic, conditions];
}

export function conditionsToExpression(logic: ConditionLogic, s: Condition[]): ts.Expression {
    let operator: ts.BinaryOperator;
    switch (logic) {
        case ConditionLogic.and: operator = sk.AmpersandAmpersandToken; break;
        case ConditionLogic.or: operator = sk.BarBarToken; break;
        // default: throw Error(`Unknown ConditionLogic ${logic}`)
    };
    const expr = conditionToExpression(s[0]);
    s.shift();
    return s.length === 0
        ? expr
        : s.reduce((left, c) => sf.createBinaryExpression(left, operator, conditionToExpression(c)), expr);
}

export function conditionFromExpression(s: ts.Expression): Condition {
    const [operator, leftValueReference, rightValue] = operatorFromExpression(s as ts.BinaryExpression);
    return {
        leftValueReference,
        operator,
        processMetadataValues: [],
        rightValue
    };
}

export function conditionToExpression(s: Condition): ts.Expression {
    return operatorToExpression(s.operator, sf.createIdentifier(s.leftValueReference), valueToExpression(s.rightValue));
}

//#endregion

//#region RecordFilters - https://help.salesforce.com/s/articleView?id=sf.flow_ref_operators_filter.htm&type=5

export interface RecordFilter {
    field: string;
    operator: Operator;
    processMetadataValues: ProcessMetadataValue[];
    value: Value;
}

export function recordFilterFromString(s: string): RecordFilter {
    const [operator, field, value] = operatorFromString(s);
    return {
        field,
        operator,
        processMetadataValues: [],
        value
    };
}

export function recordFilterToString(s: RecordFilter): string {
    return operatorToString(s.operator, s.field, s.value);
}

export function filterFromQuery(s: string): [string, RecordFilter[]] {
    if (!s) return [undefined, undefined];
    const where = s.startsWith('#') ? [s.substring(s.indexOf('; ') + 2), s.substring(1, s.indexOf('; '))] : [s, undefined];
    const seperator = s.startsWith('#') ? '; '
        : s.includes('=') && s.includes(' And ') ? ' And '
            : s.includes('=') && s.includes(' Or ') ? ' Or '
                : ' And ';
    const filterLogic = seperator === '; ' ? where[1]
        : seperator === ' And ' ? 'and'
            : seperator === ' Or ' ? 'or'
                : 'and';
    const filters = where[0].split(seperator).map(x => recordFilterFromString(x));
    return [filterLogic, filters];
}

export function filterToQuery(filterLogic: string, filters: RecordFilter[]): string {
    if (!filterLogic) return undefined;
    const where = filters.map(x => recordFilterToString(x)).join('\0');
    switch (filterLogic) {
        case null: break;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        case 'and': case 'or': return where.replaceAll('\0', ` ${toPascalCase(filterLogic)} `); break;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions
        default: return `#${filterLogic}; ${where.replaceAll('\0', '; ')}`; break;
    }
}

//#endregion
