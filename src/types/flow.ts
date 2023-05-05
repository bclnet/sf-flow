/* eslint-disable spaced-comment */
/* eslint-disable @typescript-eslint/ban-types */
import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
import { toArray } from '../utils';
import {
    parseLeadingComment, buildLeadingComment,
    Context,
    Connectable, Connector, connectorCreate,
    ProcessMetadataValue,
    Step, /*stepParse,*/ stepBuild,
    Wait, /*waitParse,*/ waitBuild
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
export const FlowLabelPrefix = ' {!$Flow.CurrentDateTime}';

//#region Debug

export class Debug {
    private level: number;
    public constructor() { this.level = 0; }
    public push(): void { this.level++; }
    public pop(): void { this.level--; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public log(...msg: any[]): void {
        msg[0] = `${'  '.repeat(this.level)}${msg[0] as string}`;
        // eslint-disable-next-line no-console, @typescript-eslint/no-unsafe-argument
        console.log(...msg);
    }
}

//#endregion

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
    actionCalls: ActionCall[];
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
        runInMode: undefined,
        sourceTemplate: undefined,
        start: undefined,
        startElementReference: undefined,
        status: undefined,
        actionCalls: [],
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
        recordRollbacks: undefined,
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

export function flowSort(f: Flow): void {
    for (const field of [
        'steps',
        'waits',
        'actionCalls',
        'apexPluginCalls',
        'assignments',
        'decisions',
        'loops',
        'recordCreates',
        'recordLookups',
        'recordUpdates',
        'recordDeletes',
        'screens',
        'subflows']
    ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (f[field]) f[field].sort((a: Element, b: Element) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    }
}

export function flowParse(debug: Debug, f: Flow, s: ts.Node): void {
    let prevProp: ts.PropertyDeclaration;
    s.forEachChild(s1 => {
        if (s1.kind === sk.ClassDeclaration) {
            debug?.log('parse', sk[s1.kind]);
            const klass = s1 as ts.ClassDeclaration;
            const [, , , processMetadataValues] = parseLeadingComment(klass);
            f.fullName = klass.name?.text;
            f.status = 'Active';
            f.label = undefined;
            f.interviewLabel = undefined;
            f.description = undefined;
            f.processMetadataValues = processMetadataValues;
        }
        s1.forEachChild(c1 => {
            debug?.log('parse', sk[c1.kind]);
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
                            case 'flow:': f.apiVersion = argValue; break;
                            case 'flow:runInMode': f.runInMode = argValue as FlowRunInMode; break;
                            case 'flow:status': f.status = argValue; break;
                            case 'flow:environments': f.environments = argValue; break;
                            case 'flow:interviewLabel': f.interviewLabel = argValue; break;
                            case 'sourceTemplate:': f.sourceTemplate = argValue; break;
                            default: throw Error(`Unknown Decorator '${argIdent}'`);
                        }
                    });
                    break;
                }
                case sk.ExportKeyword:
                case sk.DefaultKeyword:
                case sk.Identifier:
                    break;
                case sk.PropertyDeclaration: {
                    const prop = c1 as ts.PropertyDeclaration;
                    if (!prop.type) {
                        prevProp = prop;
                        break;
                    }
                    const typeName = prop.type.getText();
                    if (prop.modifiers?.find(x => x.kind === sk.ConstKeyword)) constantParse(debug, f, prop)
                    else if (typeName.startsWith('Choice')) choiceParse(debug, f, prop);
                    else if (typeName.startsWith('DynamicChoice')) dynamicChoiceSetParse(debug, f, prop);
                    else if (typeName === 'TextTemplate') textTemplateParse(debug, f, prop);
                    else if (typeName === 'Stage') stageParse(debug, f, prop);
                    else variableParse(debug, f, prop, prevProp);
                    prevProp = undefined;
                    break;
                }
                case sk.GetAccessor: {
                    const prop = c1 as ts.MethodDeclaration;
                    formulaParse(debug, f, prop);
                    break;
                }
                case sk.MethodDeclaration: {
                    const method = c1 as ts.MethodDeclaration;
                    startParse(debug, f, method);
                    break;
                }
                // eslint-disable-next-line no-console
                default: console.log(`!${sk[c1.kind]}`, c1.getText(s.getSourceFile())); break;
            }
        });
    });
    // console.log(flow);
}

export function flowParseBlock(debug: Debug, flow: Flow, s: ts.Node, connector: [Connectable, string]): void {
    if (!s) return;
    debug?.push();
    let nextConnector: [Connectable, string];
    // eslint-disable-next-line complexity
    s.forEachChild(c1 => {
        // debug?.log('parse', sk[c1.kind]);
        switch (c1.kind) {
            case sk.FirstStatement: {
                const stmt = c1 as ts.VariableStatement;
                if (stmt.declarationList?.flags !== ts.NodeFlags.Const && stmt.declarationList.declarations.length !== 1) throw Error('flowParseBlock: not sure NodeFlags/Length');
                const decl = stmt.declarationList.declarations[0];
                if (!decl.initializer) throw Error('flowParseBlock: not sure initializer');
                const func = decl.initializer as ts.CallExpression;
                if (!func && func.kind !== sk.CallExpression) throw Error('flowParseBlock: no statement found');
                if (func.expression.kind !== sk.PropertyAccessExpression && (func.expression as ts.PropertyAccessExpression).expression.kind !== sk.ThisKeyword) throw Error('no statement found');
                const args = func.arguments;
                const funcName = (func.expression as ts.PropertyAccessExpression).name.escapedText as string;
                const arg0text = args.length > 0 ? (args[0] as ts.StringLiteral).text : undefined;
                debug?.log('parse', funcName, arg0text ? arg0text.substring(0, 6) : '');
                if (funcName === 'query' && arg0text.startsWith('ACTION')) nextConnector = actionCallParse(debug, flow, stmt, func);
                else if (funcName === 'query' && arg0text.startsWith('APEX')) nextConnector = apexPluginCallParse(debug, flow, stmt, func);
                else if (funcName === 'query' && arg0text.startsWith('INSERT')) nextConnector = recordCreateParse(debug, flow, stmt, func);
                else if (funcName === 'query' && arg0text.startsWith('DELETE')) nextConnector = recordDeleteParse(debug, flow, stmt, func);
                else if (funcName === 'query' && arg0text.startsWith('SELECT')) nextConnector = recordLookupParse(debug, flow, stmt, func);
                else if (funcName === 'query' && arg0text.startsWith('UPDATE')) nextConnector = recordUpdateParse(debug, flow, stmt, func);
                else if (funcName === 'set') nextConnector = assignmentParse(debug, flow, stmt, func);
                else if (funcName === 'screen') nextConnector = screenParse(debug, flow, stmt, func);
                else if (funcName === 'subflow') nextConnector = subflowParse(debug, flow, stmt, func);
                else if (funcName === 'rollback') nextConnector = recordRollbackParse(debug, flow, stmt, func);
                else throw Error(`Unknown func '${funcName} ${arg0text}'`);
                break;
            }
            case sk.IfStatement: {
                const stmt = c1 as ts.IfStatement;
                debug?.log('parse', 'decisionParse');
                nextConnector = decisionParse(debug, flow, stmt);
                break;
            }
            case sk.ForInStatement: {
                const stmt = c1 as ts.ForInStatement;
                debug?.log('parse', 'loopParse');
                nextConnector = loopParse(debug, flow, stmt);
                break;
            }
            case sk.ContinueStatement:
            case sk.BreakStatement: {
                const stmt = c1 as ts.BreakStatement;
                debug?.log('parse', c1.kind === sk.ContinueStatement ? 'continue' : 'break', stmt.label.text);
                nextConnector = Context.parseTargetStatement(stmt);
                break;
            }
            // eslint-disable-next-line no-console
            default: console.log(`!${sk[c1.kind]}`, c1.getText(s.getSourceFile())); break;
        }
        // assign block
        if (connector && nextConnector) {
            const [obj, field] = connector;
            const targetReference = nextConnector[0].name;
            debug?.log('assgn', `${obj.name}.${field} = '${targetReference}'`);
            obj[field] = connectorCreate(targetReference);
        }
        connector = nextConnector;
        nextConnector = undefined;
    });
    debug?.pop();
}

/* eslint-disable complexity */
export function flowBuild(debug: Debug, s: Flow): ts.Node {
    const resources: Resource[] = []; const elements = {};
    const decorators: ts.Decorator[] = []; const members: ts.ClassElement[] = [];

    // binding
    for (const t of [
        ['-', 'steps', stepBuild],
        ['-', 'waits', waitBuild],
        ['r', 'choices', choiceBuild],
        ['r', 'constants', constantBuild],
        ['r', 'dynamicChoiceSets', dynamicChoiceSetBuild],
        ['r', 'formulas', formulaBuild],
        ['r', 'stages', stageBuild],
        ['r', 'textTemplates', textTemplateBuild],
        ['r', 'variables', variableBuild],
        ['e', 'actionCalls', actionCallBuild],
        ['e', 'apexPluginCalls', apexPluginCallBuild],
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

    // @flow
    const flowArgs: ts.Expression[] = [sf.createStringLiteral(s.apiVersion, true)];
    if (s.runInMode) flowArgs.push(sf.createBinaryExpression(sf.createIdentifier('runInMode'), sk.EqualsToken, sf.createStringLiteral(s.runInMode, true)));
    if (s.status !== 'Active') flowArgs.push(sf.createBinaryExpression(sf.createIdentifier('status'), sk.EqualsToken, sf.createStringLiteral(s.status, true)));
    if (s.environments) flowArgs.push(sf.createBinaryExpression(sf.createIdentifier('environments'), sk.EqualsToken, sf.createStringLiteral(s.environments, true)));
    decorators.push(sf.createDecorator(sf.createCallExpression(sf.createIdentifier('flow'), undefined, flowArgs)));

    // @souceTemplate
    if (s.sourceTemplate) decorators.push(sf.createDecorator(sf.createCallExpression(sf.createIdentifier('sourceTemplate'), undefined, [sf.createStringLiteral(s.sourceTemplate, true)])));

    // #resources
    resources.forEach(x => {
        members.push(x.build(debug, x));
    });

    // #methods
    const ctx = new Context(elements as object);
    let connector = s.startElementReference ? {
        targetReference: s.startElementReference,
        processMetadataValues: []
    } as Connector : s.start?.connector;
    let processType = s.processType;
    do {
        const block = ctx.buildBlock(debug, connector) ?? sf.createBlock([]);
        members.push(s.start.build(debug, s, s.start, processType, block));
        connector = ctx.moveNext();
        ctx.stmts.length = 0;
        processType = FlowProcessType.Orphan;
    } while (connector);

    const decl = sf.createClassDeclaration(
        /*decorators*/decorators,
        /*modifiers*/[sf.createToken(sk.ExportKeyword), sf.createToken(sk.DefaultKeyword)],
        /*name*/sf.createIdentifier(s.fullName),
        /*typeParameters*/undefined,
        /*heritageClauses*/undefined,
        /*members*/members);
    buildLeadingComment(decl, undefined, undefined, undefined, s.processMetadataValues);
    return decl;
}

//#endregion