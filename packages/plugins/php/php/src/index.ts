import { parse, GraphQLSchema, printSchema, visit } from 'graphql';
import { PluginFunction, Types } from '@graphql-codegen/plugin-helpers';
import { PhpResolversVisitor } from './visitor';
import { buildPackageNameFromPath } from '../../common/common';
import { dirname, normalize } from 'path';
import { PhpResolversPluginRawConfig } from './config';

export const plugin: PluginFunction<PhpResolversPluginRawConfig> = async (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: PhpResolversPluginRawConfig,
  { outputFile }
): Promise<string> => {
  const relevantPath = dirname(normalize(outputFile));
  const defaultPackageName = buildPackageNameFromPath(relevantPath);
  const visitor = new PhpResolversVisitor(config, schema, defaultPackageName);
  const printedSchema = printSchema(schema);
  const astNode = parse(printedSchema);
  const visitorResult = visit(astNode, { leave: visitor as any });
  const imports = visitor.getImports();
  const fileContent = visitorResult.definitions.filter(d => typeof d === 'string').join('\n');
  return visitor.prependFileHeader(imports, fileContent);
};
