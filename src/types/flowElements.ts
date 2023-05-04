/* eslint-disable no-console */
/* eslint-disable spaced-comment */
/* eslint-disable @typescript-eslint/ban-types */
import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
import { objectPurge } from '../utils';
import { Flow, Debug, FlowProcessType, flowParseBlock, FlowLabelPrefix } from './flow';
import {
    createStringLiteralX, buildLocation, parseLocation, parseLeadingComment, buildLeadingComment, parseTrailingComment, buildTrailingComment,
    genericFromQuery, genericToQuery,
    DataType, Value,
    Context,
    Connector, Connectable,
    ProcessMetadataValue,
    InputParameter, inputParameterFromString, inputParameterToString,
    OutputParameter, outputParameterFromString, outputParameterToString,
    InputAssignment, inputAssignmentFromString, inputAssignmentToString,
    OutputAssignment, outputAssignmentFromString, outputAssignmentToString, valueToExpression, valueFromExpression
} from './flowCommon';
import {
    ConditionLogic, Condition, conditionsFromExpression, conditionsToExpression,
    RecordFilter, filterFromQuery, filterToQuery
} from './flowOperators';

export interface Element {
    name: string;
    label: string;
    locationX: number;
    locationY: number;
    description?: string;
    processMetadataValues?: ProcessMetadataValue[];
    build: (debug: Debug, s: Element, ctx: Context) => void | number;
}

//#region ApexAction - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_apex_invocable.htm&type=5

export enum FlowTransactionModel {
    CurrentTransaction = 'CurrentTransaction',
    Automatic = 'Automatic',
}

export interface ActionCall extends Element {
    actionName: string;
    actionType: string;
    flowTransactionModel: FlowTransactionModel;
    connector?: Connector;
    faultConnector?: Connector;
    inputParameters: InputParameter[];
    outputParameters: OutputParameter[];
    storeOutputAutomatically?: string;
}

export function actionCallParse(debug: Debug, f: Flow, s: ts.VariableStatement, func: ts.CallExpression): [obj: Element, field: string] {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [, locationX, locationY] = parseLocation(location);
    const decl = s.declarationList.declarations[0];
    const args = func.arguments;
    const funcName = (func.expression as ts.PropertyAccessExpression).name.escapedText as string;
    if (funcName !== 'query' && !(args.length >= 1 || args.length <= 2)) throw Error(`bad function '${funcName}(${args.length})'`);
    const [actionName, actionType, inputParameters, outputParameters, flowTransactionModel] = actionCallFromQuery((args[0] as ts.StringLiteral).text);
    const prop = objectPurge({
        name: (decl.name as ts.Identifier).text,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        actionName,
        actionType,
        flowTransactionModel,
        connector: undefined,
        faultConnector: args.length > 1 ? Context.parseTargetFaultArgument(args[1]) : undefined,
        inputParameters,
        outputParameters,
        storeOutputAutomatically: decl.exclamationToken?.kind !== sk.ExclamationToken ? undefined : String(true),
    }) as ActionCall;
    f.actionCalls.push(prop);
    //console.log(prop);
    return [prop, 'connector'];
}

/* eslint-disable complexity */
export function actionCallBuild(debug: Debug, s: ActionCall, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('query'));
    const args: ts.Expression[] = [createStringLiteralX(actionCallToQuery(s))];
    if (s.faultConnector) args.push(Context.buildTargetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/s.storeOutputAutomatically ? sf.createToken(sk.ExclamationToken) : undefined,
            /*type*/undefined,
            /*initializer*/lambda)], ts.NodeFlags.Const));
    buildLeadingComment(stmt, s.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    ctx.stmts.push(stmt);
    ctx.build(debug, s.connector);
}

function actionCallFromQuery(s: string): [actionName: string, actionType: string, inputParameters: InputParameter[], outputParameters: OutputParameter[], flowTransactionModel: FlowTransactionModel] {
    const [query, action, from, where, limit] = genericFromQuery(s, 'ACTION', 'SET');
    return [
        /*actionName*/query,
        /*actionType*/from,
        /*inputParameters*/action ? action.split(',').map(x => inputParameterFromString(x.trim())) : [],
        /*outputParameters*/where ? where.split(',').map(x => outputParameterFromString(x.trim())) : [],
        /*flowTransactionModel*/(limit ?? FlowTransactionModel.CurrentTransaction) as FlowTransactionModel];
}

function actionCallToQuery(s: ActionCall): string {
    return genericToQuery('ACTION', 'SET',
        /*query*/s.actionName,
        /*action*/s.inputParameters.length > 0 ? s.inputParameters.map(x => inputParameterToString(x)).join(', ') : undefined,
        /*from*/s.actionType,
        /*where*/s.outputParameters.length > 0 ? s.outputParameters.map(x => outputParameterToString(x)).join(', ') : undefined,
        /*limit*/s.flowTransactionModel === FlowTransactionModel.CurrentTransaction ? undefined : s.flowTransactionModel);
}

//#endregion

//#region ApexPluginCall

export interface ApexPluginCall extends Element {
    actionName: string;
    actionType: string;
    flowTransactionModel: FlowTransactionModel;
    connector?: Connector;
    faultConnector?: Connector;
    inputParameters: InputParameter[];
    outputParameters: OutputParameter[];
    storeOutputAutomatically?: string;
}

export function apexPluginCallParse(debug: Debug, f: Flow, s: ts.VariableStatement, func: ts.CallExpression): [obj: Element, field: string] {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [, locationX, locationY] = parseLocation(location);
    const decl = s.declarationList.declarations[0];
    const args = func.arguments;
    const funcName = (func.expression as ts.PropertyAccessExpression).name.escapedText as string;
    if (funcName !== 'query' && !(args.length >= 1 || args.length <= 2)) throw Error(`bad function '${funcName}(${args.length})'`);
    const [actionName, actionType, inputParameters, outputParameters, flowTransactionModel] = apexPluginCallFromQuery((args[0] as ts.StringLiteral).text);
    const prop = objectPurge({
        name: (decl.name as ts.Identifier).text,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        actionName,
        actionType,
        flowTransactionModel,
        connector: undefined,
        faultConnector: args.length > 1 ? Context.parseTargetFaultArgument(args[1]) : undefined,
        inputParameters,
        outputParameters,
        storeOutputAutomatically: String(decl.exclamationToken?.kind !== sk.ExclamationToken),
    }) as ActionCall;
    f.actionCalls.push(prop);
    //console.log(prop);
    return [prop, 'connector'];
}

/* eslint-disable complexity */
export function apexPluginCallBuild(debug: Debug, s: ApexPluginCall, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('query'));
    const args: ts.Expression[] = [createStringLiteralX(apexPluginCallToQuery(s))];
    if (s.faultConnector) args.push(Context.buildTargetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/!s.storeOutputAutomatically ? sf.createToken(sk.ExclamationToken) : undefined,
            /*type*/undefined,
            /*initializer*/lambda)], ts.NodeFlags.Const));
    buildLeadingComment(stmt, s.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    ctx.stmts.push(stmt);
    ctx.build(debug, s.connector);
}

function apexPluginCallFromQuery(s: string): [actionName: string, actionType: string, inputParameters: InputParameter[], outputParameters: OutputParameter[], flowTransactionModel: FlowTransactionModel] {
    const [query, action, from, where, limit] = genericFromQuery(s, 'ACTION', 'SET');
    return [
        /*actionName*/query,
        /*actionType*/from,
        /*inputParameters*/action ? action.split(',').map(x => inputParameterFromString(x.trim())) : [],
        /*outputParameters*/where ? action.split(',').map(x => outputParameterFromString(x.trim())) : [],
        /*flowTransactionModel*/(limit ?? FlowTransactionModel.CurrentTransaction) as FlowTransactionModel];
}

function apexPluginCallToQuery(s: ApexPluginCall): string {
    return genericToQuery('APEX', 'SET',
        /*query*/s.actionName,
        /*action*/s.inputParameters.length > 0 ? s.inputParameters.map(x => inputParameterToString(x)).join(', ') : undefined,
        /*from*/s.actionType,
        /*where*/s.outputParameters.length > 0 ? s.outputParameters.map(x => outputParameterToString(x)).join(', ') : undefined,
        /*limit*/s.flowTransactionModel === FlowTransactionModel.CurrentTransaction ? undefined : s.flowTransactionModel);
}

//#endregion

//#region Assignment - https://help.salesforce.com/s/articleView?language=en_US&id=sf.flow_ref_elements_assignment.htm&type=5

export enum AssignmentOperator {
    Assign = 'Assign',
    AssignCount = 'AssignCount',
    Add = 'Add',
    AddAtStart = 'AddAtStart',
    RemoveAll = 'RemoveAll',
    RemoveFirst = 'RemoveFirst',
    RemoveAfterFirst = 'RemoveAfterFirst',
    RemoveBeforeFirst = 'RemoveBeforeFirst',
    RemovePosition = 'RemovePosition',
    RemoveUncommon = 'RemoveUncommon',
}

export interface AssignmentItem {
    assignToReference: string;
    operator: AssignmentOperator;
    processMetadataValues: ProcessMetadataValue[];
    value: Value;
}

export interface Assignment extends Element {
    assignmentItems: AssignmentItem[];
    connector?: Connector;
    faultConnector?: Connector;
}

export function assignmentParse(debug: Debug, f: Flow, s: ts.VariableStatement, func: ts.CallExpression): [obj: Element, field: string] {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [, locationX, locationY] = parseLocation(location);
    const decl = s.declarationList.declarations[0];
    const args = func.arguments;
    const funcName = (func.expression as ts.PropertyAccessExpression).name.escapedText as string;
    if (funcName !== 'set' && !(args.length >= 1 || args.length <= 2)) throw Error(`bad function '${funcName}(${args.length})'`);
    const assignmentItems = assignmentFromExpression(args[0]);
    const prop = objectPurge({
        name: (decl.name as ts.Identifier).text,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        assignmentItems,
        connector: undefined,
        faultConnector: args.length > 1 ? Context.parseTargetFaultArgument(args[1]) : undefined,
    }) as Assignment;
    f.assignments.push(prop);
    //console.log(prop);
    return [prop, 'connector'];
}

/* eslint-disable complexity */
export function assignmentBuild(debug: Debug, s: Assignment, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('set'));
    const args: ts.Expression[] = [assignmentToExpression(s.assignmentItems)];
    if (s.faultConnector) args.push(Context.buildTargetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined,
            /*initializer*/lambda)], ts.NodeFlags.Const));
    buildLeadingComment(stmt, s.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    ctx.stmts.push(stmt);
    ctx.build(debug, s.connector);
}

function assignmentFromExpression(s: ts.Expression): AssignmentItem[] {
    if (s.kind !== sk.ArrowFunction) throw Error('assignmentFromExpression expected ArrayFunction');
    const body = (s as ts.ArrowFunction).body;
    const items: AssignmentItem[] = [];
    body.forEachChild(c1 => {
        switch (c1.kind) {
            case sk.ExpressionStatement: {
                const stmt = c1 as ts.ExpressionStatement;
                const c = stmt.expression as ts.BinaryExpression;
                let operator: AssignmentOperator;
                switch (c.operatorToken.kind) {
                    case sk.EqualsToken: operator = AssignmentOperator.Assign; break;
                    case sk.SlashEqualsToken: operator = AssignmentOperator.AssignCount; break;
                    case sk.PlusEqualsToken: operator = AssignmentOperator.Add; break;
                    case sk.PercentEqualsToken: operator = AssignmentOperator.AddAtStart; break;
                    case sk.LessThanLessThanEqualsToken: operator = AssignmentOperator.RemoveAll; break;
                    case sk.LessThanEqualsToken: operator = AssignmentOperator.RemoveFirst; break;
                    case sk.GreaterThanEqualsToken: operator = AssignmentOperator.RemoveAfterFirst; break;
                    case sk.GreaterThanGreaterThanGreaterThanEqualsToken: operator = AssignmentOperator.RemoveBeforeFirst; break;
                    case sk.AsteriskEqualsToken: operator = AssignmentOperator.RemovePosition; break;
                    case sk.AsteriskAsteriskEqualsToken: operator = AssignmentOperator.RemoveUncommon; break;
                    // case sk.CaretEqualsToken: operator = AssignmentOperator.Other; break;
                    default: throw Error(`Unknown AssignmentOperator ${sk[c.operatorToken.kind]}`);
                }
                const item = {
                    assignToReference: (c.left as ts.PropertyAccessExpression).getText(),
                    operator,
                    processMetadataValues: [],
                    value: valueFromExpression(c.right),
                };
                items.push(item);
                break;
            }
            default: console.log(`!${sk[c1.kind]}`, c1.getText(s.getSourceFile())); break;
        }
    });
    return items;
}

function assignmentToExpression(s: AssignmentItem[]): ts.Expression {
    const b = s.map(c => {
        let token: ts.SyntaxKind;
        switch (c.operator) {
            case AssignmentOperator.Assign: token = sk.EqualsToken; break;                          /* = */
            case AssignmentOperator.AssignCount: token = sk.SlashEqualsToken; break;                /* /= */
            case AssignmentOperator.Add: token = sk.PlusEqualsToken; break;                         /* += */
            case AssignmentOperator.AddAtStart: token = sk.PercentEqualsToken; break;               /* %= */
            case AssignmentOperator.RemoveAll: token = sk.LessThanLessThanEqualsToken; break;       /* <<= */
            case AssignmentOperator.RemoveFirst: token = sk.LessThanEqualsToken; break;             /* <= */
            case AssignmentOperator.RemoveAfterFirst: token = sk.GreaterThanEqualsToken; break;     /* >= */
            case AssignmentOperator.RemoveBeforeFirst: token = sk.GreaterThanGreaterThanGreaterThanEqualsToken; break; /* >>= */
            case AssignmentOperator.RemovePosition: token = sk.AsteriskEqualsToken; break;          /* *= */
            case AssignmentOperator.RemoveUncommon: token = sk.AsteriskAsteriskEqualsToken; break;  /* **= */
            // case AssignmentOperator.Other: op = sk.CaretEqualsToken; break;                      /* ^= */
            default: throw Error(`Unknown AssignmentOperator ${c.operator as string}`);
        }
        return sf.createExpressionStatement(sf.createBinaryExpression(
            sf.createIdentifier(c.assignToReference), sf.createToken(token), valueToExpression(c.value)))
    });
    return sf.createArrowFunction(undefined, undefined, [], undefined, undefined, sf.createBlock(b, true));
}

//#endregion

//#region CreateRecord - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_data_create.htm&type=5

export interface RecordCreate extends Element {
    assignRecordIdToReference?: string;
    connector?: Connector;
    faultConnector?: Connector;
    inputAssignments: InputAssignment[];
    object: string;
    inputReference?: string;
    storeOutputAutomatically: string;
}

export function recordCreateParse(debug: Debug, f: Flow, s: ts.VariableStatement, func: ts.CallExpression): [obj: Element, field: string] {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [, locationX, locationY] = parseLocation(location);
    const decl = s.declarationList.declarations[0];
    const args = func.arguments;
    const funcName = (func.expression as ts.PropertyAccessExpression).name.escapedText as string;
    if (funcName !== 'query' && !(args.length >= 1 || args.length <= 2)) throw Error(`bad function '${funcName}(${args.length})'`);
    const [inputAssignments, object, inputReference] = recordCreateFromQuery((args[0] as ts.StringLiteral).text);
    const prop = objectPurge({
        name: (decl.name as ts.Identifier).text,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        connector: undefined,
        faultConnector: args.length > 1 ? Context.parseTargetFaultArgument(args[1]) : undefined,
        inputAssignments,
        object,
        inputReference,
        storeOutputAutomatically: String(decl.exclamationToken?.kind !== sk.ExclamationToken),
    }) as RecordCreate;
    f.recordCreates.push(prop);
    // console.log(prop);
    return [prop, 'connector'];
}

/* eslint-disable complexity */
export function recordCreateBuild(debug: Debug, s: RecordCreate, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('query'));
    const args: ts.Expression[] = [createStringLiteralX(recordCreateToQuery(s))];
    if (s.faultConnector) args.push(Context.buildTargetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/!s.storeOutputAutomatically ? sf.createToken(sk.ExclamationToken) : undefined,
            /*type*/undefined,
            /*initializer*/lambda)], ts.NodeFlags.Const));
    buildLeadingComment(stmt, s.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    ctx.stmts.push(stmt);
    ctx.build(debug, s.connector);
}

function recordCreateFromQuery(s: string): [inputAssignments: InputAssignment[], object: string, inputReference: string] {
    const [query, action, , ,] = genericFromQuery(s, 'INSERT', 'SET');
    return [
        /*inputAssignments*/action ? action.split(',').map(x => inputAssignmentFromString(x.trim())) : [],
        /*object*/!query.startsWith('$') ? query : undefined,
        /*inputReference*/query.startsWith('$') ? query.substring(1) : undefined];
}

function recordCreateToQuery(s: RecordCreate): string {
    return genericToQuery('INSERT', 'SET',
        /*query*/s.object ?? `$${s.inputReference}`,
        /*action*/s.inputAssignments.length > 0 ? s.inputAssignments.map(x => inputAssignmentToString(x)).join(', ') : undefined,
        /*from*/undefined,
        /*where*/undefined,
        /*limit*/undefined);
}

//#endregion

//#region Decision - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_decision.htm&type=5

export interface DecisionRule {
    name: string;
    conditionLogic: ConditionLogic;
    conditions: Condition[];
    connector?: Connector;
    label: string;
    processMetadataValues: ProcessMetadataValue[];
}

export interface Decision extends Element {
    rules: DecisionRule[];
    defaultConnector?: Connector;
    defaultConnectorLabel: string;
}

export function decisionParse(debug: Debug, f: Flow, s: ts.IfStatement): [obj: Element, field: string] {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [name, locationX, locationY] = parseLocation(location);
    function parseRule(k: ts.IfStatement): DecisionRule {
        const [label2, name2] = parseTrailingComment(k.thenStatement);
        const [conditionLogic, conditions] = conditionsFromExpression(k.expression);
        return {
            name: name2,
            conditionLogic,
            conditions,
            connector: undefined,
            label: label2,
            processMetadataValues: [],
        };
    }

    const rules: DecisionRule[] = [];
    let rule = parseRule(s);
    flowParseBlock(debug, f, s.thenStatement, [rule, 'connector']);
    rules.push(rule);
    let c = s.elseStatement;
    while (c && c.kind === sk.IfStatement) {
        const stmt = s.elseStatement as ts.IfStatement;
        rule = parseRule(stmt);
        flowParseBlock(debug, f, stmt.thenStatement, [rule, 'connector']);
        rules.push(rule);
        c = stmt.elseStatement;
    }
    if (c && c.kind !== sk.Block) throw Error(`decisionParse expected Block '${sk[c.kind]}'`);
    const [label2,] = c ? parseTrailingComment(c) : ['Default Outcome',];
    const prop = objectPurge({
        name,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        rules,
        defaultConnector: undefined,
        defaultConnectorLabel: label2,
    }) as Decision;
    flowParseBlock(debug, f, c, [prop, 'defaultConnector']);
    f.decisions.push(prop);
    // console.log(prop);
    return [prop, 'defaultConnector'];
}

/* eslint-disable complexity */
export function decisionBuild(debug: Debug, s: Decision, ctx: Context): unknown {
    if (ctx.counting) return 1 + Math.max(...s.rules.map(r => ctx.count(r.connector)), ctx.count(s.defaultConnector));

    // create stmt
    const rules: Array<[ts.Expression, DecisionRule]> = s.rules.map(r => [conditionsToExpression(r.conditionLogic, r.conditions), r]);
    let elseStmt = ctx.buildBlock(debug, s.defaultConnector);
    if (elseStmt) buildTrailingComment(elseStmt, s.defaultConnectorLabel, 'default');
    let stmt: ts.IfStatement;
    for (let i = rules.length - 1; i >= 0; i--) {
        const [expr, r] = rules[i];
        const block = ctx.buildBlock(debug, r.connector) ?? sf.createBlock([]);
        buildTrailingComment(block, r.label, r.name);
        stmt = elseStmt = sf.createIfStatement(expr, block, elseStmt);
        if (i === 0) buildLeadingComment(stmt, s.label, buildLocation(s.name, s.locationX, s.locationY), s.description, s.processMetadataValues);
    }
    ctx.stmts.push(stmt);
}

//#endregion

//#region DeleteRecords - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_data_delete.htm&type=5

export interface RecordDelete extends Element {
    assignRecordIdToReference?: string;
    connector?: Connector;
    faultConnector?: Connector;
    inputAssignments: InputAssignment[];
    object: string;
    inputReference?: string;
    storeOutputAutomatically: string;
}

export function recordDeleteParse(debug: Debug, f: Flow, s: ts.VariableStatement, func: ts.CallExpression): [obj: Element, field: string] {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [, locationX, locationY] = parseLocation(location);
    const decl = s.declarationList.declarations[0];
    const args = func.arguments;
    const funcName = (func.expression as ts.PropertyAccessExpression).name.escapedText as string;
    if (funcName !== 'query' && !(args.length >= 1 || args.length <= 2)) throw Error(`bad function '${funcName}(${args.length})'`);
    const [inputAssignments, object, inputReference] = recordDeleteFromQuery((args[0] as ts.StringLiteral).text);
    const prop = objectPurge({
        name: (decl.name as ts.Identifier).text,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        connector: undefined,
        faultConnector: args.length > 1 ? Context.parseTargetFaultArgument(args[1]) : undefined,
        inputAssignments,
        object,
        inputReference,
        storeOutputAutomatically: String(decl.exclamationToken?.kind !== sk.ExclamationToken),
    }) as RecordCreate;
    f.recordCreates.push(prop);
    //console.log(prop);
    return [prop, 'connector'];
}

/* eslint-disable complexity */
export function recordDeleteBuild(debug: Debug, s: RecordDelete, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('query'));
    const args: ts.Expression[] = [createStringLiteralX(recordDeleteToQuery(s))];
    if (s.faultConnector) args.push(Context.buildTargetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/!s.storeOutputAutomatically ? sf.createToken(sk.ExclamationToken) : undefined,
            /*type*/undefined,
            /*initializer*/lambda)], ts.NodeFlags.Const));
    buildLeadingComment(stmt, s.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    ctx.stmts.push(stmt);
    ctx.build(debug, s.connector);
}

function recordDeleteFromQuery(s: string): [inputAssignments: InputAssignment[], object: string, inputReference: string] {
    const [query, action, , ,] = genericFromQuery(s, 'DELETE', 'SET');
    return [
        /*inputAssignments*/action ? action.split(',').map(x => inputAssignmentFromString(x.trim())) : [],
        /*object*/!query.startsWith('$') ? query : undefined,
        /*inputReference*/query.startsWith('$') ? query.substring(1) : undefined];
}

function recordDeleteToQuery(s: RecordDelete): string {
    return genericToQuery('DELETE', 'SET',
        /*query*/s.object ?? `$${s.inputReference}`,
        /*action*/s.inputAssignments.length > 0 ? s.inputAssignments.map(x => inputAssignmentToString(x)).join(', ') : undefined,
        /*from*/undefined,
        /*where*/undefined,
        /*limit*/undefined);
}

//#endregion

//#region EmailAlert - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_emailalert.htm&type=5
//#endregion

//#region GetRecords - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_data_get.htm&type=5

export interface RecordLookup extends Element {
    assignNullValuesIfNoRecordsFound: boolean;
    connector?: Connector;
    faultConnector?: Connector;
    filterLogic?: string;
    filters?: RecordFilter[];
    getFirstRecordOnly?: boolean;
    object: string;
    outputAssignments: OutputAssignment[];
    outputReference?: string;
    queriedFields?: string[];
    storeOutputAutomatically: boolean;
}

export function recordLookupParse(debug: Debug, f: Flow, s: ts.VariableStatement, func: ts.CallExpression): [obj: Element, field: string] {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [, locationX, locationY] = parseLocation(location);
    const decl = s.declarationList.declarations[0];
    const args = func.arguments;
    const funcName = (func.expression as ts.PropertyAccessExpression).name.escapedText as string;
    if (funcName !== 'query' && !(args.length >= 1 || args.length <= 2)) throw Error(`bad function '${funcName}(${args.length})'`);
    const [queriedFields, filterLogic, filters, getFirstRecordOnly, object, outputAssignments, outputReference, assignNullValuesIfNoRecordsFound] = recordLookupFromQuery((args[0] as ts.StringLiteral).text);
    const prop = objectPurge({
        name: (decl.name as ts.Identifier).text,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        assignNullValuesIfNoRecordsFound,
        connector: undefined,
        faultConnector: args.length > 1 ? Context.parseTargetFaultArgument(args[1]) : undefined,
        filterLogic,
        filters,
        getFirstRecordOnly,
        object,
        outputAssignments,
        outputReference,
        queriedFields,
        storeOutputAutomatically: decl.exclamationToken?.kind !== sk.ExclamationToken,
    }) as RecordLookup;
    f.recordLookups.push(prop);
    //console.log(prop);
    return [prop, 'connector'];
}

/* eslint-disable complexity */
export function recordLookupBuild(debug: Debug, s: RecordLookup, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('query'));
    const args: ts.Expression[] = [createStringLiteralX(recordLookupToQuery(s))];
    if (s.faultConnector) args.push(Context.buildTargetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/!s.storeOutputAutomatically ? sf.createToken(sk.ExclamationToken) : undefined,
            /*type*/undefined,
            /*initializer*/lambda)], ts.NodeFlags.Const));
    buildLeadingComment(stmt, s.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    ctx.stmts.push(stmt);
    ctx.build(debug, s.connector);
}

function recordLookupFromQuery(s: string): [queriedFields: string[], filterLogic: string, filters: RecordFilter[], getFirstRecordOnly: boolean, object: string, outputAssignments: OutputAssignment[], outputReference: string, assignNullValuesIfNoRecordsFound: boolean] {
    const [query, action, from, where, limit] = genericFromQuery(s, 'SELECT', 'OUTPUT');
    const [filterLogic, filters] = filterFromQuery(where);
    return [
        /*queriedFields*/query === '*' ? [] : query.split(',').map(x => x.trim()),
        /*filterLogic*/filterLogic,
        /*filters*/filters,
        /*getFirstRecordOnly*/limit === '1',
        /*object*/from?.startsWith('!') ? from.substring(1) : from,
        /*outputAssignments*/action && !action?.startsWith(':') ? action.split(',').map(x => outputAssignmentFromString(x.trim())) : [],
        /*outputReference*/action?.startsWith(':') ? action.substring(1) : undefined,
        /*assignNullValuesIfNoRecordsFound*/from?.startsWith('!')];
}

function recordLookupToQuery(s: RecordLookup): string {
    return genericToQuery('SELECT', 'OUTPUT',
        /*query*/s.queriedFields?.length > 0 ? s.queriedFields.join(', ') : '*',
        /*action*/s.outputAssignments.length > 0 ? s.outputAssignments.map(x => outputAssignmentToString(x)).join(', ')
            : s.outputReference ? `:${s.outputReference}`
                : undefined,
        /*from*/s.assignNullValuesIfNoRecordsFound ? `!${s.object}` : s.object,
        /*where*/filterToQuery(s.filterLogic, s.filters),
        /*limit*/s.getFirstRecordOnly ? '1' : undefined);
}

//#endregion

//#region Loop - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_loop.htm&type=5

export enum LoopIterationOrder {
    Asc = 'Asc',
    Desc = 'Desc',
}

export interface Loop extends Element {
    assignNextValueToReference: string;
    collectionReference: string;
    iterationOrder: LoopIterationOrder;
    nextValueConnector?: Connector;
    noMoreValuesConnector?: Connector;
}

export function loopParse(debug: Debug, f: Flow, s: ts.ForInStatement): [obj: Element, field: string] {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [name, locationX, locationY] = parseLocation(location);
    const collectionReference = (s.initializer as ts.Identifier).text;
    const expr = s.expression as ts.PostfixUnaryExpression;
    const assignNextValueToReference = (expr.operand as ts.Identifier).text;
    const prop = objectPurge({
        name,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        assignNextValueToReference: assignNextValueToReference !== collectionReference ? assignNextValueToReference : '',
        collectionReference,
        iterationOrder: expr.operator === sk.MinusMinusToken ? LoopIterationOrder.Desc : LoopIterationOrder.Asc,
        nextValueConnector: undefined,
        noMoreValuesConnector: undefined,
    }) as Loop;
    flowParseBlock(debug, f, s.statement, [prop, 'nextValueConnector']);
    f.loops.push(prop);
    //console.log(prop);
    return [prop, 'noMoreValuesConnector'];
}

/* eslint-disable complexity */
export function loopBuild(debug: Debug, s: Loop, ctx: Context): unknown {
    if (ctx.counting) return 1 + Math.max(ctx.count(s.nextValueConnector), ctx.count(s.noMoreValuesConnector));

    // create stmt
    const block = ctx.buildBlock(debug, s.nextValueConnector);
    const stmt = sf.createForInStatement(
        /*initializer*/sf.createIdentifier(s.collectionReference),
        /*expression*/sf.createPostfixUnaryExpression(sf.createIdentifier(s.assignNextValueToReference ? s.assignNextValueToReference : s.collectionReference), s.iterationOrder === LoopIterationOrder.Desc ? sk.MinusMinusToken : sk.PlusPlusToken),
        /*statement*/block);
    buildLeadingComment(stmt, s.label, buildLocation(s.name, s.locationX, s.locationY), s.description, s.processMetadataValues);
    ctx.stmts.push(stmt);
    ctx.build(debug, s.noMoreValuesConnector);
}

//#endregion

//#region RecordRollback

export interface RecordRollback extends Element {
    connector?: Connector;
    faultConnector?: Connector;
}

export function recordRollbackParse(debug: Debug, f: Flow, s: ts.VariableStatement, func: ts.CallExpression): [obj: Element, field: string] {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [, locationX, locationY] = parseLocation(location);
    const decl = s.declarationList.declarations[0];
    const args = func.arguments;
    // const funcName = (func.expression as ts.PropertyAccessExpression).name.escapedText as string;
    // if (funcName !== 'rollback' && !(args.length >= 1 || args.length <= 2)) throw Error(`bad function '${funcName}(${args.length})'`);
    const prop = objectPurge({
        name: (decl.name as ts.Identifier).text,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        connector: undefined,
        faultConnector: args.length > 3 ? Context.parseTargetFaultArgument(args[1]) : undefined,
    }) as RecordRollback;
    f.recordRollbacks = prop;
    //console.log(prop);
    return [prop, 'connector'];
}

/* eslint-disable complexity */
export function recordRollbackBuild(debug: Debug, s: RecordRollback, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('rollback'));
    const args: ts.Expression[] = [];
    if (s.faultConnector) args.push(Context.buildTargetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined,
            /*initializer*/lambda)], ts.NodeFlags.Const));
    buildLeadingComment(stmt, s.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    ctx.stmts.push(stmt);
    ctx.build(debug, s.connector);
}

//#endregion

//#region Screen - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_screen.htm&type=5

export enum ScreenFieldType {
    DisplayText,
    ComponentInstance,
    RegionContainer,
    DropdownBox,
    Region,
}

export enum ScreenFieldAssoc {
    Unknown,
    UseStoredValues,
}

export interface ScreenField {
    name: string;
    choiceReferences: string;
    dataType: DataType;
    extensionName: string;
    fieldText: string;
    fieldType: ScreenFieldType;
    fields: ScreenField[];
    inputParameters: InputParameter[];
    inputsOnNextNavToAssocScrn: ScreenFieldAssoc;
    isRequired: boolean;
    visibilityRule: ScreenVisibilityRule[];
    outputParameters: OutputParameter[];
}

export interface ScreenVisibilityRule {
    conditionLogic: ConditionLogic;
    name: string;
    conditions: Condition[];
}

export interface Screen extends Element {
    allowBack: boolean;
    allowFinish: boolean;
    allowPause: boolean;
    connector?: Connector;
    faultConnector?: Connector;
    fields: ScreenField[];
    showFooter: boolean;
    showHeader: boolean;
}

export function screenParse(debug: Debug, f: Flow, s: ts.VariableStatement, func: ts.CallExpression): [obj: Element, field: string] {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [, locationX, locationY] = parseLocation(location);
    const decl = s.declarationList.declarations[0];
    const args = func.arguments;
    // const funcName = (func.expression as ts.PropertyAccessExpression).name.escapedText as string;
    // if (funcName !== 'screen' && !(args.length >= 1 || args.length <= 2)) throw Error(`bad function '${funcName}(${args.length})'`);
    const prop = objectPurge({
        name: (decl.name as ts.Identifier).text,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        connector: undefined,
        faultConnector: args.length > 3 ? Context.parseTargetFaultArgument(args[1]) : undefined,
    }) as Screen;
    f.screens.push(prop);
    //console.log(prop);
    return [prop, 'connector'];
}

/* eslint-disable complexity */
export function screenBuild(debug: Debug, s: Screen, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('screen'));
    const args: ts.Expression[] = [createStringLiteralX('SCREEN')];
    if (s.faultConnector) args.push(Context.buildTargetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined,
            /*initializer*/lambda)], ts.NodeFlags.Const));
    buildLeadingComment(stmt, s.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    ctx.stmts.push(stmt);
    ctx.build(debug, s.connector);
}

//#endregion

//#region Start - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_start.htm&type=5

export interface StartSchedule {
    frequency: string;
    startDate: string;
    startTime: string;
}

export interface Start extends Connectable {
    description: string;
    locationX: number;
    locationY: number;
    connector?: Connector;
    schedule?: StartSchedule;
    filterFormula?: string;
    filterLogic?: string;
    filters: RecordFilter[];
    object?: string;
    recordTriggerType?: string;
    triggerType?: string;
    processMetadataValues: ProcessMetadataValue[];
    build: (debug: Debug, f: Flow, start: Start, processType: FlowProcessType, block: ts.Statement) => ts.ClassElement;
}

export function startParse(debug: Debug, f: Flow, s: ts.MethodDeclaration): void {
    let schedule: StartSchedule;
    let filterFormula: string;
    let filterLogic: string;
    let filters: RecordFilter[];
    let object: string;
    let recordTriggerType: string;
    let triggerType: string;
    let pi = 0;
    if (s.parameters.length > pi && (s.parameters[pi].name as ts.Identifier).text === 'filter') {
        const where = (s.parameters[pi].initializer as ts.StringLiteral).text;
        const [filterLogic1, filters1] = filterFromQuery(where);
        filterLogic = filterLogic1;
        filters = filters1;
        pi++;
    }
    if (s.parameters.length > pi && (s.parameters[pi].name as ts.Identifier).text === 'filterForumla') {
        filterFormula = (s.parameters[pi].initializer as ts.StringLiteral).text;
        pi++;
    }
    const p0 = s.parameters.length > pi + 0 ? s.parameters[pi + 0] : undefined;
    const p1 = s.parameters.length > pi + 1 ? s.parameters[pi + 1] : undefined;
    const name = (s.name as ts.Identifier).text;
    switch (name) {
        case 'orphan': flowParseBlock(debug, f, s.body, undefined); return;
        case 'processBuilder': f.processType = FlowProcessType.CustomEvent; triggerType = undefined; break;
        case 'screen': f.processType = FlowProcessType.Flow; triggerType = undefined; break;
        case 'scheduled': f.processType = FlowProcessType.AutoLaunchedFlow; triggerType = 'Scheduled';
            {
                const [startDate, startTime] = (p0.initializer as ts.StringLiteral).text.split('T');
                schedule = {
                    frequency: (p0.name as ts.Identifier).text,
                    startDate,
                    startTime,
                };
            }
            object = p1 ? (p1.name as ts.Identifier).text : undefined;
            break;
        case 'recordAfterSave': f.processType = FlowProcessType.AutoLaunchedFlow; triggerType = 'RecordAfterSave';
            recordTriggerType = (p0.initializer as ts.StringLiteral).text;
            object = (p0.name as ts.Identifier).text;
            break;
        case 'recordBeforeSave': f.processType = FlowProcessType.AutoLaunchedFlow; triggerType = 'RecordBeforeSave';
            recordTriggerType = (p0.initializer as ts.StringLiteral).text;
            object = (p0.name as ts.Identifier).text;
            break;
        case 'platformEvent': f.processType = FlowProcessType.AutoLaunchedFlow; triggerType = 'PlatformEvent';
            object = (p0.name as ts.Identifier).text;
            break;
        case 'start': f.processType = FlowProcessType.AutoLaunchedFlow; triggerType = undefined; break;
        default: throw Error(`startParse unknown '${name}'`);
    }
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [, locationX, locationY] = parseLocation(location);
    f.label = label;
    if (!f.interviewLabel) f.interviewLabel = f.label + FlowLabelPrefix;
    const method = objectPurge({
        locationX,
        locationY,
        description,
        processMetadataValues,
        connector: undefined,
        schedule,
        filterFormula,
        filterLogic,
        filters: filters ?? [],
        object,
        recordTriggerType,
        triggerType,
    }) as Start;
    f.start = method;
    flowParseBlock(debug, f, s.body, [method, 'connector']);
}

/* eslint-disable complexity */
export function startBuild(debug: Debug, f: Flow, s: Start, processType: FlowProcessType, block: ts.Block): ts.ClassElement {
    const parameters: ts.ParameterDeclaration[] = [];
    if (s.filterLogic) parameters.push(sf.createParameterDeclaration(undefined, undefined, undefined, 'filter', undefined, undefined, createStringLiteralX(filterToQuery(s.filterLogic, s.filters))));
    if (s.filterFormula) parameters.push(sf.createParameterDeclaration(undefined, undefined, undefined, 'filterForumla', undefined, undefined, createStringLiteralX(s.filterFormula)));
    let name: string;
    const key = [processType, processType !== FlowProcessType.Orphan ? s.triggerType : undefined].toString();
    switch (key) {
        case [FlowProcessType.Orphan, undefined].toString(): name = 'orphan'; break;
        case [FlowProcessType.CustomEvent, undefined].toString(): name = 'processBuilder'; break;
        case [FlowProcessType.Flow, undefined].toString(): name = 'screen'; break;
        case [FlowProcessType.AutoLaunchedFlow, 'Scheduled'].toString(): name = 'scheduled';
            parameters.push(sf.createParameterDeclaration(undefined, undefined, undefined, s.schedule.frequency, undefined, undefined, sf.createStringLiteral(`${s.schedule.startDate}T${s.schedule.startTime}`, true)));
            if (s.object) parameters.push(sf.createParameterDeclaration(undefined, undefined, undefined, s.object, undefined, undefined, sf.createStringLiteral(s.recordTriggerType, true)));
            break;
        case [FlowProcessType.AutoLaunchedFlow, 'RecordAfterSave'].toString(): name = 'recordAfterSave';
            parameters.push(sf.createParameterDeclaration(undefined, undefined, undefined, s.object, undefined, undefined, sf.createStringLiteral(s.recordTriggerType, true)));
            break;
        case [FlowProcessType.AutoLaunchedFlow, 'RecordBeforeSave'].toString(): name = 'recordBeforeSave';
            parameters.push(sf.createParameterDeclaration(undefined, undefined, undefined, s.object, undefined, undefined, sf.createStringLiteral(s.recordTriggerType, true)));
            break;
        case [FlowProcessType.AutoLaunchedFlow, 'PlatformEvent'].toString(): name = 'platformEvent';
            parameters.push(sf.createParameterDeclaration(undefined, undefined, undefined, s.object, undefined, undefined, sf.createStringLiteral('record', true)));
            break;
        case [FlowProcessType.AutoLaunchedFlow, undefined].toString(): name = 'start'; break;
        default: throw Error(`Unknown Start ${[processType, s.triggerType].toString()}`);
    }
    const method = sf.createMethodDeclaration(
        /*decorators*/undefined,
        /*modifiers*/undefined,
        /*asteriskToken*/undefined,
        /*name*/sf.createIdentifier(name),
        /*questionToken*/undefined,
        /*typeParameters*/undefined,
        /*parameters*/parameters,
        /*type*/sf.createKeywordTypeNode(sk.VoidKeyword),
        /*body*/block);
    if (processType !== FlowProcessType.Orphan) buildLeadingComment(method, f.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    return method;
}

//#endregion

//#region Subflow - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_subflow.htm&type=5

export interface Subflow extends Element {
    connector?: Connector;
    faultConnector?: Connector;
    flowName: string;
    inputAssignments: InputAssignment[];
    outputAssignments: OutputAssignment[];
}

export function subflowParse(debug: Debug, f: Flow, s: ts.VariableStatement, func: ts.CallExpression): [obj: Element, field: string] {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [, locationX, locationY] = parseLocation(location);
    const decl = s.declarationList.declarations[0];
    const args = func.arguments;
    const funcName = (func.expression as ts.PropertyAccessExpression).name.escapedText as string;
    if (funcName !== 'query' && !(args.length >= 1 || args.length <= 2)) throw Error(`bad function '${funcName}(${args.length})'`);
    const prop = objectPurge({
        name: (decl.name as ts.Identifier).text,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        connector: undefined,
        faultConnector: args.length > 3 ? Context.parseTargetFaultArgument(args[1]) : undefined,
        flowName: (args[0] as ts.StringLiteral).text,
        // inputAssignments: (args[1] as ts.StringLiteral).text,
        // outputAssignments: (args[2] as ts.StringLiteral).text,
    }) as Subflow;
    f.subflows.push(prop);
    //console.log(prop);
    return [prop, 'connector'];
}

/* eslint-disable complexity */
export function subflowBuild(debug: Debug, s: Subflow, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('subflow'));
    const args: ts.Expression[] = [createStringLiteralX(s.flowName)];
    // args.push(s.inputAssignments ? sf.createNodeArray(s.inputAssignments.map(x => createStringLiteralX(inputAssignmentToString(x)))) : sf.createNull());
    // args.push(s.outputAssignments ? sf.createNodeArray(s.outputAssignments.map(x => createStringLiteralX(outputAssignmentToString(x)))) : sf.createNull());
    if (s.faultConnector) args.push(Context.buildTargetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined,
            /*initializer*/lambda)], ts.NodeFlags.Const));
    buildLeadingComment(stmt, s.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    ctx.stmts.push(stmt);
    ctx.build(debug, s.connector);
}

//#endregion

//#region UpdateRecords - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_data_update.htm&type=5

export interface RecordUpdate extends Element {
    connector?: Connector;
    faultConnector?: Connector;
    filterLogic: string;
    filters: RecordFilter[];
    inputAssignments: InputAssignment[];
    object: string;
    inputReference?: string;
}

export function recordUpdateParse(debug: Debug, f: Flow, s: ts.VariableStatement, func: ts.CallExpression): [obj: Element, field: string] {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [, locationX, locationY] = parseLocation(location);
    const decl = s.declarationList.declarations[0];
    const args = func.arguments;
    const funcName = (func.expression as ts.PropertyAccessExpression).name.escapedText as string;
    if (funcName !== 'query' && !(args.length >= 1 || args.length <= 2)) throw Error(`bad function '${funcName}(${args.length})'`);
    const [filterLogic, filters, inputAssignments, object, inputReference] = recordUpdateFromQuery((args[0] as ts.StringLiteral).text);
    const prop = objectPurge({
        name: (decl.name as ts.Identifier).text,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        connector: undefined,
        faultConnector: args.length > 1 ? Context.parseTargetFaultArgument(args[1]) : undefined,
        filterLogic,
        filters,
        inputAssignments,
        object,
        inputReference,
    }) as RecordUpdate;
    f.recordUpdates.push(prop);
    //console.log(prop);
    return [prop, 'connector'];
}

/* eslint-disable complexity */
export function recordUpdateBuild(debug: Debug, s: RecordUpdate, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('query'));
    const args: ts.Expression[] = [createStringLiteralX(recordUpdateToQuery(s))];
    if (s.faultConnector) args.push(Context.buildTargetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined,
            /*initializer*/lambda)], ts.NodeFlags.Const));
    buildLeadingComment(stmt, s.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    ctx.stmts.push(stmt);
    ctx.build(debug, s.connector);
}

function recordUpdateFromQuery(s: string): [filterLogic: string, filters: RecordFilter[], inputAssignments: InputAssignment[], object: string, inputReference: string] {
    const [query, action, , where,] = genericFromQuery(s, 'UPDATE', 'SET');
    const [filterLogic, filters] = filterFromQuery(where);
    return [
        /*filterLogic*/filterLogic,
        /*filters*/filters ?? [],
        /*inputAssignments*/action ? action.split(',').map(x => inputAssignmentFromString(x.trim())) : [],
        /*object*/!query.startsWith('$') ? query : undefined,
        /*inputReference*/query.startsWith('$') ? query : undefined];
}

function recordUpdateToQuery(s: RecordUpdate): string {
    return genericToQuery('UPDATE', 'SET',
        /*query*/s.object ?? `${s.inputReference}`,
        /*action*/s.inputAssignments.length > 0 ? s.inputAssignments.map(x => inputAssignmentToString(x)).join(', ') : undefined,
        /*from*/undefined,
        /*where*/filterToQuery(s.filterLogic, s.filters),
        /*limit*/undefined);
}

//#endregion
