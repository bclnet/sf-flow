/* eslint-disable spaced-comment */
/* eslint-disable @typescript-eslint/ban-types */
import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
import { objectPurge } from '../utils';
import { Flow, Debug } from './flow';
import {
    createStringLiteralX, getLeadingComments,
    genericFromQuery, genericToQuery,
    DataType, Value, valueFromTypeNode, valueToTypeNode, valueFromExpression, valueToExpression,
    ProcessMetadataValue,
    OutputAssignment, outputAssignmentFromString, outputAssignmentToString
} from './flowCommon';
import {
    RecordFilter, filterFromQuery, filterToQuery
} from './flowOperators';

function parseDescription(s: ts.Node): [description: string, processMetadataValues: ProcessMetadataValue[]] {
    const c = getLeadingComments(s);
    return [c?.length > 0 ? c[0] : undefined, []];
}

function buildDescription(s: ts.Node, description: string, processMetadataValues: ProcessMetadataValue[]): void {
    if (description) ts.addSyntheticLeadingComment(s, sk.SingleLineCommentTrivia, ` ${description}`, true);
}

export interface Resource {
    name: string;
    description?: string;
    processMetadataValues: ProcessMetadataValue[];
    build: (debug: Debug, s: Resource) => ts.ClassElement;
}

//#region Choice - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_choice.htm&type=5

export interface Choice extends Resource {
    choiceText: string;
    dataType: DataType;
    displayField?: string;
    value: Value;
}

export function choiceParse(debug: Debug, f: Flow, s: ts.PropertyDeclaration): void {
    const [description, processMetadataValues] = parseDescription(s);
    const func = s.initializer as ts.NewExpression;
    if (!func && func.kind !== sk.NewExpression) throw Error('choiceParse: no statement found');
    const args = func.arguments;
    const funcName = (func.expression as ts.Identifier).escapedText as string;
    if (funcName !== 'Choice' && func.typeArguments.length !== 1 && !(args.length >= 2 || args.length <= 3)) throw Error(`choiceParse: bad function '${funcName}<${func.typeArguments.length}>(${args.length})'`);
    const [, dataType,] = valueFromTypeNode(func.typeArguments[0]);
    const prop: Choice = objectPurge({
        name: (s.name as ts.Identifier).text,
        description,
        processMetadataValues,
        choiceText: (args[0] as ts.StringLiteral).text,
        dataType,
        displayField: args.length > 2 ? (args[2] as ts.StringLiteral).text : undefined,
        value: valueFromExpression(args[1], dataType),
    }) as Choice;
    f.choices.push(prop);
    //console.log(prop);
}

/* eslint-disable complexity */
export function choiceBuild(debug: Debug, s: Choice): ts.ClassElement {
    const args: ts.Expression[] = [sf.createStringLiteral(s.choiceText, true), valueToExpression(s.value)];
    if (s.displayField) args.push(sf.createStringLiteral(s.displayField, true));
    const prop = sf.createPropertyDeclaration(
        /*decorators*/undefined,
        /*modifiers*/undefined,
        /*name*/sf.createIdentifier(s.name),
        /*questionOrExclamationToken*/undefined,
        /*type*/sf.createTypeReferenceNode('Choice'),
        /*initializer*/sf.createNewExpression(sf.createIdentifier('Choice'), [valueToTypeNode(false, s.dataType, 0)], args));
    buildDescription(prop, s.description, s.processMetadataValues);
    return prop;
}

//#endregion

//#region CollectionChoiceSet - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_collectionchoice.htm&type=5

export interface DynamicChoiceSet extends Resource {
    dataType: DataType;
    displayField: string;
    filterLogic: string;
    filters: RecordFilter[];
    object: string;
    outputAssignments: OutputAssignment[];
    valueField: string;
}

export function dynamicChoiceSetParse(debug: Debug, f: Flow, s: ts.PropertyDeclaration): void {
    const [description, processMetadataValues] = parseDescription(s);
    const func = s.initializer as ts.NewExpression;
    if (!func && func.kind !== sk.NewExpression) throw Error('dynamicChoiceSetParse: no statement found');
    const args = func.arguments;
    const funcName = (func.expression as ts.Identifier).escapedText as string;
    if (funcName !== 'DynamicChoice' && !(args.length >= 1 || args.length <= 2)) throw Error(`dynamicChoiceSetParse: bad function '${funcName}(${args.length})'`);
    const [displayField, filterLogic, filters, outputAssignments, object, valueField] = dynamicChoiceSetFromQuery((args[0] as ts.StringLiteral).text);
    const [, dataType,] = valueFromTypeNode(func.typeArguments[0]);
    const prop = objectPurge({
        name: (s.name as ts.Identifier).text,
        description,
        processMetadataValues,
        dataType,
        displayField,
        filterLogic,
        filters,
        object,
        outputAssignments,
        valueField,
    }) as DynamicChoiceSet;
    f.dynamicChoiceSets.push(prop);
    //console.log(prop);
}

/* eslint-disable complexity */
export function dynamicChoiceSetBuild(debug: Debug, s: DynamicChoiceSet): ts.ClassElement {
    const args: ts.Expression[] = [createStringLiteralX(dynamicChoiceSetToQuery(s))];
    const prop = sf.createPropertyDeclaration(
        /*decorators*/undefined,
        /*modifiers*/undefined,
        /*name*/sf.createIdentifier(s.name),
        /*questionOrExclamationToken*/undefined,
        /*type*/sf.createTypeReferenceNode('DynamicChoice'),
        /*initializer*/sf.createNewExpression(sf.createIdentifier('DynamicChoice'), [valueToTypeNode(false, s.dataType, 0)], args));
    buildDescription(prop, s.description, s.processMetadataValues);
    return prop;
}

function dynamicChoiceSetFromQuery(s: string): [displayField: string, filterLogic: string, filters: RecordFilter[], outputAssignments: OutputAssignment[], object: string, valueField: string] {
    const [query, action, from, where, limit] = genericFromQuery(s, 'DYNAMIC', 'SET');
    const [filterLogic, filters] = filterFromQuery(where);
    return [
        /*displayField*/query,
        /*filterLogic*/filterLogic,
        /*filters*/filters ?? [],
        /*outputAssignments*/action ? action.split(',').map(x => outputAssignmentFromString(x.trim())) : [],
        /*object*/from,
        /*valueField*/limit];
}

function dynamicChoiceSetToQuery(s: DynamicChoiceSet): string {
    return genericToQuery('DYNAMIC', 'SET',
        /*query*/s.displayField,
        /*action*/s.outputAssignments.length > 0 ? s.outputAssignments.map(x => outputAssignmentToString(x)).join(', ') : undefined,
        /*from*/s.object,
        /*where*/filterToQuery(s.filterLogic, s.filters),
        /*limit*/s.valueField);
}

//#endregion

//#region Constant - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_constant.htm&type=5

export interface Constant extends Resource {
    dataType: DataType;
    value: Value;
}

export function constantParse(debug: Debug, f: Flow, s: ts.PropertyDeclaration): void {
    const [description, processMetadataValues] = parseDescription(s);
    const [, dataType,] = valueFromTypeNode(s.type)
    const prop = objectPurge({
        name: (s.name as ts.Identifier).text,
        description,
        processMetadataValues,
        dataType,
        value: valueFromExpression(s.initializer, dataType),
    }) as Constant;
    f.constants.push(prop);
    //console.log(prop);
}

/* eslint-disable complexity */
export function constantBuild(debug: Debug, s: Constant): ts.ClassElement {
    const prop = sf.createPropertyDeclaration(
        /*decorators*/undefined,
        /*modifiers*/[sf.createToken(sk.ConstKeyword)],
        /*name*/sf.createIdentifier(s.name),
        /*questionOrExclamationToken*/undefined,
        /*typeNode*/valueToTypeNode(false, s.dataType, 0),
        /*initializer*/s.value ? valueToExpression(s.value) : undefined);
    buildDescription(prop, s.description, s.processMetadataValues);
    return prop;
}

//#endregion

//#region Formula - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_formula.htm&type=5

export interface Formula extends Resource {
    dataType: DataType;
    expression: string;
    scale?: number;
}

export function formulaParse(debug: Debug, f: Flow, s: ts.MethodDeclaration): void {
    const [description, processMetadataValues] = parseDescription(s);
    const rtnStmt = s.body.statements.find(x => x.kind === sk.ReturnStatement) as ts.ReturnStatement;
    if (!rtnStmt || rtnStmt.kind !== sk.ReturnStatement) throw Error('formulaParse: no statement found');
    else if (rtnStmt.expression.kind !== sk.CallExpression) throw Error('formulaParse: no method found');
    const func = rtnStmt.expression as ts.CallExpression;
    if (!func && func.kind !== sk.CallExpression) throw Error('formulaParse: no statement found');
    const args = func.arguments;
    const funcName = (func.expression as ts.Identifier).escapedText as string;
    if (funcName !== 'formula' && !(args.length === 1)) throw Error(`formulaParse: bad function '${funcName}(${args.length})'`);
    const [, dataType, scale] = valueFromTypeNode(s.type)
    const prop = objectPurge({
        name: (s.name as ts.Identifier).text,
        description,
        processMetadataValues,
        dataType,
        expression: (args[0] as ts.StringLiteral).text,
        scale,
    }) as Formula;
    f.formulas.push(prop);
    // console.log(prop);
}

/* eslint-disable complexity */
export function formulaBuild(debug: Debug, s: Formula): ts.ClassElement {
    const method = sf.createPropertyAccessExpression(sf.createToken(sk.ThisKeyword), sf.createIdentifier('formula'));
    const lambda = sf.createReturnStatement(sf.createCallExpression(method, undefined, [sf.createStringLiteral(s.expression, true)]));
    const prop = sf.createMethodDeclaration(
        /*decorators*/undefined,
        /*modifiers*/[sf.createToken(sk.GetKeyword) as undefined],
        /*asteriskToken*/undefined,
        /*name*/sf.createIdentifier(s.name),
        /*questionToken*/undefined,
        /*typeParameters*/undefined,
        /*parameters*/undefined,
        /*type*/valueToTypeNode(false, s.dataType, s.scale),
        /*body*/sf.createBlock([lambda], true));
    buildDescription(prop, s.description, s.processMetadataValues);
    return prop;
}

//#endregion

//#region Stage - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_stage.htm&type=5

export interface Stage extends Resource {
    isActive: boolean;
    label: string;
    stageOrder: number;
}

export function stageParse(debug: Debug, f: Flow, s: ts.PropertyDeclaration): void {
    const [description, processMetadataValues] = parseDescription(s);
    const func = s.initializer as ts.NewExpression;
    if (!func && func.kind !== sk.NewExpression) throw Error('stageParse: no statement found');
    const args = func.arguments;
    const funcName = (func.expression as ts.Identifier).escapedText as string;
    if (funcName !== 'Stage' && !(args.length >= 2 || args.length <= 3)) throw Error(`stageParse: bad function '${funcName}(${args.length})'`);
    const prop = objectPurge({
        name: (s.name as ts.Identifier).text,
        description,
        processMetadataValues,
        isActive: args.length > 2 ? args[2].kind === sk.TrueKeyword : true,
        label: (args[1] as ts.StringLiteral).text,
        stageOrder: Number((args[0] as ts.NumericLiteral).text),
    }) as Stage;
    f.stages.push(prop);
    //console.log(prop);
}

/* eslint-disable complexity */
export function stageBuild(debug: Debug, s: Stage): ts.ClassElement {
    const args: ts.Expression[] = [sf.createNumericLiteral(s.stageOrder), sf.createStringLiteral(s.label, true)];
    if (!s.isActive) args.push(sf.createToken(sk.FalseKeyword));
    const prop = sf.createPropertyDeclaration(
        /*decorators*/undefined,
        /*modifiers*/undefined,
        /*name*/sf.createIdentifier(s.name),
        /*questionOrExclamationToken*/undefined,
        /*type*/sf.createTypeReferenceNode('Stage'),
        /*initializer*/sf.createNewExpression(sf.createIdentifier('Stage'), undefined, args));
    buildDescription(prop, s.description, s.processMetadataValues);
    return prop;
}

//#endregion

//#region TextTemplate - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_texttemplate.htm&type=5

export interface TextTemplate extends Resource {
    isViewedAsPlainText: string;
    text: string;
}

export function textTemplateParse(debug: Debug, f: Flow, s: ts.PropertyDeclaration): void {
    const [description, processMetadataValues] = parseDescription(s);
    const func = s.initializer as ts.NewExpression;
    if (!func && func.kind !== sk.NewExpression) throw Error('textTemplateParse: no statement found');
    const args = func.arguments;
    const funcName = (func.expression as ts.Identifier).escapedText as string;
    if (funcName !== 'TextTemplate' && !(args.length >= 1 || args.length <= 2)) throw Error(`textTemplateParse: bad function '${funcName}(${args.length})'`);
    const prop = objectPurge({
        name: (s.name as ts.Identifier).text,
        description,
        processMetadataValues,
        isViewedAsPlainText: String(args.length > 1 ? args[1].kind === sk.TrueKeyword : false),
        text: (args[0] as ts.StringLiteral).text,
    }) as TextTemplate;
    f.textTemplates.push(prop);
    //console.log(prop);
}

/* eslint-disable complexity */
export function textTemplateBuild(debug: Debug, s: TextTemplate): ts.ClassElement {
    const args: ts.Expression[] = [sf.createStringLiteral(s.text, true)];
    if (s.isViewedAsPlainText === 'true') args.push(sf.createToken(sk.TrueKeyword));
    const prop = sf.createPropertyDeclaration(
        /*decorators*/undefined,
        /*modifiers*/undefined,
        /*name*/sf.createIdentifier(s.name),
        /*questionOrExclamationToken*/undefined,
        /*type*/sf.createTypeReferenceNode('TextTemplate'),
        /*initializer*/sf.createNewExpression(sf.createIdentifier('TextTemplate'), undefined, args));
    buildDescription(prop, s.description, s.processMetadataValues);
    return prop;
}

//#endregion

//#region Variable - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_variable.htm&type=5

export interface Variable extends Resource {
    apexClass?: string;
    dataType: DataType;
    isCollection: boolean;
    isInput: boolean;
    isOutput: boolean;
    objectType?: string;
    scale?: number;
    value?: Value;
}

export function variableParse(debug: Debug, f: Flow, s: ts.PropertyDeclaration, p: ts.PropertyDeclaration): void {
    const [description, processMetadataValues] = parseDescription(p ?? s);
    const decorators = p?.decorators ?? s?.decorators;
    const decoratorName = decorators?.length > 0 ? decorators[0].getText() : '';
    const [isCollection, dataType, scale, typeName] = valueFromTypeNode(s.type)
    const prop = objectPurge({
        name: (s.name as ts.Identifier).text,
        description,
        processMetadataValues,
        apexClass: dataType === DataType.Apex ? typeName : undefined,
        dataType,
        isCollection,
        isInput: decoratorName.includes('In'),
        isOutput: decoratorName.includes('Out'),
        objectType: dataType === DataType.SObject ? typeName : undefined,
        scale,
        value: valueFromExpression(s.initializer, dataType),
    }) as Variable;
    f.variables.push(prop);
    //console.log(prop);
}

/* eslint-disable complexity */
export function variableBuild(debug: Debug, s: Variable): ts.ClassElement {
    const decorators: ts.Decorator[] = s.isInput || s.isOutput
        ? [sf.createDecorator(sf.createIdentifier(`${(s.isInput ? 'In' : '')}${(s.isOutput ? 'Out' : '')}`))]
        : undefined;
    const prop = sf.createPropertyDeclaration(
        /*decorators*/decorators,
        /*modifiers*/undefined,
        /*name*/sf.createIdentifier(s.name),
        /*questionOrExclamationToken*/undefined,
        /*type*/valueToTypeNode(s.isCollection, s.dataType, s.scale, s.apexClass ?? s.objectType),
        /*initializer*/s.value ? valueToExpression(s.value) : undefined);
    buildDescription(prop, s.description, s.processMetadataValues);
    return prop;
}

//#endregion