import { Kind, TypeNode, StringValueNode } from 'graphql';
import { indent } from '@graphql-codegen/visitor-plugin-common';
import { ListTypeField, PhpFieldType } from './php-field-types';

export function transformComment(comment: string | StringValueNode, indentLevel = 0): string {
  if (!comment) {
    return '';
  }
  if (isStringValueNode(comment)) {
    comment = comment.value;
  }
  comment = comment.trimStart().split('*/').join('*\\/');
  let lines = comment.split('\n');
  lines = ['/**', ...lines.map(line => ` * ${line}`), ' */'];
  return lines
    .map(line => indent(line, indentLevel))
    .concat('')
    .join('\n');
}

function isStringValueNode(node: any): node is StringValueNode {
  return node && typeof node === 'object' && node.kind === Kind.STRING;
}

export function getListTypeField(typeNode: TypeNode): ListTypeField | undefined {
  if (typeNode.kind === Kind.LIST_TYPE) {
    return {
      required: false,
      type: getListTypeField(typeNode.type),
    };
  } else if (typeNode.kind === Kind.NON_NULL_TYPE && typeNode.type.kind === Kind.LIST_TYPE) {
    return Object.assign(getListTypeField(typeNode.type), {
      required: true,
    });
  } else if (typeNode.kind === Kind.NON_NULL_TYPE) {
    return getListTypeField(typeNode.type);
  } else {
    return undefined;
  }
}

export function getListTypeDepth(listType: ListTypeField): number {
  if (listType) {
    return getListTypeDepth(listType.type) + 1;
  } else {
    return 0;
  }
}

export function getListInnerTypeNode(typeNode: TypeNode): TypeNode {
  if (typeNode.kind === Kind.LIST_TYPE) {
    return getListInnerTypeNode(typeNode.type);
  } else if (typeNode.kind === Kind.NON_NULL_TYPE && typeNode.type.kind === Kind.LIST_TYPE) {
    return getListInnerTypeNode(typeNode.type);
  } else {
    return typeNode;
  }
}

export function wrapFieldType(
  fieldType: PhpFieldType,
  listTypeField: ListTypeField | undefined,
  forComment: boolean
): string {
  if (listTypeField) {
    let typeName = 'array';
    if (forComment) {
      typeName = `${typeName}<${wrapFieldType(fieldType, listTypeField.type, true)}>`;
    }

    return applyNullable(typeName, listTypeField.required, forComment);
  }

  return applyNullable(fieldType.baseType.type, fieldType.baseType.required, forComment);
}

function applyNullable(typeName: string, required: boolean, forComment: boolean) {
  if (required) {
    return typeName;
  }

  if (forComment) {
    return `${typeName}|null`;
  }

  return `?${typeName}`;
}
