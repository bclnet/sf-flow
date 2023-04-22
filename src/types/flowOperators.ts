import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
import { Value } from './flowCommon';

//#region Conditions - https://help.salesforce.com/s/articleView?id=sf.flow_ref_operators_condition.htm&type=5

export enum Operator {
    DoesNotEqual,
    EqualTo,
    IsNull,
    NotEqualTo,
    GreaterThan,
    LessThanOrEqualTo,
    Contains,
}

export enum ConditionLogic {
    and,
    or,
}

export interface Condition {
    leftValueReference: string;
    operator: Operator;
    rightValue: Value;
}

//#endregion

//#region RecordFilters - https://help.salesforce.com/s/articleView?id=sf.flow_ref_operators_filter.htm&type=5

export interface RecordFilter {
    field: string;
    operator: Operator;
    value: Value;
}

//#endregion
