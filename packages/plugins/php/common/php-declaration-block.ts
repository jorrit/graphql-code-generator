import { indentMultiline } from '@graphql-codegen/visitor-plugin-common';
import { StringValueNode, NameNode } from 'graphql';
import { transformComment } from './utils';

export type Access = 'private' | 'public' | 'protected';
export type Kind = 'class' | 'interface' | 'enum';

export class PhpDeclarationBlock {
  _name: string = null;
  _extendStr: string[] = [];
  _implementsStr: string[] = [];
  _kind: Kind = null;
  _access: Access = null;
  _final = false;
  _static = false;
  _block = null;
  _comment = null;
  _annotations: string[] = [];
  _nestedClasses: PhpDeclarationBlock[] = [];

  nestedClass(nstCls: PhpDeclarationBlock): PhpDeclarationBlock {
    this._nestedClasses.push(nstCls);

    return this;
  }

  access(access: Access | null): PhpDeclarationBlock {
    this._access = access;

    return this;
  }

  asKind(kind: Kind): PhpDeclarationBlock {
    this._kind = kind;

    return this;
  }

  final(): PhpDeclarationBlock {
    this._final = true;

    return this;
  }

  static(): PhpDeclarationBlock {
    this._static = true;

    return this;
  }

  annotate(annotations: string[]): PhpDeclarationBlock {
    this._annotations = annotations;

    return this;
  }

  withComment(comment: string | StringValueNode | null): PhpDeclarationBlock {
    if (comment) {
      this._comment = transformComment(comment, 1);
    }

    return this;
  }

  withBlock(block: string): PhpDeclarationBlock {
    this._block = block;

    return this;
  }

  extends(extendStr: string[]): PhpDeclarationBlock {
    this._extendStr = extendStr;

    return this;
  }

  implements(implementsStr: string[]): PhpDeclarationBlock {
    this._implementsStr = implementsStr;

    return this;
  }

  withName(name: string | NameNode): PhpDeclarationBlock {
    this._name = typeof name === 'object' ? (name as NameNode).value : name;

    return this;
  }

  public get string(): string {
    let result = '';

    if (this._kind) {
      let name = '';

      if (this._name) {
        name = this._name;
      }

      let extendStr = '';
      let implementsStr = '';
      let annotatesStr = '';
      const final = this._final ? ' final' : '';
      const isStatic = this._static ? ' static' : '';

      if (this._extendStr.length > 0) {
        extendStr = ` : ${this._extendStr.join(', ')}`;
      }

      if (this._implementsStr.length > 0) {
        implementsStr = ` : ${this._implementsStr.join(', ')}`;
      }

      if (this._annotations.length > 0) {
        annotatesStr = this._annotations.map(a => `@${a}`).join('\n') + '\n';
      }

      result += `${annotatesStr}${this._access}${isStatic}${final} ${this._kind} ${name}${extendStr}${implementsStr} `;
    }

    const nestedClasses = this._nestedClasses.length
      ? this._nestedClasses.map(c => indentMultiline(c.string)).join('\n\n')
      : null;
    const before = '{';
    const after = '}';
    const block = [before, nestedClasses, this._block, after].filter(f => f).join('\n');
    result += block;

    return (this._comment ? this._comment : '') + result + '\n';
  }
}
