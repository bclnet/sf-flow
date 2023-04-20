import * as ts from 'typescript';
// https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
import { ProcessMetadataValue, Step, Wait } from './flowCommon';
import {
    Element,
    ActionCall, ApexPluginCall,
    Assignment,
    RecordCreate,
    Decision,
    RecordDelete,
    RecordLookup,
    Loop,
    RecordRollback,
    Screen,
    Start,
    Subflow,
    RecordUpdate
} from './flowElements';
import {
    Resource,
    Choice,
    DynamicChoiceSet,
    Constant,
    Formula,
    Stage,
    TextTemplate,
    Variable
} from './flowResources';

//#region Flow -  https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_assignment.htm&type=5

// export enum FlowRunInModes { Default, DefaultMode }
export enum FlowProcessTypes { Default, Flow, AutoLaunchedFlow, CustomEvent }

export interface Flow {
    fullName: string;
    apiVersion: string;
    decisions?: Decision[];
    description: string;
    environments: string;
    interviewLabel: string;
    label: string;
    processMetadataValues?: ProcessMetadataValue[];
    processType: FlowProcessTypes;
    recordLookups?: RecordLookup[];
    recordRollbacks?: RecordRollback[];
    recordUpdates?: RecordUpdate[];
    start: Start;
    startElementReference?: string;
    status: string;
    variables?: Variable[];
    actionCalls?: ActionCall[];
    apexPluginCalls?: ApexPluginCall[];
    assignments?: Assignment[];
    choices?: Choice[];
    constants?: Constant[];
    dynamicChoiceSets?: DynamicChoiceSet[];
    formulas?: Formula[];
    loops?: Loop[];
    recordCreates?: RecordCreate[];
    recordDeletes?: RecordDelete[];
    screens?: Screen[];
    stages?: Stage[];
    // runInMode?: FlowRunInModes;
    steps?: Step[];
    subflows?: Subflow[];
    textTemplates?: TextTemplate[];
    waits?: Wait[];
}

export function flowParseFlow(data: ts.SourceFile): Flow {
}

export function flowBuildNode(flow: Flow, flowPath: string): ts.Node {
    const sf = ts.factory;
    const sk = ts.SyntaxKind;

    // resources
    const resources: Resource[] = [];
    if (flow.choices?.length > 0) resources.concat(flow.choices);
    if (flow.constants?.length > 0) resources.concat(flow.constants);
    if (flow.dynamicChoiceSets?.length > 0) resources.concat(flow.dynamicChoiceSets);
    if (flow.formulas?.length > 0) resources.concat(flow.formulas);
    if (flow.processMetadataValues?.length > 0) resources.concat(flow.processMetadataValues);
    if (flow.stages?.length > 0) resources.concat(flow.stages);
    if (flow.textTemplates?.length > 0) resources.concat(flow.textTemplates);
    if (flow.variables?.length > 0) resources.concat(flow.variables);

    // elements
    const elements: Element[] = [];
    if (flow.actionCalls?.length > 0) elements.concat(flow.actionCalls);
    if (flow.assignments?.length > 0) elements.concat(flow.assignments);
    if (flow.decisions?.length > 0) elements.concat(flow.decisions);
    if (flow.loops?.length > 0) elements.concat(flow.loops);
    if (flow.recordCreates?.length > 0) elements.concat(flow.recordCreates);
    if (flow.recordLookups?.length > 0) elements.concat(flow.recordLookups);
    if (flow.recordRollbacks?.length > 0) elements.concat(flow.recordRollbacks);
    if (flow.recordUpdates?.length > 0) elements.concat(flow.recordUpdates);
    if (flow.screens?.length > 0) elements.concat(flow.screens);
    if (flow.subflows?.length > 0) elements.concat(flow.subflows);

    const source = sf.createClassDeclaration(
        /*decorators*/undefined,
        /*modifiers*/[sf.createToken(sk.ExportKeyword), sf.createToken(sk.DefaultKeyword)],
        /*name*/sf.createIdentifier('theFlow'),
        /*typeParameters*/undefined,
        /*heritageClauses*/undefined,
        /*members*/undefined);
    return source;
}

//#endregion




    // process
    //foreach (var s in resources) source = s.AddMembers(source);
    // var ctx = new Context(elements.ToDictionary(x => x.Name));
    // Start!.Connector.Process(ctx);
    // source = Start.AddMembers(this, source, ctx.Source);
    // return source;

    // const paramName = sf.createIdentifier('n');
    // const parameter = sf.createParameterDeclaration(
    //           /*decorators*/ undefined,
    //           /*modifiers*/ undefined,
    //           /*dotDotDotToken*/ undefined,
    //     paramName
    // );

    // const condition = sf.createBinaryExpression(paramName, sk.LessThanEqualsToken, sf.createNumericLiteral(1));
    // const ifBody = sf.createBlock([sf.createReturnStatement(sf.createNumericLiteral(1))], /*multiline*/ true);

    // const decrementedArg = sf.createBinaryExpression(paramName, sk.MinusToken, sf.createNumericLiteral(1));
    // const recurse = sf.createBinaryExpression(paramName, sk.AsteriskToken, sf.createCallExpression(functionName, /*typeArgs*/ undefined, [decrementedArg]));
    // const statements = [sf.createIfStatement(condition, ifBody), sf.createReturnStatement(recurse)];

    // let source = sf.createFunctionDeclaration(/*decorators*/undefined, /*modifiers*/[sf.createToken(sk.ExportKeyword), sf.createToken(sk.ExportKeyword)], /*asteriskToken*/undefined, sf.createIdentifier('theFlow'), /*typeParameters*/undefined, [parameter], /*returnType*/sf.createKeywordTypeNode(sk.NumberKeyword), sf.createBlock(statements, /*multiline*/true));