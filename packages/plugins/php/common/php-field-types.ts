export interface BaseTypeField {
  type: string;
  valueType: boolean;
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

  get innerTypeName(): string {
    const nullable = this.baseType.valueType && !this.baseType.required ? '?' : '';
    return `${nullable}${this.baseType.type}`;
  }

  get isOuterTypeRequired(): boolean {
    return this.listType ? this.listType.required : this.baseType.required;
  }
}
