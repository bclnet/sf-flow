/* eslint-disable @typescript-eslint/ban-types */
import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
import { objectPurge } from '../utils';
import { Flow, FlowProcessType } from './flow';
import {
    createStringLiteralX, buildLocation, parseLocation, getTrailingComments, parseLeadingComment, buildLeadingComment,
    genericFromQuery, genericToQuery,
    DataType, Value,
    Context,
    Connector,
    ProcessMetadataValue,
    InputParameter, OutputParameter,
    InputAssignment, inputAssignmentFromString, inputAssignmentToString, OutputAssignment, outputAssignmentToString
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
    build: Function;
}

//#region ApexAction - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_apex_invocable.htm&type=5

export interface ActionCall extends Element {
    actionName: string;
    actionType: string;
    connector?: Connector;
    faultConnector?: Connector;
    inputParameters: InputParameter[];
    outputParameters: OutputParameter[];
    storeOutputAutomatically?: boolean;
}

export function actionCallParse(f: Flow, s: ts.VariableStatement, func: ts.CallExpression, connector: Connector): void {
}

/* eslint-disable complexity */
export function actionCallBuild(s: ActionCall, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('query'));
    const args: ts.Expression[] = [createStringLiteralX(actionCallToQuery(s))];
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
    ctx.build(s.connector);
}

function actionCallFromQuery(s: string) {
}

function actionCallToQuery(s: ActionCall): string {
    const b = ['ACTION'];
    return b.join('');
}

//#endregion

//#region ApexPluginCall

export interface ApexPluginCall extends Element {
    connector?: Connector;
    faultConnector?: Connector;
}

export function apexPluginCallParse(f: Flow, s: ts.VariableStatement, func: ts.CallExpression, connector: Connector): void {
}

/* eslint-disable complexity */
export function apexPluginCallBuild(s: ApexPluginCall, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('query'));
    const args: ts.Expression[] = [createStringLiteralX(apexPluginCallToQuery(s))];
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
    ctx.build(s.connector);
}

function apexPluginCallFromQuery(s: string) {
}

function apexPluginCallToQuery(s: ApexPluginCall): string {
    const b = ['APEX'];
    return b.join('');
}

//#endregion

//#region Assignment - https://help.salesforce.com/s/articleView?language=en_US&id=sf.flow_ref_elements_assignment.htm&type=5

export enum AssignmentOperator {
    Assign,
    AssignCount,
    Add,
    RemoveAfterFirst,
    AddAtStart,
    RemoveAll,
    RemoveFirst,
    RemoveBeforeFirst,
    RemovePosition,
    RemoveUncommon,
}

export interface AssignmentItem {
    assignToReference: string;
    operator: AssignmentOperator;
    value: Value;
}

export interface Assignment extends Element {
    assignmentItems: AssignmentItem[];
    connector?: Connector;
    faultConnector?: Connector;
}

export function assignmentParse(f: Flow, s: ts.VariableStatement): void {
}

/* eslint-disable complexity */
export function assignmentBuild(s: Assignment, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    // const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('apexPlugin'));
    // const args: ts.Expression[] = [sf.createStringLiteral(apexPluginCallToQuery(s), false)];
    // if (s.faultConnector) args.push(Context.targetFaultArgument(s.faultConnector));
    // const lambda = sf.createCallExpression(method, undefined, args);
    // const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
    //     sf.createVariableDeclaration(
    //             /*name*/sf.createIdentifier(s.name),
    //             /*exclamationToken*/undefined,
    //             /*type*/undefined,
    //             /*initializer*/lambda)], ts.NodeFlags.Const));
    // buildLeadingComment(stmt, s.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    // ctx.stmts.push(stmt);
    ctx.build(s.connector);
}

//#endregion

//#region CreateRecord - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_data_create.htm&type=5

export interface RecordCreate extends Element {
    actionType?: string;
    assignRecordIdToReference?: string;
    connector?: Connector;
    faultConnector?: Connector;
    inputAssignments: InputAssignment[];
    inputReference?: string;
    object: string;
    storeOutputAutomatically?: boolean;
}

export function recordCreateParse(f: Flow, s: ts.VariableStatement, func: ts.CallExpression, connector: Connector): void {
}

/* eslint-disable complexity */
export function recordCreateBuild(s: RecordCreate, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('query'));
    const args: ts.Expression[] = [createStringLiteralX(recordCreateToQuery(s))];
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
    ctx.build(s.connector);
}

function recordCreateFromQuery(s: string) {
}

function recordCreateToQuery(s: ApexPluginCall): string {
    const b = ['INSERT'];
    return b.join('');
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

export function decisionParse(f: Flow, s: ts.IfStatement, connector: Connector): void {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [name, locationX, locationY] = parseLocation(location);
    function parseRule(k: ts.IfStatement): DecisionRule {
        //console.log(k.thenStatement.getFullText());
        console.log(getTrailingComments(k.thenStatement));
        const [conditionLogic, conditions] = conditionsFromExpression(k.expression);
        return {
            name: '',
            conditionLogic,
            conditions,
            connector: undefined,
            label: undefined,
            processMetadataValues: [],
        } as DecisionRule;
    }

    const rules: DecisionRule[] = [];
    rules.push(parseRule(s));
    let c = s.elseStatement as ts.IfStatement;
    while (c.kind === sk.IfStatement) {
        rules.push(parseRule(c));
        c = c.elseStatement as ts.IfStatement;
    }
    //console.log(rules);

    //console.log(s.elseStatement);
    const prop = objectPurge({
        name,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        rules,
        defaultConnector: connector,
        defaultConnectorLabel: '',
    }) as Decision;
    f.decisions.push(prop);
    //console.log(prop);
}

/* eslint-disable complexity */
export function decisionBuild(s: Decision, ctx: Context): unknown {
    if (ctx.counting) return 1 + Math.max(...s.rules.map(r => ctx.count(r.connector)), ctx.count(s.defaultConnector));

    // create stmt
    const rules: Array<[ts.Expression, DecisionRule]> = s.rules.map(r => [conditionsToExpression(r.conditionLogic, r.conditions), r]);
    let elseStmt = ctx.buildBlock(s.defaultConnector);
    if (elseStmt) ts.addSyntheticTrailingComment(elseStmt, sk.SingleLineCommentTrivia, ` ${s.defaultConnectorLabel} [default]`, true);
    let stmt: ts.IfStatement;
    for (let i = rules.length - 1; i >= 0; i--) {
        const [expr, r] = rules[i];
        const block = ctx.buildBlock(r.connector) ?? sf.createBlock([]);
        ts.addSyntheticTrailingComment(block, sk.SingleLineCommentTrivia, ` ${r.label} [${r.name}]`, true);
        stmt = elseStmt = sf.createIfStatement(expr, block, elseStmt);
        if (i === 0) buildLeadingComment(stmt, s.label, buildLocation(s.name, s.locationX, s.locationY), s.description, s.processMetadataValues);
    }
    ctx.stmts.push(stmt);
}

//#endregion

//#region DeleteRecords - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_data_delete.htm&type=5

export interface RecordDelete extends Element {
    connector: Connector;
    faultConnector?: Connector;
}

export function recordDeleteParse(f: Flow, s: ts.VariableStatement, func: ts.CallExpression, connector: Connector): void {
}

/* eslint-disable complexity */
export function recordDeleteBuild(s: RecordDelete, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('query'));
    const args: ts.Expression[] = [createStringLiteralX(recordDeleteToQuery(s))];
    if (s.faultConnector) args.push(Context.buildTargetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined, //sf.createTypeReferenceNode('RecordUpdate'),
            /*initializer*/lambda)], ts.NodeFlags.Const));
    buildLeadingComment(stmt, s.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    ctx.stmts.push(stmt);
    ctx.build(s.connector);
}

function recordDeleteFromQuery(s: string) {
}

function recordDeleteToQuery(s: RecordDelete): string {
    const b = ['DELETE'];
    // b.push(` ${(s.queriedFields?.length > 0 ? s.queriedFields.join(', ') : '*')}`);
    // b.push(` FROM ${s.object}`);
    //b.push(filterToQuery(s.filterLogic, s.filters));
    return b.join('');
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

export function recordLookupParse(f: Flow, s: ts.VariableStatement, func: ts.CallExpression, connector: Connector): void {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [, locationX, locationY] = parseLocation(location);
    const decl = s.declarationList.declarations[0];
    const args = func.arguments;
    const funcName = (func.expression as ts.PropertyAccessExpression).name.escapedText as string;
    if (funcName !== 'query' && !(args.length >= 1 || args.length <= 2)) throw Error(`bad function '${funcName}(${args.length})'`);
    const [queriedFields, filterLogic, filters, getFirstRecordOnly, object, outputAssignments, outputReference, storeOutputAutomatically] = recordLookupFromQuery((args[0] as ts.StringLiteral).text);
    const prop = objectPurge({
        name: (decl.name as ts.Identifier).text,
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        assignNullValuesIfNoRecordsFound: decl.exclamationToken?.kind === sk.ExclamationToken,
        connector,
        faultConnector: args.length > 1 ? Context.parseTargetFaultArgument(s) : undefined,
        filterLogic,
        filters,
        getFirstRecordOnly,
        object,
        outputAssignments,
        outputReference,
        queriedFields,
        storeOutputAutomatically,
    }) as RecordLookup;
    f.recordLookups.push(prop);
    //console.log(prop);
}

/* eslint-disable complexity */
export function recordLookupBuild(s: RecordLookup, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('query'));
    const args: ts.Expression[] = [createStringLiteralX(recordLookupToQuery(s))];
    if (s.faultConnector) args.push(Context.buildTargetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/s.assignNullValuesIfNoRecordsFound ? sf.createToken(sk.ExclamationToken) : undefined,
            /*type*/undefined,
            /*initializer*/lambda)], ts.NodeFlags.Const));
    buildLeadingComment(stmt, s.label, buildLocation(null, s.locationX, s.locationY), s.description, s.processMetadataValues);
    ctx.stmts.push(stmt);
    ctx.build(s.connector);
}

function recordLookupFromQuery(s: string): [queriedFields: string[], filterLogic: string, filters: RecordFilter[], getFirstRecordOnly: boolean, object: string, outputAssignments: OutputAssignment[], outputReference: string, storeOutputAutomatically: boolean] {
    const [query, action, from, where, limit] = genericFromQuery(s, 'SELECT', 'OUTPUT');
    const [filterLogic, filters] = filterFromQuery(where);
    return [
        /*queriedFields*/query === '*' ? undefined : query.split(',').map(x => x.trim()),
        /*filterLogic*/filterLogic,
        /*filters*/filters,
        /*getFirstRecordOnly*/limit !== '1',
        /*object*/from,
        /*outputAssignments*/action && !action?.startsWith(':') ? undefined : undefined,
        /*outputReference*/action?.startsWith(':') ? action.substring(1) : undefined,
        /*storeOutputAutomatically*/false];
}

function recordLookupToQuery(s: RecordLookup): string {
    return genericToQuery('SELECT', 'OUTPUT',
        /*query*/s.queriedFields?.length > 0 ? s.queriedFields.join(', ') : '*',
        /*action*/s.outputAssignments.length > 0 ? s.outputAssignments.map(x => outputAssignmentToString(x)).join(', ')
            : s.outputReference ? `:${s.outputReference}`
                : undefined,
        /*from*/s.object,
        /*where*/filterToQuery(s.filterLogic, s.filters),
        /*limit*/s.getFirstRecordOnly ? '1' : undefined);
}

//#endregion

//#region Loop - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_loop.htm&type=5

export enum LoopIterationOrder { Asc, Desc }

export interface Loop extends Element {
    assignNextValueToReference?: string;
    collectionReference?: string;
    iterationOrder: LoopIterationOrder;
    nextValueConnector?: Connector;
    noMoreValuesConnector?: Connector;
}

export function loopParse(f: Flow, s: ts.ForStatement): void {
}

/* eslint-disable complexity */
export function loopBuild(s: Loop, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.noMoreValuesConnector);
    ctx.build(s.noMoreValuesConnector);
}

//#endregion

//#region RecordRollback

export interface RecordRollback extends Element {
    connector?: Connector;
    faultConnector?: Connector;
}

export function recordRollbackParse(f: Flow, s: ts.CallExpression): void {
}

/* eslint-disable complexity */
export function recordRollbackBuild(s: RecordRollback, ctx: Context): unknown {
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
    ctx.build(s.connector);
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

export function screenParse(f: Flow, s: ts.VariableStatement, func: ts.CallExpression, connector: Connector): void {
}

/* eslint-disable complexity */
export function screenBuild(s: Screen, ctx: Context): unknown {
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
    ctx.build(s.connector);
}

//#endregion

//#region Start - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_start.htm&type=5

export interface StartSchedule {
    frequency: string;
    startDate: string;
    startTime: string;
}

export interface Start {
    description: string;
    locationX: number;
    locationY: number;
    connector?: Connector;
    schedule?: StartSchedule;
    filterFormula?: string;
    object?: string;
    recordTriggerType?: string;
    triggerType?: string;
    processMetadataValues: ProcessMetadataValue[];
    filterLogic?: string;
    filters: RecordFilter[];
    build: Function;
}

export function startParse(f: Flow, s: ts.MethodDeclaration, parseChild: (s: ts.Node) => void): void {
    const [label, location, description, processMetadataValues] = parseLeadingComment(s);
    const [, locationX, locationY] = parseLocation(location);
    const name = (s.name as ts.Identifier).text;
    let triggerType: string;
    switch (name) {
        case 'orphan': break;
        case 'processBuilder': f.processType = FlowProcessType.CustomEvent; triggerType = undefined; break;
        case 'screen': f.processType = FlowProcessType.Flow; triggerType = undefined; break;
        case 'scheduled': f.processType = FlowProcessType.AutoLaunchedFlow; triggerType = 'Scheduled'; break;
        case 'recordAfterSave': f.processType = FlowProcessType.AutoLaunchedFlow; triggerType = 'RecordAfterSave'; break;
        case 'recordBeforeSave': f.processType = FlowProcessType.AutoLaunchedFlow; triggerType = 'RecordBeforeSave'; break;
        case 'platformEvent': f.processType = FlowProcessType.AutoLaunchedFlow; triggerType = 'PlatformEvent'; break;
        case 'start': f.processType = FlowProcessType.AutoLaunchedFlow; triggerType = undefined; break;
        default: throw Error(`Unknown Start ${name}`);
    }
    const method = objectPurge({
        label,
        locationX,
        locationY,
        description,
        processMetadataValues,
        connector: undefined,
        triggerType,
    }) as Start;
    f.start = method;
    s.body?.forEachChild(parseChild);
}

/* eslint-disable complexity */
export function startBuild(s: Start, processType: FlowProcessType, block: ts.Block): ts.ClassElement {
    let name: string;
    switch ([processType, s.triggerType].toString()) {
        case [FlowProcessType.Orphan, undefined].toString(): name = 'orphan'; break;
        case [FlowProcessType.CustomEvent, undefined].toString(): name = 'processBuilder'; break;
        case [FlowProcessType.Flow, undefined].toString(): name = 'screen'; break;
        case [FlowProcessType.AutoLaunchedFlow, 'Scheduled'].toString(): name = 'scheduled'; break;
        case [FlowProcessType.AutoLaunchedFlow, 'RecordAfterSave'].toString(): name = 'recordAfterSave'; break;
        case [FlowProcessType.AutoLaunchedFlow, 'RecordBeforeSave'].toString(): name = 'recordBeforeSave'; break;
        case [FlowProcessType.AutoLaunchedFlow, 'PlatformEvent'].toString(): name = 'platformEvent'; break;
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
        /*parameters*/undefined,
        /*type*/sf.createKeywordTypeNode(sk.VoidKeyword),
        /*body*/block);
    if (processType !== FlowProcessType.Orphan) ts.addSyntheticLeadingComment(method, sk.SingleLineCommentTrivia, ` ${s.description ? `${s.description} ` : ''}[${s.locationX}, ${s.locationY}]`, true);
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

export function subflowParse(f: Flow, s: ts.VariableStatement, func: ts.CallExpression, connector: Connector): void {
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
        connector,
        faultConnector: args.length > 3 ? Context.parseTargetFaultArgument(s) : undefined,
        flowName: (args[0] as ts.StringLiteral).text,
        // inputAssignments: (args[1] as ts.StringLiteral).text,
        // outputAssignments: (args[2] as ts.StringLiteral).text,
    }) as Subflow;
    f.subflows.push(prop);
    //console.log(prop);
}

/* eslint-disable complexity */
export function subflowBuild(s: Subflow, ctx: Context): unknown {
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
    ctx.build(s.connector);
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

export function recordUpdateParse(f: Flow, s: ts.VariableStatement, func: ts.CallExpression, connector: Connector): void {
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
        connector,
        faultConnector: args.length > 1 ? Context.parseTargetFaultArgument(s) : undefined,
        filterLogic,
        filters,
        inputAssignments,
        object,
        inputReference,
    }) as RecordUpdate;
    f.recordUpdates.push(prop);
    //console.log(prop);
}

/* eslint-disable complexity */
export function recordUpdateBuild(s: RecordUpdate, ctx: Context): unknown {
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
    ctx.build(s.connector);
}

function recordUpdateFromQuery(s: string): [filterLogic: string, filters: RecordFilter[], inputAssignments: InputAssignment[], object: string, inputReference: string] {
    const [query, action, , where,] = genericFromQuery(s, 'UPDATE', 'SET');
    const [filterLogic, filters] = filterFromQuery(where);
    return [
        /*filterLogic*/filterLogic,
        /*filters*/filters,
        /*inputAssignments*/action ? action.split(', ').map(x => inputAssignmentFromString(x)) : undefined,
        /*object*/!query.startsWith('$') ? s : undefined,
        /*inputReference*/query.startsWith('$') ? query.substring(1) : undefined];
}

function recordUpdateToQuery(s: RecordUpdate): string {
    return genericToQuery('UPDATE', 'SET',
        /*query*/s.object ?? `$${s.inputReference}`,
        /*action*/s.inputAssignments.length > 0 ? s.inputAssignments.map(x => inputAssignmentToString(x)).join(', ') : undefined,
        /*from*/undefined,
        /*where*/filterToQuery(s.filterLogic, s.filters),
        /*limit*/undefined);
}

//#endregion
