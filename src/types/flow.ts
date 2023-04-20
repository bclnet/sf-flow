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
  Choice, choiceBuild,
  DynamicChoiceSet, dynamicChoiceSetBuild,
  Constant, constantBuild,
  Formula, formulaBuild,
  Stage, stageBuild,
  TextTemplate, textTemplateBuild,
  Variable, variableBuild
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
  //
  sourceTemplate?: string;
}

export function flowParse(s: ts.SourceFile): Flow {
}

/* eslint-disable complexity */
export function flowBuild(s: Flow, flowPath: string): ts.Node {
  const LabelPrefix = ' {!$Flow.CurrentDateTime}';
  const sf = ts.factory;
  const sk = ts.SyntaxKind;

  // resources
  let resources: Resource[] = [];
  if (s.choices?.length > 0) resources = resources.concat(s.choices.map(x => { x.build = choiceBuild; return x; }));
  if (s.constants?.length > 0) resources = resources.concat(s.constants.map(x => { x.build = constantBuild; return x; }));
  if (s.dynamicChoiceSets?.length > 0) resources = resources.concat(s.dynamicChoiceSets.map(x => { x.build = dynamicChoiceSetBuild; return x; }));
  if (s.formulas?.length > 0) resources = resources.concat(s.formulas.map(x => { x.build = formulaBuild; return x; }));
  // if (s.processMetadataValues?.length > 0) resources = resources.concat(s.processMetadataValues.map(x => { x.build = processMetadataBuild; return x; }));
  if (s.stages?.length > 0) resources = resources.concat(s.stages.map(x => { x.build = stageBuild; return x; }));
  if (s.textTemplates?.length > 0) resources = resources.concat(s.textTemplates.map(x => { x.build = textTemplateBuild; return x; }));
  if (s.variables?.length > 0) resources = resources.concat(s.variables.map(x => { x.build = variableBuild; return x; }));

  // elements
  const elements: Element[] = [];
  if (s.actionCalls?.length > 0) elements.concat(s.actionCalls);
  if (s.assignments?.length > 0) elements.concat(s.assignments);
  if (s.decisions?.length > 0) elements.concat(s.decisions);
  if (s.loops?.length > 0) elements.concat(s.loops);
  if (s.recordCreates?.length > 0) elements.concat(s.recordCreates);
  if (s.recordLookups?.length > 0) elements.concat(s.recordLookups);
  if (s.recordRollbacks?.length > 0) elements.concat(s.recordRollbacks);
  if (s.recordUpdates?.length > 0) elements.concat(s.recordUpdates);
  if (s.screens?.length > 0) elements.concat(s.screens);
  if (s.subflows?.length > 0) elements.concat(s.subflows);

  const decorators: ts.Decorator[] = [];
  const members: ts.Expression[] = [];

  // @api
  const apiArgs: ts.Expression[] = [sf.createStringLiteral(s.apiVersion, true)];
  if (s.status !== 'Active') {
    apiArgs.push(sf.createBinaryExpression(sf.createIdentifier('status'), sk.EqualsToken, sf.createStringLiteral(s.status, true)));
  }
  if (s.environments !== 'Default') {
    apiArgs.push(sf.createBinaryExpression(sf.createIdentifier('environments'), sk.EqualsToken, sf.createStringLiteral(s.environments, true)));
  }
  decorators.push(sf.createDecorator(sf.createCallExpression(sf.createIdentifier('api'), undefined, apiArgs)));

  // @s
  const flowArgs: ts.Expression[] = [sf.createStringLiteral(s.label, true)];
  if (s.interviewLabel !== s.label + LabelPrefix) {
    flowArgs.push(sf.createBinaryExpression(sf.createIdentifier('interviewLabel'), sk.EqualsToken, sf.createStringLiteral(s.interviewLabel, true)));
  }
  if (s.description) {
    flowArgs.push(sf.createBinaryExpression(sf.createIdentifier('description'), sk.EqualsToken, sf.createStringLiteral(s.description, true)));
  }
  // if (s.runInMode) {
  //   flowArgs.push(sf.createBinaryExpression(sf.createIdentifier('runInMode'), sk.EqualsToken, sf.createStringLiteral(s.runInMode, true)));
  // }
  decorators.push(sf.createDecorator(sf.createCallExpression(sf.createIdentifier('s'), undefined, flowArgs)));

  // @souceTemplate
  if (s.sourceTemplate) {
    const sourceTemplateArgs = [sf.createStringLiteral(s.sourceTemplate, true)];
    decorators.push(sf.createDecorator(sf.createCallExpression(sf.createIdentifier('sourceTemplate'), undefined, sourceTemplateArgs)));
  }

  // resources
  resources.forEach(x => {
    console.log(x);
  });

  const source = sf.createClassDeclaration(
      /*decorators*/decorators,
      /*modifiers*/[sf.createToken(sk.ExportKeyword), sf.createToken(sk.DefaultKeyword)],
      /*name*/sf.createIdentifier('theFlow'),
      /*typeParameters*/undefined,
      /*heritageClauses*/undefined,
      /*members*/members);
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