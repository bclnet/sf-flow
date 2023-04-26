/* eslint-disable @typescript-eslint/ban-types */
import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
import { toPascalCase } from '../utils';
import { FlowProcessType } from './flow';
import {
    Context,
    Connector,
    ProcessMetadataValue,
    DataType, Value,
    InputParameter, inputAssignmentToString, OutputParameter,
    InputAssignment, OutputAssignment
} from './flowCommon';
import {
    ConditionLogic, Condition, conditionsToExpression,
    RecordFilter, recordFilterToString
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
    connector: Connector;
    faultConnector?: Connector;
    inputParameters: InputParameter[];
    outputParameters: OutputParameter[];
    storeOutputAutomatically?: boolean;
}

export function actionCallParse(s: ts.Node): ActionCall {
}

/* eslint-disable complexity */
export function actionCallBuild(s: ActionCall, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('action'));
    const args: ts.Expression[] = [sf.createStringLiteral(actionCallToQuery(s), false)];
    if (s.faultConnector) args.push(Context.targetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined,
            /*initializer*/lambda)], ts.NodeFlags.Const));
    if (s.description) ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.description}`, true);
    ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.label} [${s.locationX}, ${s.locationY}]`, true);
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
    connector: Connector;
    faultConnector?: Connector;
}

export function apexPluginCallParse(s: ts.Node): ApexPluginCall {
}

/* eslint-disable complexity */
export function apexPluginCallBuild(s: ApexPluginCall, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('apexPlugin'));
    const args: ts.Expression[] = [sf.createStringLiteral(apexPluginCallToQuery(s), false)];
    if (s.faultConnector) args.push(Context.targetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
                /*name*/sf.createIdentifier(s.name),
                /*exclamationToken*/undefined,
                /*type*/undefined,
                /*initializer*/lambda)], ts.NodeFlags.Const));
    if (s.description) ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.description}`, true);
    ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.label} [${s.locationX}, ${s.locationY}]`, true);
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
    connector: Connector;
    faultConnector?: Connector;
}

export function assignmentParse(s: ts.Node): Assignment {
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
    // if (s.description) ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.description}`, true);
    // ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.label} [${s.locationX}, ${s.locationY}]`, true);
    // ctx.stmts.push(stmt);
    ctx.build(s.connector);
}

//#endregion

//#region CreateRecord - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_data_create.htm&type=5

export interface RecordCreate extends Element {
    actionType?: string;
    assignRecordIdToReference?: string;
    connector: Connector;
    faultConnector?: Connector;
    inputAssignments: InputAssignment[];
    inputReference?: string;
    object: string;
    storeOutputAutomatically?: boolean;
}

export function recordCreateParse(s: ts.Node): RecordCreate {
}

/* eslint-disable complexity */
export function recordCreateBuild(s: RecordCreate, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('insert'));
    const args: ts.Expression[] = [sf.createStringLiteral(recordCreateToQuery(s), false)];
    if (s.faultConnector) args.push(Context.targetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined,
            /*initializer*/lambda)], ts.NodeFlags.Const));
    if (s.description) ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.description}`, true);
    ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.label} [${s.locationX}, ${s.locationY}]`, true);
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
    connector: Connector;
    label: string;
    processMetadataValues: ProcessMetadataValue[];
}

export interface Decision extends Element {
    rules: DecisionRule[];
    defaultConnector: Connector;
    defaultConnectorLabel: string;
}

export function decisionParse(s: ts.Node): Decision {
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
        if (i === 0) {
            if (s.description) ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.description}`, true);
            ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.label} [${s.locationX}, ${s.locationY}]`, true);
        }
    }
    ctx.stmts.push(stmt);
}

//#endregion

//#region DeleteRecords - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_data_delete.htm&type=5

export interface RecordDelete extends Element {
    connector: Connector;
    faultConnector?: Connector;
}

export function recordDeleteParse(s: ts.Node): RecordDelete {
}

/* eslint-disable complexity */
export function recordDeleteBuild(s: RecordDelete, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('delete'));
    const args: ts.Expression[] = [sf.createStringLiteral(recordDeleteToQuery(s), false)];
    if (s.faultConnector) args.push(Context.targetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined, //sf.createTypeReferenceNode('RecordUpdate'),
            /*initializer*/lambda)], ts.NodeFlags.Const));
    if (s.description) ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.description}`, true);
    ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.label} [${s.locationX}, ${s.locationY}]`, true);
    ctx.stmts.push(stmt);
    ctx.build(s.connector);
}

function recordDeleteFromQuery(s: string) {
}

function recordDeleteToQuery(s: RecordDelete): string {
    const b = ['DELETE'];
    // b.push(` ${(s.queriedFields?.length > 0 ? s.queriedFields.join(', ') : '*')}`);
    // b.push(` FROM ${s.object}`);
    // switch (s.filterLogic) {
    //     case null: break;
    //     case 'and': case 'or': b.push(` WHERE ${s.filters.map(x => recordFilterToString(x)).join(` ${s.filterLogic}`)}`); break;
    //     default: b.push(` WHERE ${s.filterLogic}`); break;
    // }
    return b.join('');
}

//#endregion

//#region EmailAlert - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_emailalert.htm&type=5
//#endregion

//#region GetRecords - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_data_get.htm&type=5

export interface RecordLookup extends Element {
    assignNullValuesIfNoRecordsFound?: boolean;
    connector: Connector;
    faultConnector?: Connector;
    filterLogic?: string;
    filters?: RecordFilter[];
    getFirstRecordOnly?: boolean;
    object?: string;
    outputAssignments?: OutputAssignment[];
    outputReference?: string;
    queriedFields?: string[];
    storeOutputAutomatically?: boolean;
}

export function recordLookupParse(s: ts.Node): RecordLookup {
}

/* eslint-disable complexity */
export function recordLookupBuild(s: RecordLookup, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('query'));
    const args: ts.Expression[] = [sf.createStringLiteral(recordLookupToQuery(s), false)];
    if (s.faultConnector) args.push(Context.targetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined, //sf.createTypeReferenceNode('RecordLookup'),
            /*initializer*/lambda)], ts.NodeFlags.Const));
    if (s.description) ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.description}`, true);
    ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.label} [${s.locationX}, ${s.locationY}]`, true);
    ctx.stmts.push(stmt);
    ctx.build(s.connector);
}

function recordLookupFromQuery(s: string) {
}

function recordLookupToQuery(s: RecordLookup): string {
    const b = ['SELECT'];
    b.push(` ${(s.queriedFields?.length > 0 ? s.queriedFields.join(', ') : '*')}`);
    b.push(` FROM ${s.object}`);
    switch (s.filterLogic) {
        case null: break;
        case 'and': case 'or': b.push(` WHERE ${s.filters.map(x => recordFilterToString(x)).join(` ${toPascalCase(s.filterLogic)} `)}`); break;
        default: b.push(` WHERE ${s.filterLogic}`); break;
    }
    if (s.getFirstRecordOnly) b.push(' LIMIT 1');
    return b.join('');
}

//#endregion

//#region Loop - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_loop.htm&type=5

export enum LoopIterationOrder { Asc, Desc }

export interface Loop extends Element {
    assignNextValueToReference?: string;
    collectionReference?: string;
    iterationOrder: LoopIterationOrder;
    nextValueConnector?: Connector;
    noMoreValuesConnector: Connector;
}

export function loopParse(s: ts.Node): Loop {
}

/* eslint-disable complexity */
export function loopBuild(s: Loop, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.noMoreValuesConnector);
    ctx.build(s.noMoreValuesConnector);
}

//#endregion

//#region RecordRollback

export interface RecordRollback extends Element {
    connector: Connector;
    faultConnector?: Connector;
}

export function recordRollbackParse(s: ts.Node): RecordRollback {
}

/* eslint-disable complexity */
export function recordRollbackBuild(s: RecordRollback, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('rollback'));
    const args: ts.Expression[] = [];
    if (s.faultConnector) args.push(Context.targetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined, //sf.createTypeReferenceNode('Rollback'),
            /*initializer*/lambda)], ts.NodeFlags.Const));
    if (s.description) ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.description}`, true);
    ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.label} [${s.locationX}, ${s.locationY}]`, true);
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
    connector: Connector;
    faultConnector?: Connector;
    fields: ScreenField[];
    showFooter: boolean;
    showHeader: boolean;
}

export function screenParse(s: ts.Node): Screen {
}

/* eslint-disable complexity */
export function screenBuild(s: Screen, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('screen'));
    const args: ts.Expression[] = [sf.createStringLiteral('SCREEN', true)];
    if (s.faultConnector) args.push(Context.targetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined, //sf.createTypeReferenceNode('Screen'),
            /*initializer*/lambda)], ts.NodeFlags.Const));
    if (s.description) ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.description}`, true);
    ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.label} [${s.locationX}, ${s.locationY}]`, true);
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
    connector: Connector;
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

export function startParse(s: ts.Node): Start {
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
    connector: Connector;
    faultConnector?: Connector;
    flowName: string;
    inputAssignments: InputAssignment[];
    outputAssignments: OutputAssignment[];
}

export function subflowParse(s: ts.Node): Subflow {
}

/* eslint-disable complexity */
export function subflowBuild(s: Subflow, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('subflow'));
    const args: ts.Expression[] = [sf.createStringLiteral(s.flowName, true)];
    if (s.faultConnector) args.push(Context.targetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined, //sf.createTypeReferenceNode('Subflow'),
            /*initializer*/lambda)], ts.NodeFlags.Const));
    if (s.description) ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.description}`, true);
    ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.label} [${s.locationX}, ${s.locationY}]`, true);
    ctx.stmts.push(stmt);
    ctx.build(s.connector);
}

//#endregion

//#region UpdateRecords - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_data_update.htm&type=5

export interface RecordUpdate extends Element {
    actionType?: string;
    connector: Connector;
    faultConnector?: Connector;
    filterLogic: string;
    filters: RecordFilter[];
    inputAssignments: InputAssignment[];
    object: string;
    inputReference?: string;
}

export function recordUpdateParse(s: ts.Node): RecordUpdate {
}

/* eslint-disable complexity */
export function recordUpdateBuild(s: RecordUpdate, ctx: Context): unknown {
    if (ctx.counting) return 1 + ctx.count(s.connector);

    // create stmt
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('update'));
    const args: ts.Expression[] = [sf.createStringLiteral(recordUpdateToQuery(s), false)];
    if (s.inputReference) args.push(sf.createStringLiteral(s.inputReference, true));
    if (s.faultConnector) args.push(Context.targetFaultArgument(s.faultConnector));
    const lambda = sf.createCallExpression(method, undefined, args);
    const stmt = sf.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        sf.createVariableDeclaration(
            /*name*/sf.createIdentifier(s.name),
            /*exclamationToken*/undefined,
            /*type*/undefined, //sf.createTypeReferenceNode('RecordUpdate'),
            /*initializer*/lambda)], ts.NodeFlags.Const));
    if (s.description) ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.description}`, true);
    ts.addSyntheticLeadingComment(stmt, sk.SingleLineCommentTrivia, ` ${s.label} [${s.locationX}, ${s.locationY}]`, true);
    ctx.stmts.push(stmt);
    ctx.build(s.connector);
}

function recordUpdateFromQuery(s: string) {
}

function recordUpdateToQuery(s: RecordUpdate): string {
    const b = ['UPDATE'];
    b.push(` ${s.object ?? `:${s.inputReference}`}`);
    b.push(` SET ${s.inputAssignments.map(x => inputAssignmentToString(x)).join()}`);
    switch (s.filterLogic) {
        case null: break;
        case 'and': case 'or': b.push(` WHERE ${s.filters.map(x => recordFilterToString(x)).join(` ${toPascalCase(s.filterLogic)} `)}`); break;
        default: b.push(` WHERE ${s.filterLogic}`); break;
    }
    return b.join('');
}

//#endregion
