import {
  ParsedConfig,
  BaseVisitor,
  EnumValuesMap,
  indent,
  buildScalars,
  getBaseTypeNode,
  indentMultiline,
} from '@graphql-codegen/visitor-plugin-common';
import { PhpResolversPluginRawConfig } from './config';
import {
  GraphQLSchema,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  FieldDefinitionNode,
  InputValueDefinitionNode,
  TypeNode,
  Kind,
  isScalarType,
  isInputObjectType,
  isEnumType,
  DirectiveNode,
  StringValueNode,
  NameNode,
  NamedTypeNode,
} from 'graphql';
import {
  PHP_SCALARS,
  PhpDeclarationBlock,
  transformComment,
  isValueType,
  getListInnerTypeNode,
  PhpFieldType,
  phpKeywords,
  wrapFieldType,
  getListTypeField,
} from '../../common/common';

export interface PhpResolverParsedConfig extends ParsedConfig {
  namespaceName: string;
  listType: string;
  enumValues: EnumValuesMap;
}

export class PhpResolversVisitor extends BaseVisitor<PhpResolversPluginRawConfig, PhpResolverParsedConfig> {
  private readonly keywords = new Set(phpKeywords);

  constructor(rawConfig: PhpResolversPluginRawConfig, private _schema: GraphQLSchema, defaultPackageName: string) {
    super(rawConfig, {
      enumValues: rawConfig.enumValues || {},
      listType: rawConfig.listType || 'List',
      namespaceName: rawConfig.namespaceName || 'GraphQLCodeGen',
      scalars: buildScalars(_schema, rawConfig.scalars, PHP_SCALARS),
    });
  }

  /**
   * Checks name against list of keywords. If it is, will prefix value with @
   *
   * Note:
   * This class should first invoke the convertName from base-visitor to convert the string or node
   * value according the naming configuration, eg upper or lower case. Then resulting string checked
   * against the list or keywords.
   * However the generated PHP code is not yet able to handle fields that are in a different case so
   * the invocation of convertName is omitted purposely.
   */
  private convertSafeName(node: NameNode | string): string {
    const name = typeof node === 'string' ? node : node.value;
    return this.keywords.has(name) ? `@${name}` : name;
  }

  public getImports(): string {
    const allImports = ['System', 'System.Collections.Generic', 'Newtonsoft.Json', 'GraphQL'];
    return allImports.map(i => `using ${i};`).join('\n') + '\n';
  }

  public prependFileHeader(imports: string, content: string): string {
    return `<?php

namespace ${this.config.namespaceName};

${imports}

${content}
`;
  }

  protected getEnumValue(enumName: string, enumOption: string): string {
    if (
      this.config.enumValues[enumName] &&
      typeof this.config.enumValues[enumName] === 'object' &&
      this.config.enumValues[enumName][enumOption]
    ) {
      return this.config.enumValues[enumName][enumOption];
    }

    return enumOption;
  }

  EnumValueDefinition(node: EnumValueDefinitionNode): (enumName: string) => string {
    return (enumName: string) => {
      const enumHeader = this.getFieldHeader(node);
      const enumOption = this.convertSafeName(node.name);
      return enumHeader + indent(this.getEnumValue(enumName, enumOption));
    };
  }

  EnumTypeDefinition(node: EnumTypeDefinitionNode): string {
    const enumName = this.convertName(node.name);
    const enumValues = node.values.map(enumValue => (enumValue as any)(node.name.value)).join(',\n');
    const enumBlock = [enumValues].join('\n');

    return new PhpDeclarationBlock()
      .access('public')
      .asKind('enum')
      .withComment(node.description)
      .withName(enumName)
      .withBlock(enumBlock).string;
  }

  getFieldHeader(node: InputValueDefinitionNode | FieldDefinitionNode | EnumValueDefinitionNode): string {
    const commentText = node.description?.value || '';
    const annotations = [];

    const deprecationDirective = node.directives.find(v => v.name?.value === 'deprecated');
    if (deprecationDirective) {
      const deprecationReason = this.getDeprecationReason(deprecationDirective);
      annotations.push(`@deprecated ${deprecationReason}`);
    }

    return transformComment(
      `${commentText}

${annotations.join('\n')}`.trim()
    );
  }

  getDeprecationReason(directive: DirectiveNode): string {
    if (directive.name.value !== 'deprecated') {
      return '';
    }
    const hasArguments = directive.arguments.length > 0;
    let reason = 'Field no longer supported';
    if (hasArguments && directive.arguments[0].value.kind === Kind.STRING) {
      reason = directive.arguments[0].value.value;
    }
    return reason;
  }

  protected resolveInputFieldType(typeNode: TypeNode, hasDefaultValue: Boolean = false): PhpFieldType {
    const innerType = getBaseTypeNode(typeNode);
    const schemaType = this._schema.getType(innerType.name.value);
    const listType = getListTypeField(typeNode);
    const required = getListInnerTypeNode(typeNode).kind === Kind.NON_NULL_TYPE;

    let result: PhpFieldType = null;

    if (isScalarType(schemaType)) {
      if (this.scalars[schemaType.name]) {
        const baseType = this.scalars[schemaType.name];
        result = new PhpFieldType({
          baseType: {
            type: baseType,
            required,
            valueType: isValueType(baseType),
          },
          listType,
        });
      } else {
        result = new PhpFieldType({
          baseType: {
            type: 'object',
            required,
            valueType: false,
          },
          listType,
        });
      }
    } else if (isInputObjectType(schemaType)) {
      result = new PhpFieldType({
        baseType: {
          type: `${this.convertName(schemaType.name)}`,
          required,
          valueType: false,
        },
        listType,
      });
    } else if (isEnumType(schemaType)) {
      result = new PhpFieldType({
        baseType: {
          type: this.convertName(schemaType.name),
          required,
          valueType: true,
        },
        listType,
      });
    } else {
      result = new PhpFieldType({
        baseType: {
          type: `${schemaType.name}`,
          required,
          valueType: false,
        },
        listType,
      });
    }

    if (hasDefaultValue) {
      // Required field is optional when default value specified, see #4273
      (result.listType || result.baseType).required = false;
    }

    return result;
  }

  protected buildClass(
    name: string,
    description: StringValueNode,
    inputValueArray: ReadonlyArray<FieldDefinitionNode>,
    interfaces?: ReadonlyArray<NamedTypeNode>
  ): string {
    const classSummary = transformComment(description?.value);
    const interfaceImpl =
      interfaces && interfaces.length > 0 ? ` implements ${interfaces.map(ntn => ntn.name.value).join(', ')}` : '';
    const classMembers = inputValueArray
      .map(arg => {
        const fieldType = this.resolveInputFieldType(arg.type);
        const fieldHeader = this.getFieldHeader(arg);
        const fieldName = this.convertSafeName(arg.name);
        const phpFieldType = wrapFieldType(fieldType, fieldType.listType, this.config.listType);
        return indentMultiline(`${fieldHeader}public ${phpFieldType} $${fieldName};`);
      })
      .join('\n\n');

    return `
${classSummary}class ${this.convertSafeName(name)}${interfaceImpl} {
${classMembers}
}
`;
  }

  protected buildInterface(
    name: string,
    description: StringValueNode,
    inputValueArray: ReadonlyArray<FieldDefinitionNode>
  ): string {
    const classSummary = transformComment(description?.value);
    const classMembers = inputValueArray
      .map(arg => {
        const fieldType = this.resolveInputFieldType(arg.type);
        const fieldHeader = this.getFieldHeader(arg);
        const fieldName = this.convertSafeName(arg.name);
        const phpFieldType = wrapFieldType(fieldType, fieldType.listType, this.config.listType);
        return indentMultiline(`${fieldHeader}public ${phpFieldType} $${fieldName};`);
      })
      .join('\n\n');

    return `
${classSummary}interface ${this.convertSafeName(name)} {
${classMembers}
}`;
  }

  protected buildInputTransformer(
    name: string,
    description: StringValueNode,
    inputValueArray: ReadonlyArray<InputValueDefinitionNode>
  ): string {
    const classSummary = transformComment(description?.value);
    const classMembers = inputValueArray
      .map(arg => {
        const fieldType = this.resolveInputFieldType(arg.type, !!arg.defaultValue);
        const fieldHeader = this.getFieldHeader(arg);
        const fieldName = this.convertSafeName(arg.name);
        const phpFieldType = wrapFieldType(fieldType, fieldType.listType, this.config.listType);
        return indentMultiline(`${fieldHeader}public ${phpFieldType} $${fieldName};`);
      })
      .join('\n\n');

    return `
${classSummary}class ${this.convertSafeName(name)} {
${classMembers}

  public dynamic GetInputObject().0
  {
    IDictionary<string, object> d = new System.Dynamic.ExpandoObject();

    var properties = GetType().GetProperties(System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public);
    foreach (var propertyInfo in properties)
    {
      var value = propertyInfo.GetValue(this);
      var defaultValue = propertyInfo.PropertyType.IsValueType ? Activator.CreateInstance(propertyInfo.PropertyType) : null;

      var requiredProp = propertyInfo.GetCustomAttributes(typeof(JsonRequiredAttribute), false).Length > 0;
      if (requiredProp || value != defaultValue)
      {
        d[propertyInfo.Name] = value;
      }
    }
    return d;
  }
}
`;
  }

  InputObjectTypeDefinition(node: InputObjectTypeDefinitionNode): string {
    const name = `${this.convertName(node)}`;
    return this.buildInputTransformer(name, node.description, node.fields);
  }

  ObjectTypeDefinition(node: ObjectTypeDefinitionNode): string {
    return this.buildClass(node.name.value, node.description, node.fields, node.interfaces);
  }

  InterfaceTypeDefinition(node: InterfaceTypeDefinitionNode): string {
    return this.buildInterface(node.name.value, node.description, node.fields);
  }
}
