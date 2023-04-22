/* eslint-disable @typescript-eslint/ban-types */
import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
import { Connector, ProcessMetadataValue, DataType, Value, InputParameter, OutputParameter, InputAssignment, OutputAssignment } from './flowCommon';
import { ConditionLogic, Condition, RecordFilter } from './flowOperators';

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
export function actionCallBuild(s: ActionCall) {
}

export interface ApexPluginCall extends Element {
}

export function apexPluginCallParse(s: ts.Node): ApexPluginCall {
}

/* eslint-disable complexity */
export function apexPluginCallBuild(s: ApexPluginCall) {
}

// export function hasActionCall(arg: any): arg is ActionCall {
//     return !(arg.actionType === 'recordUpdate' || arg.actionType === 'recordCreate');
// }

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
export function assignmentBuild(s: Assignment) {
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
export function recordCreateBuild(s: RecordCreate) {
}

// export function hasRecordCreate(arg: any): arg is RecordCreate {
//     return arg.actionType === 'recordCreate';
// }

//#endregion

//#region Decision - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_decision.htm&type=5

export interface DecisionRule {
    name: string;
    conditionLogic: AssignmentOperator;
    conditions: AssignmentOperator;
    connector: Connector;
    label: string;
}

export interface Decision extends Element {
    rules: DecisionRule[];
    defaultConnector: Connector;
    defaultConnectorLabel: string;
}

export function decisionParse(s: ts.Node): Decision {
}

/* eslint-disable complexity */
export function decisionBuild(s: Decision) {
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
export function recordDeleteBuild(s: Decision) {
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
export function recordLookupBuild(s: RecordLookup) {
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
export function loopBuild(s: Loop) {
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
export function recordRollbackBuild(s: RecordRollback) {
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
export function screenBuild(s: Screen) {
}

//#endregion

//#region Start - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_start.htm&type=5

export interface StartSchedule {
    frequency: string;
    startDate: string;
    startTime: string;
}

export interface Start {
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
}

export function startParse(s: ts.Node): Start {
}

/* eslint-disable complexity */
export function startBuild(s: Start) {
}

// export function flowBuildNode(flow: Flow, flowPath: string): ts.Node {
//     const sf = ts.factory;
//     const sk = ts.SyntaxKind;

//     const functionName = sf.createIdentifier('factorial');
//     const paramName = sf.createIdentifier('n');
//     const parameter = sf.createParameterDeclaration(/*decorators*/undefined, /*modifiers*/undefined, /*dotDotDotToken*/undefined, paramName);

//     const condition = sf.createBinaryExpression(paramName, sk.LessThanEqualsToken, sf.createNumericLiteral(1));
//     const ifBody = sf.createBlock([sf.createReturnStatement(sf.createNumericLiteral(1))], /*multiline*/true);

//     const decrementedArg = sf.createBinaryExpression(paramName, sk.MinusToken, sf.createNumericLiteral(1));
//     const recurse = sf.createBinaryExpression(paramName, sk.AsteriskToken, sf.createCallExpression(functionName, /*typeArgs*/undefined, [decrementedArg]));
//     const statements = [sf.createIfStatement(condition, ifBody), sf.createReturnStatement(recurse)];

//     const source = sf.createFunctionDeclaration(/*decorators*/undefined, /*modifiers*/[sf.createToken(sk.ExportKeyword)], /*asteriskToken*/undefined, functionName, /*typeParameters*/undefined, [parameter], /*returnType*/sf.createKeywordTypeNode(sk.NumberKeyword), sf.createBlock(statements, /*multiline*/ true));
// }

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
export function subflowBuild(s: Subflow) {
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
export function recordUpdateBuild(s: RecordUpdate) {
}

// export function hasRecordUpdate(arg: any): arg is RecordUpdate {
//     return arg.actionType === 'recordUpdate';
// }

//#endregion
