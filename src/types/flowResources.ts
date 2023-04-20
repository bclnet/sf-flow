import { DataType, OutputAssignment, Value } from './flowCommon';
import { RecordFilter } from './flowOperators';

export interface Resource { }

//#region Choice - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_choice.htm&type=5

export interface Choice extends Resource {
    name: string;
    choiceText: string;
    dataType: DataType;
    displayField: string;
    value: Value;
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

//#endregion

//#region Constant - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_constant.htm&type=5

export interface Constant extends Resource {
    name: string;
    dataType: DataType;
    value: Value;
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

//#endregion

//#region Stage - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_stage.htm&type=5

export interface Stage extends Resource {
    name: string;
    isActive: boolean;
    label: string;
    stageOrder: number;
}

//#endregion

//#region TextTemplate - https://help.salesforce.com/s/articleView?id=sf.flow_ref_resources_texttemplate.htm&type=5

export interface TextTemplate extends Resource {
    name: string;
    isViewedAsPlainText: boolean;
    text: string;
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

//#endregion