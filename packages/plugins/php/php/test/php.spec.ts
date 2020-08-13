import '@graphql-codegen/testing';
import { buildSchema } from 'graphql';
import { plugin } from '../src/index';
import { PhpResolversPluginRawConfig } from '../src/config';

describe('PHP', () => {
  describe('File format', () => {
    it('Should include PHP open tag', async () => {
      const schema = buildSchema(/* GraphQL */ `
        enum ns {
          dummy
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });

      expect(result).toMatch(/<?php\n\n/);
    });
  });

  describe('Using directives', () => {
    it.skip('Should include dotnet using directives', async () => {
      const schema = buildSchema(/* GraphQL */ `
        enum ns {
          dummy
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });

      expect(result).toContain('using System;');
      expect(result).toContain('using System.Collections.Generic;');
      expect(result).toContain('using Newtonsoft.Json;');
      expect(result).toContain('using GraphQL;');
    });
  });

  describe('Namespaces', () => {
    it('Should prepend generated code block with namespace using default name', async () => {
      const schema = buildSchema(/* GraphQL */ `
        enum ns {
          dummy
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });
      expect(result).toContain('namespace GraphQLCodeGen;');
    });

    it('Should prepend generated code block with namespace using custom name', async () => {
      const schema = buildSchema(/* GraphQL */ `
        enum ns {
          dummy
        }
      `);
      const result = await plugin(schema, [], { namespaceName: 'MyCompany.MyGeneratedGql' }, { outputFile: '' });
      expect(result).toContain('namespace MyCompany.MyGeneratedGql;');
    });
  });

  describe.skip('Enums', () => {
    describe('Basic conversion', () => {
      it('Should convert enums to PHP enums', async () => {
        const schema = buildSchema(/* GraphQL */ `
          enum UserRole {
            ADMIN
            USER
          }
        `);
        const result = await plugin(schema, [], {}, { outputFile: '' });
        expect(result).toBeSimilarStringTo(`
          public enum UserRole {
            ADMIN,
            USER
          }
        `);
      });

      it('Should allow to override enum values with custom values', async () => {
        const schema = buildSchema(/* GraphQL */ `
          enum UserRole {
            ADMIN
            USER
          }
        `);
        const config: PhpResolversPluginRawConfig = {
          enumValues: {
            UserRole: {
              ADMIN: 'AdminRoleValue',
            },
          },
        };
        const result = await plugin(schema, [], config, { outputFile: '' });

        expect(result).toContain('AdminRoleValue');
        expect(result).toContain('USER');
      });
    });

    describe('Comment and directives', () => {
      it('Should generate summary header for the enum type', async () => {
        const schema = buildSchema(/* GraphQL */ `
          """
          Allowed user roles
          """
          enum UserRole {
            admin
          }
        `);
        const result = await plugin(schema, [], {}, { outputFile: '' });
        expect(result).toBeSimilarStringTo(`
          /// <summary>
          /// Allowed user roles
          /// </summary>
          public enum UserRole
        `);
      });

      it('Should generate summary header for enum values', async () => {
        const schema = buildSchema(/* GraphQL */ `
          enum UserRole {
            """
            Administrator role
            """
            admin
          }
        `);
        const result = await plugin(schema, [], {}, { outputFile: '' });
        expect(result).toBeSimilarStringTo(`
          /// <summary>
          /// Administrator role
          /// </summary>
          admin
        `);
      });

      it('Should generate multiline summary header for enum values', async () => {
        const schema = buildSchema(/* GraphQL */ `
          enum UserRole {
            """
            Administrator role
            Note: normal users are not admins!
            """
            admin
          }
        `);
        const result = await plugin(schema, [], {}, { outputFile: '' });
        expect(result).toBeSimilarStringTo(`
          /// <summary>
          /// Administrator role
          /// Note: normal users are not admins!
          /// </summary>
          admin
        `);
      });

      it('Should mark deprecated enum values with Obsolete attribute', async () => {
        const schema = buildSchema(/* GraphQL */ `
          enum UserRole {
            guest @deprecated(reason: "Guests not welcome")
          }
        `);
        const result = await plugin(schema, [], {}, { outputFile: '' });
        expect(result).toBeSimilarStringTo(`[Obsolete("Guests not welcome")]
          guest
        `);
      });
    });

    describe('Reserved keywords', () => {
      it('Should prefix enum with @ when name is a reserved keyword', async () => {
        const schema = buildSchema(/* GraphQL */ `
          enum Visibility {
            public
            private
            protected
            internal
          }
        `);
        const result = await plugin(schema, [], {}, { outputFile: '' });
        expect(result).toBeSimilarStringTo(`
          public enum Visibility {
            @public,
            @private,
            @protected,
            internal
        `);
      });
    });
  });

  describe('Input Types', () => {
    it('Should generate PHP class for input type', async () => {
      const schema = buildSchema(/* GraphQL */ `
        input UserInput {
          id: Int
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });
      expect(result).toContain('public class UserInput {');
    });

    it('Should generate properties for input type fields', async () => {
      const schema = buildSchema(/* GraphQL */ `
        input UserInput {
          id: Int
          email: String
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });
      expect(result).toBeSimilarStringTo(`
        public ?int $id;
        public string $email;
      `);
    });

    it('Should generate PHP method for creating input object', async () => {
      const schema = buildSchema(/* GraphQL */ `
        input UserInput {
          id: Int
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });
      expect(result).toContain('public dynamic GetInputObject()');
    });

    it('Should generate summary header for class and properties', async () => {
      const schema = buildSchema(/* GraphQL */ `
        """
        User Input values
        """
        input UserInput {
          """
          User id
          """
          id: Int!
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });

      expect(result).toBeSimilarStringTo(`
        /// <summary>
        /// User Input values
        /// </summary>
        public class UserInput {
      `);
      expect(result).toBeSimilarStringTo(`
        /// <summary>
        /// User id
        /// </summary>
        [JsonRequired]
        public int $id;
      `);
    });
  });

  describe('Types', () => {
    it('Should generate PHP class for type', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type User {
          id: Int
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });
      expect(result).toContain('public class User {');
    });

    it('Should wrap generated classes in Type class', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type User {
          id: Int
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });
      expect(result).toContain('public class Types {');
    });

    it('Should wrap generated classes in custom Type class name', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type User {
          id: Int
        }
      `);
      const config: PhpResolversPluginRawConfig = {
        className: 'MyGqlTypes',
      };
      const result = await plugin(schema, [], config, { outputFile: '' });
      expect(result).toContain('public class MyGqlTypes {');
    });

    it('Should prefix wrap name with @ when custom class name is a reserved keyword', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type User {
          id: Int
        }
      `);
      const config: PhpResolversPluginRawConfig = {
        className: 'public',
      };
      const result = await plugin(schema, [], config, { outputFile: '' });
      expect(result).toContain('public class @public {');
    });

    it('Should generate properties for types', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type User {
          id: Int
          email: String
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });
      expect(result).toBeSimilarStringTo(`
        [JsonProperty("id")]
        public ?int $id;
        [JsonProperty("email")]
        public string $email;
      `);
    });

    it('Should generate summary header for class and properties', async () => {
      const schema = buildSchema(/* GraphQL */ `
        """
        User values
        """
        type User {
          """
          User id
          """
          id: Int!
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });

      expect(result).toBeSimilarStringTo(`
        /// <summary>
        /// User values
        /// </summary>
        public class User {
      `);
      expect(result).toBeSimilarStringTo(`
        /// <summary>
        /// User id
        /// </summary>
        [JsonProperty("id")]
        public int $id;
      `);
    });

    it('Should mark deprecated properties with Obsolete attribute', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type User {
          age: Int @deprecated
          refid: String @deprecated(reason: "Field is obsolete, use id")
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });

      expect(result).toBeSimilarStringTo(`
        [Obsolete("Field no longer supported")]
        [JsonProperty("age")]
        public ?int $age;
      `);
      expect(result).toBeSimilarStringTo(`
        [Obsolete("Field is obsolete, use id")]
        [JsonProperty("refid")]
        public string $refid;
      `);
    });

    it('Should prefix class name with @ when type name is a reserved keyword', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type class {
          id: Int!
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });

      expect(result).toContain('public class @class {');
    });
  });

  describe('Interfaces', () => {
    it('Should generate PHP interface from gql interface', async () => {
      const schema = buildSchema(/* GraphQL */ `
        interface Node {
          id: ID!
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });

      expect(result).toContain('public interface Node {');
    });

    it('Should generate PHP class that implements given interfaces', async () => {
      const schema = buildSchema(/* GraphQL */ `
        interface INode {
          id: ID!
        }
        interface INameNode {
          username: String!
        }

        type User implements INode & INameNode {
          id: ID!
          username: String!
        }
      `);
      const result = await plugin(schema, [], {}, { outputFile: '' });

      expect(result).toContain('public interface INode {');
      expect(result).toContain('public class User : INode, INameNode {');
    });
  });

  describe('GraphQL Value Types', () => {
    describe('Scalar', () => {
      it('Should generate properties for mandatory scalar types', async () => {
        const schema = buildSchema(/* GraphQL */ `
          input BasicTypeInput {
            intReq: Int!
            fltReq: Float!
            idReq: ID!
            strReq: String!
            boolReq: Boolean!
          }
        `);
        const result = await plugin(schema, [], {}, { outputFile: '' });

        expect(result).toBeSimilarStringTo(`
          [JsonRequired]
          public int $intReq;
          [JsonRequired]
          public float $fltReq;
          [JsonRequired]
          public string $idReq;
          [JsonRequired]
          public string $strReq;
          [JsonRequired]
          public bool $boolReq;
        `);
      });

      it('Should generate properties for optional scalar types', async () => {
        const schema = buildSchema(/* GraphQL */ `
          input BasicTypeInput {
            intOpt: Int
            fltOpt: Float
            idOpt: ID
            strOpt: String
            boolOpt: Boolean
          }
        `);
        const result = await plugin(schema, [], {}, { outputFile: '' });

        expect(result).toBeSimilarStringTo(`
          public ?int $intOpt;
          public ?float $fltOpt;
          public string $idOpt;
          public string $strOpt;
          public ?bool $boolOpt;
        `);
      });
    });

    describe('Array', () => {
      it('Should use default list type for arrays', async () => {
        const schema = buildSchema(/* GraphQL */ `
          input ArrayInput {
            arr: [Int!]
          }
        `);
        const result = await plugin(schema, [], {}, { outputFile: '' });
        expect(result).toBeSimilarStringTo('public List<int> $arr;');
      });

      it('Should use custom list type for arrays when listType is specified', async () => {
        const schema = buildSchema(/* GraphQL */ `
          input ArrayInput {
            arr: [Int!]
          }
        `);
        const result1 = await plugin(schema, [], { listType: 'IEnumerable' }, { outputFile: '' });
        expect(result1).toContain('public IEnumerable<int> $arr;');

        const result2 = await plugin(schema, [], { listType: 'HashSet' }, { outputFile: '' });
        expect(result2).toContain('public HashSet<int> $arr;');
      });

      it('Should use correct array inner types', async () => {
        const schema = buildSchema(/* GraphQL */ `
          input ArrayInput {
            arr1: [Int!]
            arr2: [Float]
            arr3: [Int]!
            arr4: [Boolean!]!
          }
        `);
        const config: PhpResolversPluginRawConfig = {
          listType: 'IEnumerable',
        };
        const result = await plugin(schema, [], config, { outputFile: '' });

        expect(result).toBeSimilarStringTo(`
          public IEnumerable<int> $arr1;
          public IEnumerable<?float> $arr2;
          [JsonRequired]
          public IEnumerable<?int> $arr3;
          [JsonRequired]
          public IEnumerable<bool> $arr4;
        `);
      });

      it('Should handle nested array types', async () => {
        const schema = buildSchema(/* GraphQL */ `
          type Complex {
            arrA: [Boolean]
          }
          input ArrayInput {
            arr1: [[Int!]]
            arr2: [[[Float]!]!]!
            arr3: [[Complex]]!
          }
        `);
        const config: PhpResolversPluginRawConfig = {
          listType: 'IEnumerable',
        };
        const result = await plugin(schema, [], config, { outputFile: '' });

        expect(result).toBeSimilarStringTo(`
          public IEnumerable<IEnumerable<int>> $arr1;
          [JsonRequired]
          public IEnumerable<IEnumerable<IEnumerable<?float>>> $arr2;
          [JsonRequired]
          public IEnumerable<IEnumerable<Complex>> $arr3;
        `);
      });
    });

    describe('Reserved keywords', () => {
      it('Should prefix with @ when name is a reserved keyword', async () => {
        const schema = buildSchema(/* GraphQL */ `
          input ReservedInput {
            int: Int
            float: Float
            string: String
            bool: Boolean
          }
        `);
        const result = await plugin(schema, [], {}, { outputFile: '' });

        expect(result).toBeSimilarStringTo(`
          public ?int $int;
          public ?float $float;
          public string $string;
          public ?bool $bool;
        `);
      });
    });
  });

  describe('Default Values', () => {
    it('Should mark required fields optional when a default value is assigned', async () => {
      const schema = buildSchema(/* GraphQL */ `
        enum Length {
          None
          Short
          Long
        }
        input InitialInput {
          val: Int! = 5
          flt: Float! = 3.1415
          str: ID! = "Dummy string"
          flag: Boolean! = true
          hair: Length! = Short
        }
      `);
      const config: PhpResolversPluginRawConfig = {
        listType: 'HashSet',
      };
      const result = await plugin(schema, [], config, { outputFile: '' });

      expect(result).toBeSimilarStringTo(`
        public ?int $val;
        public ?float $flt;
        public string $str;
        public ?bool $flag;
        public ?Length $hair;
      `);
    });

    it('Should mark required arrays optional when a default value is assigned', async () => {
      const schema = buildSchema(/* GraphQL */ `
        input InitialInput {
          arr1: [Int] = [null, 2, 3]
          arr2: [Int!] = [1, 2, 3]
          arr3: [String]! = ["a", null, "c"]
          arr4: [String!]! = ["a", "b", "c"]
        }
      `);
      const config: PhpResolversPluginRawConfig = {
        listType: 'HashSet',
      };
      const result = await plugin(schema, [], config, { outputFile: '' });

      expect(result).toBeSimilarStringTo(`
        public HashSet<?int> $arr1;
        public HashSet<int> $arr2;
        public HashSet<string> $arr3;
        public HashSet<string> $arr4;
      `);
    });
  });
});
