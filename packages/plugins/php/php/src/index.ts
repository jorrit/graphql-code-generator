import { parse, GraphQLSchema, printSchema, visit } from 'graphql';
import { PluginFunction, Types } from '@graphql-codegen/plugin-helpers';
import { PhpResolversVisitor } from './visitor';
import { PhpResolversPluginRawConfig } from './config';

export const plugin: PluginFunction<PhpResolversPluginRawConfig> = async (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: PhpResolversPluginRawConfig,
  { outputFile }
): Promise<string> => {
  const visitor = new PhpResolversVisitor(config, schema);
  const printedSchema = printSchema(schema);
  const astNode = parse(printedSchema);
  const visitorResult = visit(astNode, { leave: visitor as any });
  const imports = visitor.getImports();
  const fileContent = visitorResult.definitions.filter(d => typeof d === 'string').join('\n');
  return visitor.prependFileHeader(imports, fileContent);
};
