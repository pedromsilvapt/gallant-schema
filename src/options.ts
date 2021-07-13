import { Type } from './core';
import type { Extension } from './extension';
import { Identifier } from './identifiers';

export type DeepPartial<T extends object> = {
    [K in keyof T] ?: 
        T[K] extends Array<any>
            ? T[K] :
        T[K] extends object 
            ? DeepPartial<T[K]> 
            : T[K];
};

export type AstPartialOptions = DeepPartial<AstOptions>;

export interface AstOptions {
    extensions: Extension[];
    identifiers: AstIdentifiers;
    references: AstReference[];
    defaultNumberStrict: boolean;
    defaultBooleanStrict: boolean;
}

export interface AstReference {
    identifier: Identifier | (( identifiers: AstIdentifiers ) => Identifier);
    classType?: { new ( ...args: any[] ): Type };
    factory?: ( options: AstOptions, ...types: Type[] ) => Type;
}

export interface AstIdentifiers {
    Number: Identifier;
    String: Identifier;
    Boolean: Identifier;
    RegExp: Identifier;
    Array: Identifier;
    Object: Identifier;
    schema: AstSchemaIdentifiers;
}

export interface AstSchemaIdentifiers {}