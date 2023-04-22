/* eslint-disable @typescript-eslint/ban-types */
import * as ts from 'typescript';
const sf = ts.factory;
const sk = ts.SyntaxKind;
import { Flow } from './flow';
import {
    triviaSetComment,
    DataType, Value, valueFromTypeNode, valueToTypeNode, valueToExpression,
    ProcessMetadataValue,
    OutputAssignment,
} from './flowCommon';
import { RecordFilter } from './flowOperators';

export interface Resource {
    description?: string;
    processMetadataValues: ProcessMetadataValue[];
    build?: Function;
}

//#region Choice - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_choice.htm&type=5

export interface Choice extends Resource {
    description?: string;
    name: string;
    choiceText: string;
    dataType: DataType;
    displayField: string;
    value: Value;
}

export function choiceParse(f: Flow, s: ts.PropertyDeclaration): void {
}

/* eslint-disable complexity */
export function choiceBuild(s: Choice) {
    const decorators: ts.Decorator[] = [];
    if (s.description) decorators.push(sf.createDecorator(sf.createCallExpression(sf.createIdentifier('description'), undefined, [sf.createStringLiteral(s.description, true)])));
    const args: ts.Expression[] = [sf.createStringLiteral(s.choiceText, true)];
    const prop = sf.createPropertyDeclaration(
        /*decorators*/decorators,
        /*modifiers*/undefined,
        /*name*/sf.createIdentifier(s.name),
        /*questionOrExclamationToken*/undefined,
        /*type*/sf.createTypeReferenceNode('Choice'),
        /*initializer*/sf.createNewExpression(sf.createIdentifier('Choice'), undefined, args));
    if (s.description) ts.addSyntheticLeadingComment(prop, sk.SingleLineCommentTrivia, ' ' + s.description, true);
    return prop;
}

//#endregion

//#region CollectionChoiceSet - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_collectionchoice.htm&type=5

export interface DynamicChoiceSet extends Resource {
    description?: string;
    name: string;
    dataType: DataType;
    displayField: string;
    filterLogic: string;
    filters: RecordFilter[];
    object: string;
    outputAssignments: OutputAssignment[];
    valueField: string;
}

export function dynamicChoiceSetParse(f: Flow, s: ts.PropertyDeclaration): void {
}

/* eslint-disable complexity */
export function dynamicChoiceSetBuild(s: DynamicChoiceSet) {
    const decorators: ts.Decorator[] = [];
    if (s.description) decorators.push(sf.createDecorator(sf.createCallExpression(sf.createIdentifier('description'), undefined, [sf.createStringLiteral(s.description, true)])));
    const args: ts.Expression[] = [];
    const prop = sf.createPropertyDeclaration(
        /*decorators*/decorators,
        /*modifiers*/undefined,
        /*name*/sf.createIdentifier(s.name),
        /*questionOrExclamationToken*/undefined,
        /*type*/sf.createTypeReferenceNode('DynamicChoice'),
        /*initializer*/sf.createNewExpression(sf.createIdentifier('DynamicChoice'), undefined, args));
    if (s.description) ts.addSyntheticLeadingComment(prop, sk.SingleLineCommentTrivia, ' ' + s.description, true);
    return prop;
}

//#endregion

//#region Constant - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_constant.htm&type=5

export interface Constant extends Resource {
    description?: string;
    name: string;
    dataType: DataType;
    value: Value;
}

export function constantParse(f: Flow, s: ts.PropertyDeclaration): void {
    const prop: Constant = {
        name: s.name.getText(),
    };
    triviaSetComment(s, prop, 'description');
    f.constants.push(prop);
}

/* eslint-disable complexity */
export function constantBuild(s: Constant) {
    const prop = sf.createPropertyDeclaration(
        /*decorators*/undefined,
        /*modifiers*/[sf.createKeywordTypeNode(sk.ConstKeyword)],
        /*name*/sf.createIdentifier(s.name),
        /*questionOrExclamationToken*/undefined,
        /*typeNode*/valueToTypeNode(false, s.dataType, 0),
        /*initializer*/s.value ? valueToExpression(s.value, s.dataType) : undefined);
    if (s.description) ts.addSyntheticLeadingComment(prop, sk.SingleLineCommentTrivia, ' ' + s.description, true);
    return prop;
}

//#endregion

//#region Formula - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_formula.htm&type=5

export interface Formula extends Resource {
    description?: string;
    name: string;
    dataType: DataType;
    expression: string;
    scale?: number;
}

export function formulaParse(f: Flow, s: ts.MethodDeclaration): void {
    const [, dataType, scale] = valueFromTypeNode(s.type)
    const prop: Formula = {
        name: s.name.getText(),
        dataType: dataType,
        scale: scale,
    };
    triviaSetComment(s, prop, 'description');
    f.formulas.push(prop);
    // s.body;
    // console.log(prop);
}

/* eslint-disable complexity */
export function formulaBuild(s: Formula) {
    const lambda = sf.createReturnStatement(sf.createCallExpression(sf.createIdentifier('formula'), undefined, [sf.createStringLiteral(s.expression, true)]))
    const prop = sf.createMethodDeclaration(
        /*decorators*/undefined,
        /*modifiers*/[sf.createToken(sk.GetKeyword)],
        /*asteriskToken*/undefined,
        /*name*/sf.createIdentifier(s.name),
        /*questionToken*/undefined,
        /*typeParameters*/undefined,
        /*parameters*/undefined,
        /*type*/valueToTypeNode(false, s.dataType, s.scale),
        /*body*/sf.createBlock([lambda], true));
    if (s.description) ts.addSyntheticLeadingComment(prop, sk.SingleLineCommentTrivia, ' ' + s.description, true);
    return prop;
}

//#endregion

//#region Stage - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_stage.htm&type=5

export interface Stage extends Resource {
    description?: string;
    name: string;
    isActive: boolean;
    label: string;
    stageOrder: number;
}

export function stageParse(f: Flow, s: ts.PropertyDeclaration): void {
    const prop: Stage = {
        name: s.name.getText(),
    };
    triviaSetComment(s, prop, 'description');
    f.stages.push(prop);
    // console.log(prop);
}

/* eslint-disable complexity */
export function stageBuild(s: Stage) {
    const args: ts.Expression[] = [sf.createNumericLiteral(s.stageOrder), sf.createStringLiteral(s.label, true)];
    if (!s.isActive) args.push(sf.createToken(sk.FalseKeyword));
    const prop = sf.createPropertyDeclaration(
        /*decorators*/undefined,
        /*modifiers*/undefined,
        /*name*/sf.createIdentifier(s.name),
        /*questionOrExclamationToken*/undefined,
        /*type*/sf.createTypeReferenceNode('Stage'),
        /*initializer*/sf.createNewExpression(sf.createIdentifier('Stage'), undefined, args));
    if (s.description) ts.addSyntheticLeadingComment(prop, sk.SingleLineCommentTrivia, ' ' + s.description, true);
    return prop;
}

//#endregion

//#region TextTemplate - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_texttemplate.htm&type=5

export interface TextTemplate extends Resource {
    description?: string;
    name: string;
    isViewedAsPlainText: boolean;
    text: string;
}

export function textTemplateParse(f: Flow, s: ts.PropertyDeclaration): void {
    const prop: TextTemplate = {
        name: s.name.getText(),
    };
    triviaSetComment(s, prop, 'description');
    f.textTemplates.push(prop);
    // console.log(prop);
}

/* eslint-disable complexity */
export function textTemplateBuild(s: TextTemplate) {
    const args: ts.Expression[] = [sf.createStringLiteral(s.text, true)];
    if (s.isViewedAsPlainText) args.push(sf.createToken(sk.TrueKeyword));
    const prop = sf.createPropertyDeclaration(
        /*decorators*/undefined,
        /*modifiers*/undefined,
        /*name*/sf.createIdentifier(s.name),
        /*questionOrExclamationToken*/undefined,
        /*type*/sf.createTypeReferenceNode('TextTemplate'),
        /*initializer*/sf.createNewExpression(sf.createIdentifier('TextTemplate'), undefined, args));
    if (s.description) ts.addSyntheticLeadingComment(prop, sk.SingleLineCommentTrivia, ' ' + s.description, true);
    return prop;
}

//#endregion

//#region Variable - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_variable.htm&type=5

export interface Variable extends Resource {
    name: string;
    dataType: DataType;
    isCollection: boolean;
    isInput: boolean;
    isOutput: boolean;
    apexClass?: string;
    objectType?: string;
    scale?: number;
    value?: Value;
}

export function variableParse(f: Flow, s: ts.PropertyDeclaration, p: ts.PropertyDeclaration): void {
    const decorators = p?.decorators ?? s?.decorators;
    const decoratorName = decorators?.length > 0 ? decorators[0].getText() : '';
    const [isCollection, dataType, scale, typeName] = valueFromTypeNode(s.type)
    const prop: Variable = {
        name: s.name.getText(),
        dataType,
        isCollection,
        isInput: decoratorName.includes('in'),
        isOutput: decoratorName.includes('out'),
    };
    if (scale) prop.scale = scale;
    if (dataType === DataType.Apex) prop.apexClass = typeName;
    else if (dataType === DataType.SObject) prop.objectType = typeName;
    triviaSetComment(p ?? s, prop, 'description');
    f.variables.push(prop);
    // console.log(prop);
}

/* eslint-disable complexity */
export function variableBuild(s: Variable): ts.Expression {
    s.isInput = true;
    s.description = `BODY: ${s.name}`;
    const decorators: ts.Decorator[] = s.isInput || s.isOutput
        ? [sf.createDecorator(sf.createIdentifier(`${(s.isInput ? 'in' : '')}${(s.isOutput ? 'out' : '')}`))]
        : undefined;
    const prop = sf.createPropertyDeclaration(
        /*decorators*/decorators,
        /*modifiers*/undefined,
        /*name*/sf.createIdentifier(s.name),
        /*questionOrExclamationToken*/undefined,
        /*type*/valueToTypeNode(s.isCollection, s.dataType, s.scale, s.apexClass ?? s.objectType),
        /*initializer*/s.value ? valueToExpression(s.value, s.dataType) : undefined);
    if (s.description) ts.addSyntheticLeadingComment(prop, sk.SingleLineCommentTrivia, ' ' + s.description, true);
    return prop;
}

//#endregion