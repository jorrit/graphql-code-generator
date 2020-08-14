export interface BaseTypeField {
  type: string;
  required: boolean;
}

export interface ListTypeField {
  required: boolean;
  type: ListTypeField;
}

export interface PhpField {
  baseType: BaseTypeField;
  listType?: ListTypeField;
}

export class PhpFieldType implements PhpField {
  baseType: BaseTypeField;
  listType?: ListTypeField;

  constructor(fieldType: PhpField) {
    Object.assign(this, fieldType);
  }
}
