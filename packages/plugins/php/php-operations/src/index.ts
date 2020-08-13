import { Types, PluginValidateFn, PluginFunction } from '@graphql-codegen/plugin-helpers';
import { visit, GraphQLSchema, concatAST, Kind, FragmentDefinitionNode } from 'graphql';
import { LoadedFragment } from '@graphql-codegen/visitor-plugin-common';
import { PhpOperationsVisitor } from './visitor';
import { extname } from 'path';
import gql from 'graphql-tag';
import { PhpOperationsRawPluginConfig } from './config';

export const plugin: PluginFunction<PhpOperationsRawPluginConfig> = (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config
) => {
  const allAst = concatAST(documents.map(v => v.document));
  const allFragments: LoadedFragment[] = [
    ...(allAst.definitions.filter(d => d.kind === Kind.FRAGMENT_DEFINITION) as FragmentDefinitionNode[]).map(
      fragmentDef => ({
        node: fragmentDef,
        name: fragmentDef.name.value,
        onType: fragmentDef.typeCondition.name.value,
        isExternal: false,
      })
    ),
    ...(config.externalFragments || []),
  ];

  const visitor = new PhpOperationsVisitor(schema, allFragments, config, documents);
  const visitorResult = visit(allAst, { leave: visitor });
  const header = `<?php

namespace ${visitor.config.namespaceName};
`;
  return {
    prepend: [],
    content: [header, ...visitorResult.definitions.filter(t => typeof t === 'string')].filter(a => a).join('\n'),
  };
};

export const addToSchema = gql`
  directive @namedClient(name: String!) on OBJECT | FIELD
`;

export const validate: PluginValidateFn<any> = async (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config,
  outputFile: string
) => {
  if (extname(outputFile) !== '.php') {
    throw new Error(`Plugin "php-operations" requires extension to be ".php"!`);
  }
};

export { PhpOperationsVisitor };
