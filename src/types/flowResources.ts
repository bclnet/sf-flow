import { DataType, OutputAssignment, Value } from './flowCommon';
import { RecordFilter } from './flowOperators';

export interface Resource {
  build: Function;
}

//#region Choice - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_choice.htm&type=5

export interface Choice extends Resource {
    name: string;
    choiceText: string;
    dataType: DataType;
    displayField: string;
    value: Value;
}

/* eslint-disable complexity */
export function choiceBuild(source: Choice) {
}

//#endregion

//#region CollectionChoiceSet - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_collectionchoice.htm&type=5

export interface DynamicChoiceSet extends Resource {
    name: string;
    dataType: DataType;
    displayField: string;
    filterLogic: string;
    filters: RecordFilter[];
    object: string;
    outputAssignments: OutputAssignment[];
    valueField: string;
}

/* eslint-disable complexity */
export function dynamicChoiceSetBuild(source: DynamicChoiceSet) {
}

//#endregion

//#region Constant - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_constant.htm&type=5

export interface Constant extends Resource {
    name: string;
    dataType: DataType;
    value: Value;
}

/* eslint-disable complexity */
export function constantBuild(source: Constant) {
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

/* eslint-disable complexity */
export function formulaBuild(source: Formula) {
}

//#endregion

//#region Stage - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_stage.htm&type=5

export interface Stage extends Resource {
    name: string;
    isActive: boolean;
    label: string;
    stageOrder: number;
}

/* eslint-disable complexity */
export function stageBuild(source: Stage) {
}

//#endregion

//#region TextTemplate - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_texttemplate.htm&type=5

export interface TextTemplate extends Resource {
    name: string;
    isViewedAsPlainText: boolean;
    text: string;
}

/* eslint-disable complexity */
export function textTemplateBuild(source: TextTemplate) {
}

//#endregion

//#region Variable - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_variable.htm&type=5

export interface Variable extends Resource {
    description?: string;
    name: string;
    apexClass?: string;
    dataType: DataType;
    isCollection: boolean;
    isInput: boolean;
    isOutput: boolean;
    objectType: string;
    scale?: number;
    value?: Value;
}

/* eslint-disable complexity */
export function variableBuild(source: Variable) {
}

//#endregion