import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
import { Value, valueToExpression, valueToString } from './flowCommon';

//#region Conditions - https://help.salesforce.com/s/articleView?id=sf.flow_ref_operators_condition.htm&type=5

export enum Operator {
    DoesNotEqual = 'DoesNotEqual',
    EqualTo = 'EqualTo',
    IsNull = 'IsNull',
    NotEqualTo = 'NotEqualTo',
    GreaterThan = 'GreaterThan',
    LessThanOrEqualTo = 'LessThanOrEqualTo',
    Contains = 'Contains',
}

export function operatorFromString(s: string): Operator {
    throw Error('TBD');
}

export function operatorToString(s: Operator): string {
    switch (s) {
        case Operator.DoesNotEqual: return '!==';
        case Operator.EqualTo: return '=';
        case Operator.IsNull: return 'is null';
        case Operator.NotEqualTo: return '!=';
        case Operator.GreaterThan: return '>';
        case Operator.Contains: return 'in';
        case Operator.LessThanOrEqualTo: return '>=';
        default: throw Error(`Unknown Operator ${s}`);
    }
}

export function operatorToExpression(s: Operator, left: ts.Expression, right: ts.Expression): ts.BinaryExpression {
    switch (s) {
        case Operator.DoesNotEqual: return sf.createBinaryExpression(left, sk.ExclamationEqualsEqualsToken, right);
        case Operator.EqualTo: return sf.createBinaryExpression(left, sk.EqualsToken, right);
        case Operator.IsNull: return sf.createBinaryExpression(left, sk.IsKeyword, right.kind === sk.TrueKeyword ? sf.createNull() : sf.createLogicalNot(sf.createNull()));
        case Operator.NotEqualTo: return sf.createBinaryExpression(left, sk.ExclamationEqualsToken, right);
        case Operator.GreaterThan: return sf.createBinaryExpression(left, sk.GreaterThanToken, right);
        case Operator.Contains: return sf.createBinaryExpression(left, sk.InKeyword, right);
        case Operator.LessThanOrEqualTo: return sf.createBinaryExpression(left, sk.LessThanEqualsToken, right);
        default: throw Error(`Unknown Operator ${s}`);
    }
}

export enum ConditionLogic {
    and = 'and',
    or = 'or',
}

export interface Condition {
    leftValueReference: string;
    operator: Operator;
    rightValue: Value;
}

export function conditionFromString(s: string): Condition {
    // var parts = source.Split(' ', 3);
    // if (parts.Length != 3) throw new FormatException("condition expected 3 parts");
    // if (parts[1] == "is")
    // {
    //     parts[1] = parts[1] + parts[2][..4];
    //     parts[2] = parts[2][4..];
    // }
    // var (leftValueReference, op, rightValue) = (parts[0], parts[1], parts[2]);
    // return new Condition
    // {
    //     LeftValueReference = leftValueReference,
    //     Operator = FlowExtensions.OperatorParse(op),
    //     RightValue = Value.Parse(rightValue),
    // };

    throw Error('TBD');
}

export function conditionsToExpression(logic: ConditionLogic, s: Condition[]): ts.Expression {
    let operator: ts.BinaryOperator;
    switch (logic) {
        case ConditionLogic.and: operator = sk.AmpersandAmpersandToken; break;
        case ConditionLogic.or: operator = sk.BarBarToken; break;
        default: throw Error(`Unknown ConditionLogic ${logic}`)
    };
    const expr = conditionToExpression(s[0]);
    s.shift();
    return s.length === 0
        ? expr
        : s.reduce((left, c) => sf.createBinaryExpression(left, operator, conditionToExpression(c)), expr);
}

export function conditionToExpression(s: Condition): ts.Expression {
    return operatorToExpression(s.operator, sf.createIdentifier(s.leftValueReference), valueToExpression(s.rightValue));
}

//#endregion

//#region RecordFilters - https://help.salesforce.com/s/articleView?id=sf.flow_ref_operators_filter.htm&type=5

export interface RecordFilter {
    field: string;
    operator: Operator;
    value: Value;
}

export function recordFilterFromString(s: string): RecordFilter {
}

export function recordFilterToString(s: RecordFilter): string {
    return `${s.field} ${operatorToString(s.operator)} ${valueToString(s.value)}`;
}

//#endregion
