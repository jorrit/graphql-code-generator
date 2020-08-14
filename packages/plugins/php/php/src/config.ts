import { RawConfig, EnumValuesMap } from '@graphql-codegen/visitor-plugin-common';

/**
 * @description This plugin generates PHP `class` identifier for your schema types.
 */
export interface PhpResolversPluginRawConfig extends RawConfig {
  /**
   * @description Overrides the default value of enum values declared in your GraphQL schema.
   * @exampleMarkdown
   * ## With Custom Values
   * ```yml
   *   config:
   *     enumValues:
   *       MyEnum:
   *         A: 'foo'
   * ```
   */
  enumValues?: EnumValuesMap;
  /**
   * @default GraphQLCodeGen
   * @description Allow you to customize the namespace name.
   *
   * @exampleMarkdown
   * ```yml
   * generates:
   *   src/main/php/my-org/my-app/MyTypes.php:
   *     plugins:
   *       - php
   *     config:
   *       namespaceName: MyCompany.MyNamespace
   * ```
   */
  namespaceName?: string;
}
