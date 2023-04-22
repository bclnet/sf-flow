/* eslint-disable @typescript-eslint/ban-types */
import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
// https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
import { toArray } from '../utils';
import {
    ProcessMetadataValue, processMetadataValueParse, processMetadataValueBuild,
    Step, stepParse, stepBuild,
    Wait, waitParse, waitBuild
} from './flowCommon';
import {
    Element,
    ActionCall, actionCallParse, actionCallBuild, ApexPluginCall, apexPluginCallParse, apexPluginCallBuild,
    Assignment, assignmentParse, assignmentBuild,
    RecordCreate, recordCreateParse, recordCreateBuild,
    Decision, decisionParse, decisionBuild,
    RecordDelete, recordDeleteParse, recordDeleteBuild,
    RecordLookup, recordLookupParse, recordLookupBuild,
    Loop, loopParse, loopBuild,
    RecordRollback, recordRollbackParse, recordRollbackBuild,
    Screen, screenParse, screenBuild,
    Start, startParse, startBuild,
    Subflow, subflowParse, subflowBuild,
    RecordUpdate, recordUpdateParse, recordUpdateBuild
} from './flowElements';
import {
    Resource,
    Choice, choiceParse, choiceBuild,
    DynamicChoiceSet, dynamicChoiceSetParse, dynamicChoiceSetBuild,
    Constant, constantParse, constantBuild,
    Formula, formulaParse, formulaBuild,
    Stage, stageParse, stageBuild,
    TextTemplate, textTemplateParse, textTemplateBuild,
    Variable, variableParse, variableBuild
} from './flowResources';
const LabelPrefix = ' {!$Flow.CurrentDateTime}';

//#region Flow - https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_assignment.htm&type=5

// export enum FlowRunInModes { Default, DefaultMode }
export enum FlowProcessTypes {
    Default = undefined,
    Flow = 'Flow',
    AutoLaunchedFlow = 'AutoLaunchedFlow',
    CustomEvent = 'CustomEvent'
}

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
    recordRollbacks?: RecordRollback;
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

export function flowCreate(): Flow {
    return {
        fullName: undefined,
        apiVersion: undefined,
        decisions: [],
        description: undefined,
        environments: undefined,
        interviewLabel: undefined,
        label: undefined,
        processMetadataValues: [],
        processType: undefined,
        recordLookups: [],
        recordRollbacks: undefined,
        recordUpdates: [],
        start: undefined,
        // startElementReference?: undefined,
        status: undefined,
        variables: [],
        actionCalls: [],
        apexPluginCalls: [],
        assignments: [],
        choices: [],
        constants: [],
        dynamicChoiceSets: [],
        formulas: [],
        loops: [],
        recordCreates: [],
        recordDeletes: [],
        screens: [],
        stages: [],
        steps: [],
        subflows: [],
        textTemplates: [],
        waits: [],
    };
}

export function flowParse(flow: Flow, s: ts.Node, src: ts.SourceFile): void {
    let prevProp: ts.PropertyDeclaration;
    s.forEachChild(s1 => s1.forEachChild(c => {
        switch (c.kind) {
            case sk.Decorator: {
                const exp = (c as ts.Decorator).expression as ts.CallExpression;
                const ident = exp.expression as ts.Identifier;
                exp.arguments.forEach(arg => {
                    const expr = arg as ts.BinaryExpression;
                    const argName = arg.kind !== sk.BinaryExpression
                        ? ''
                        : (expr.left as ts.Identifier).escapedText as string;
                    const argValue = arg.kind !== sk.BinaryExpression
                        ? arg.getText()
                        : expr.right.getText();
                    const argIdent = `${ident.escapedText as string}:${argName}`;
                    switch (argIdent) {
                        case 'api:': flow.apiVersion = argValue; break;
                        case 'api:status': flow.status = argValue; break;
                        case 'api:environments': flow.environments = argValue; break;
                        case 'flow:': flow.label = argValue; flow.interviewLabel = argValue + LabelPrefix; break;
                        case 'flow:interviewLabel': flow.interviewLabel = argValue; break;
                        case 'flow:description': flow.description = argValue; break;
                        case 'sourceTemplate:': flow.sourceTemplate = argValue; break;
                        case 'processMetadataValue:': processMetadataValueParse(flow, arg); break;
                        default: throw Error(`Unknown Decorator '${argIdent}'`);
                    }
                });
                break;
            }
            case sk.ExportKeyword:
            case sk.DefaultKeyword:
                break;
            case sk.Identifier:
                //console.log(sk[c.kind], c.getText(sourceFile));
                break;
            case sk.PropertyDeclaration: {
                const prop = c as ts.PropertyDeclaration;
                if (!prop.type) {
                    prevProp = prop;
                    break;
                }
                const typeName = prop.type.getText();
                if (prop.modifiers?.find(x => x.kind === sk.ConstKeyword)) constantParse(flow, prop)
                else if (typeName.startsWith('choice')) choiceParse(flow, prop);
                else if (typeName.startsWith('dynamicChoice')) dynamicChoiceSetParse(flow, prop);
                else if (typeName.startsWith('textTemplate')) textTemplateParse(flow, prop);
                else if (typeName.startsWith('stage')) stageParse(flow, prop);
                else variableParse(flow, prop, prevProp);
                prevProp = undefined;
                break;
            }
            case sk.GetAccessor: {
                const prop = c as ts.MethodDeclaration;
                formulaParse(flow, prop);
                break;
            }
            default:
                console.log(`!${sk[c.kind]}`, c.getText(sourceFile));
                break;
        }
    }));
}

/* eslint-disable complexity */
export function flowBuild(s: Flow): ts.Node {
    const resources: Resource[] = []; const elements: Element[] = [];
    for (const t of [
        ['-', 'processMetadataValues', processMetadataValueBuild],
        ['-', 'steps', stepBuild],
        ['-', 'waits', waitBuild],
        ['r', 'choices', choiceBuild],
        ['r', 'constants', constantBuild],
        ['r', 'dynamicChoiceSets', dynamicChoiceSetBuild],
        ['r', 'formulas', formulaBuild],
        ['r', 'stages', stageBuild],
        ['r', 'textTemplates', textTemplateBuild],
        ['r', 'variables', variableBuild],
        ['e', 'actionCalls', actionCallBuild], ['e', 'apexPluginCalls', apexPluginCallBuild],
        ['e', 'assignments', assignmentBuild],
        ['e', 'decisions', decisionBuild],
        ['e', 'loops', loopBuild],
        ['e', 'recordCreates', recordCreateBuild],
        ['e', 'recordLookups', recordLookupBuild],
        ['e', 'recordRollbacks', recordRollbackBuild],
        ['e', 'recordUpdates', recordUpdateBuild],
        ['e', 'screens', screenBuild],
        ['-', 'start', startBuild],
        ['e', 'subflows', subflowBuild]
    ]) {
        const [k, name, build] = t as [string, string, Function];
        toArray(s[name]).forEach(e => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            e.build = build;
            switch (k) {
                case 'r': resources.push(e as Resource); break;
                case 'e': elements.push(e as Element); break;
                default: break;
            }
        });
    }

    const decorators: ts.Decorator[] = [];
    const members: ts.ClassElement[] = [];

    // @api
    const apiArgs: ts.Expression[] = [sf.createStringLiteral(s.apiVersion, true)];
    if (s.status !== 'Active') {
        apiArgs.push(sf.createBinaryExpression(sf.createIdentifier('status'), sk.EqualsToken, sf.createStringLiteral(s.status, true)));
    }
    if (s.environments !== 'Default') {
        apiArgs.push(sf.createBinaryExpression(sf.createIdentifier('environments'), sk.EqualsToken, sf.createStringLiteral(s.environments, true)));
    }
    decorators.push(sf.createDecorator(sf.createCallExpression(sf.createIdentifier('api'), undefined, apiArgs)));

    // @flow
    const flowArgs: ts.Expression[] = [sf.createStringLiteral(s.label, true)];
    if (s.interviewLabel !== s.label + LabelPrefix) {
        flowArgs.push(sf.createBinaryExpression(sf.createIdentifier('interviewLabel'), sk.EqualsToken, sf.createStringLiteral(s.interviewLabel, true)));
    }
    if (s.description) {
        flowArgs.push(sf.createBinaryExpression(sf.createIdentifier('description'), sk.EqualsToken, sf.createStringLiteral(s.description, true)));
    }
    // if (s.runInMode) {
    //         flowArgs.push(sf.createBinaryExpression(sf.createIdentifier('runInMode'), sk.EqualsToken, sf.createStringLiteral(s.runInMode, true)));
    // }
    decorators.push(sf.createDecorator(sf.createCallExpression(sf.createIdentifier('flow'), undefined, flowArgs)));

    // @souceTemplate
    if (s.sourceTemplate) {
        const sourceTemplateArgs = [sf.createStringLiteral(s.sourceTemplate, true)];
        decorators.push(sf.createDecorator(sf.createCallExpression(sf.createIdentifier('sourceTemplate'), undefined, sourceTemplateArgs)));
    }

    // resources
    resources.forEach(x => {
        //console.log(x.build);
        const exp = x.build(x) as ts.ClassElement;
        if (exp) members.push(exp);
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


// var ctx = new Context(elements.ToDictionary(x => x.Name));
// Start!.Connector.Process(ctx);
// source = Start.AddMembers(this, source, ctx.Source);
