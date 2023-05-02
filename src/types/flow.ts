/* eslint-disable @typescript-eslint/ban-types */
import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
// https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
import { toArray } from '../utils';
import {
    Context,
    Connector,
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

export enum FlowRunInMode {
    DefaultMode = 'DefaultMode',
    SystemModeWithoutSharing = 'SystemModeWithoutSharing',
}

export enum FlowProcessType {
    Flow = 'Flow',
    AutoLaunchedFlow = 'AutoLaunchedFlow',
    CustomEvent = 'CustomEvent',
    Orphan = 'Orphan',
}

export interface Flow {
    fullName: string;
    apiVersion: string;
    description: string;
    environments: string;
    interviewLabel: string;
    label: string;
    processMetadataValues: ProcessMetadataValue[];
    processType: FlowProcessType;
    runInMode?: FlowRunInMode;
    sourceTemplate?: string;
    start: Start;
    startElementReference?: string;
    status: string;
    actionCalls?: ActionCall[];
    apexPluginCalls: ApexPluginCall[];
    assignments: Assignment[];
    choices: Choice[];
    constants: Constant[];
    decisions: Decision[];
    dynamicChoiceSets: DynamicChoiceSet[];
    formulas: Formula[];
    loops: Loop[];
    recordCreates: RecordCreate[];
    recordDeletes: RecordDelete[];
    recordLookups: RecordLookup[];
    recordRollbacks?: RecordRollback;
    recordUpdates: RecordUpdate[];
    screens: Screen[];
    stages: Stage[];
    steps: Step[];
    subflows: Subflow[];
    textTemplates: TextTemplate[];
    variables: Variable[];
    waits: Wait[];
}

export function flowCreate(): Flow {
    return {
        fullName: undefined,
        apiVersion: undefined,
        description: undefined,
        environments: undefined,
        interviewLabel: undefined,
        label: undefined,
        processMetadataValues: [],
        processType: undefined,
        // runInMode: undefined,
        // sourceTemplate: undefined,
        start: undefined,
        // startElementReference: undefined,
        status: undefined,
        // actionCalls: [],
        apexPluginCalls: [],
        assignments: [],
        choices: [],
        constants: [],
        decisions: [],
        dynamicChoiceSets: [],
        formulas: [],
        loops: [],
        recordCreates: [],
        recordDeletes: [],
        recordLookups: [],
        // recordRollbacks: undefined,
        recordUpdates: [],
        screens: [],
        stages: [],
        steps: [],
        subflows: [],
        textTemplates: [],
        variables: [],
        waits: [],
    };
}

export function flowParse(flow: Flow, s: ts.Node, src: ts.SourceFile): void {
    let prevProp: ts.PropertyDeclaration;
    s.forEachChild(s1 => s1.forEachChild(c1 => {
        switch (c1.kind) {
            case sk.Decorator: {
                const exp = (c1 as ts.Decorator).expression as ts.CallExpression;
                const ident = exp.expression as ts.Identifier;
                exp.arguments.forEach(arg => {
                    const expr = arg as ts.BinaryExpression;
                    const argName = arg.kind !== sk.BinaryExpression
                        ? ''
                        : (expr.left as ts.Identifier).escapedText as string;
                    const argValue = arg.kind !== sk.BinaryExpression
                        ? (arg as ts.StringLiteral).text
                        : (expr.right as ts.StringLiteral).text;
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
                //console.log(sk[c1.kind], c1.getText(src));
                break;
            case sk.PropertyDeclaration: {
                const prop = c1 as ts.PropertyDeclaration;
                if (!prop.type) {
                    prevProp = prop;
                    break;
                }
                const typeName = prop.type.getText();
                if (prop.modifiers?.find(x => x.kind === sk.ConstKeyword)) constantParse(flow, prop)
                else if (typeName.startsWith('Choice')) choiceParse(flow, prop);
                else if (typeName.startsWith('DynamicChoice')) dynamicChoiceSetParse(flow, prop);
                else if (typeName === 'TextTemplate') textTemplateParse(flow, prop);
                else if (typeName === 'Stage') stageParse(flow, prop);
                else variableParse(flow, prop, prevProp);
                prevProp = undefined;
                break;
            }
            case sk.GetAccessor: {
                const prop = c1 as ts.MethodDeclaration;
                formulaParse(flow, prop);
                break;
            }
            case sk.MethodDeclaration: {
                const method = c1 as ts.MethodDeclaration;
                // eslint-disable-next-line complexity
                startParse(flow, method, c2 => {
                    const connector: Connector = undefined;
                    switch (c2.kind) {
                        case sk.FirstStatement: {
                            const stmt = c2 as ts.VariableStatement;
                            if (stmt.declarationList?.flags !== ts.NodeFlags.Const && stmt.declarationList.declarations.length !== 1) throw Error('Not sure NodeFlags/Length');
                            const decl = stmt.declarationList.declarations[0];
                            if (!decl.initializer) throw Error('Not sure initializer');
                            const func = decl.initializer as ts.CallExpression;
                            if (!func && func.kind !== sk.CallExpression) throw Error('no statement found');
                            if (func.expression.kind !== sk.PropertyAccessExpression && (func.expression as ts.PropertyAccessExpression).expression.kind !== sk.ThisKeyword) throw Error('no statement found');
                            const args = func.arguments;
                            const funcName = (func.expression as ts.PropertyAccessExpression).name.escapedText as string;
                            const arg0text = (args[0] as ts.StringLiteral).text;
                            if (funcName === 'query' && arg0text.startsWith('ACTION')) actionCallParse(flow, stmt, func, connector);
                            else if (funcName === 'query' && arg0text.startsWith('APEX')) apexPluginCallParse(flow, stmt, func, connector);
                            else if (funcName === 'query' && arg0text.startsWith('INSERT')) recordCreateParse(flow, stmt, func, connector);
                            else if (funcName === 'query' && arg0text.startsWith('DELETE')) recordDeleteParse(flow, stmt, func, connector);
                            else if (funcName === 'query' && arg0text.startsWith('SELECT')) recordLookupParse(flow, stmt, func, connector);
                            else if (funcName === 'query' && arg0text.startsWith('UPDATE')) recordUpdateParse(flow, stmt, func, connector);
                            else if (funcName === 'screen') screenParse(flow, stmt, func, connector);
                            else if (funcName === 'subflow') subflowParse(flow, stmt, func, connector);
                            else throw Error(`Unknown func '${funcName} ${arg0text}'`);
                            // assignmentParse(flow, stmt);
                            // recordRollbackParse(flow, stmt);
                            break;
                        }
                        case sk.IfStatement: {
                            const stmt = c2 as ts.IfStatement;
                            decisionParse(flow, stmt, connector);
                            //console.log(sk[c.kind], c.getText(src));
                            break;
                        }
                        default:
                            console.log(`!${sk[c2.kind]}`, c2.getText(src));
                            break;
                    }
                });
                break;
            }
            default:
                console.log(`!${sk[c1.kind]}`, c1.getText(src));
                break;
        }
    }));
    // console.log(flow);
}

/* eslint-disable complexity */
export function flowBuild(s: Flow): ts.Node {
    const resources: Resource[] = []; const elements = {};
    const decorators: ts.Decorator[] = []; const members: ts.ClassElement[] = [];

    // binding
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
        ['e', 'recordDeletes', recordDeleteBuild],
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
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                case 'e': elements[e.name] = e as Element; break;
                default: break;
            }
        });
    }

    // @api
    const apiArgs: ts.Expression[] = [sf.createStringLiteral(s.apiVersion, true)];
    if (s.status !== 'Active') apiArgs.push(sf.createBinaryExpression(sf.createIdentifier('status'), sk.EqualsToken, sf.createStringLiteral(s.status, true)));
    if (s.environments) apiArgs.push(sf.createBinaryExpression(sf.createIdentifier('environments'), sk.EqualsToken, sf.createStringLiteral(s.environments, true)));
    decorators.push(sf.createDecorator(sf.createCallExpression(sf.createIdentifier('api'), undefined, apiArgs)));

    // @flow
    const flowArgs: ts.Expression[] = [sf.createStringLiteral(s.label, true)];
    if (s.interviewLabel !== s.label + LabelPrefix) flowArgs.push(sf.createBinaryExpression(sf.createIdentifier('interviewLabel'), sk.EqualsToken, sf.createStringLiteral(s.interviewLabel, true)));
    if (s.description) flowArgs.push(sf.createBinaryExpression(sf.createIdentifier('description'), sk.EqualsToken, sf.createStringLiteral(s.description, true)));
    if (s.runInMode) flowArgs.push(sf.createBinaryExpression(sf.createIdentifier('runInMode'), sk.EqualsToken, sf.createStringLiteral(s.runInMode, true)));
    decorators.push(sf.createDecorator(sf.createCallExpression(sf.createIdentifier('flow'), undefined, flowArgs)));

    // @souceTemplate
    if (s.sourceTemplate) decorators.push(sf.createDecorator(sf.createCallExpression(sf.createIdentifier('sourceTemplate'), undefined, [sf.createStringLiteral(s.sourceTemplate, true)])));

    // #resources
    resources.forEach(x => {
        members.push(x.build(x) as ts.ClassElement);
    });

    // #methods
    const ctx = new Context(elements as object);
    let connector = s.start?.connector ?? { targetReference: s.startElementReference } as Connector;
    let processType = s.processType;
    do {
        const block = ctx.buildBlock(connector);
        members.push(s.start.build(s.start, processType, block) as ts.ClassElement);
        connector = ctx.moveNext();
        ctx.stmts.length = 0;
        processType = FlowProcessType.Orphan;
    } while (connector);

    const decl = sf.createClassDeclaration(
        /*decorators*/decorators,
        /*modifiers*/[sf.createToken(sk.ExportKeyword), sf.createToken(sk.DefaultKeyword)],
        /*name*/sf.createIdentifier('theFlow'),
        /*typeParameters*/undefined,
        /*heritageClauses*/undefined,
        /*members*/members);
    return decl;
}

//#endregion