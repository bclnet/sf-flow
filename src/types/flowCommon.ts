type RequireOne<T, K extends keyof T = keyof T> = K extends keyof T ? PartialRequire<T, K> : never;
type PartialRequire<O, K extends keyof O> = { [P in K]-?: O[P]; } & O;

//#region Connector

export interface Connector {
    isGoTo?: boolean;
    targetReference: string;
    processMetadataValues: ProcessMetadataValue[];
}

//#endregion

//#region Value

export enum DataType {
    Default,
    Apex,
    SObject,
    Boolean,
    String,
    Number,
}

export type Value = RequireOne<{
    stringValue?: string;
    numberValue?: string;
    booleanValue?: string;
    elementReference?: string;
}>;

function hasValue(arg: any): arg is Value {
    return (
        arg.stringValue !== undefined ||
        arg.numberValue !== undefined ||
        arg.booleanValue !== undefined ||
        arg.elementReference !== undefined
    );
}

//#endregion

//#region ProcessMetadataValue

export interface ProcessMetadataValue {
    name: string;
    value?: Value;
}

export function hasProcessMetadataValue(arg: any): arg is ProcessMetadataValue {
    return arg.name !== undefined && (arg.value === undefined || hasValue(arg.value));
}

//#endregion

//#region Input/Output

export interface InputAssignment {
    name: string;
    field: string;
    value: Value;
}

export interface OutputAssignment {
    assignToReference: string;
    field: string;
    name: string;
}

export interface InputParameter {
    name: string;
    value: Value;
}

export interface OutputParameter {
    assignToReference: string;
    name: string;
}

//#endregion

//#region Step

export interface Step {
}

//#endregion

//#region Wait

export interface Wait {
}

//#endregion
