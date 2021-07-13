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
    defaultObjectStrict: boolean;
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

export function deepMerge<A, B> ( objA: A, objB: B ): A & B {
    if ( objB === void 0 ) {
        return objA as A & B;
    }
    
    if ( objA instanceof Array && objB instanceof Array ) {
        return objA.concat( objB ) as any;
    } else if ( typeof objA === 'object' && typeof objB === 'object' ) {
        const result = {} as any;

        if ( objA != null ) {
            for ( const key of Object.keys( objA ) ) {
                result[ key ] = deepMerge( (objA as any)[ key ], (objB as any)?.[ key ] );
            }
        }

        if ( objB != null ) {
            for ( const key of Object.keys( objB ) ) {
                if ( !( key in result ) ) {
                    result[ key ] = ( objB as any )[ key ];
                }
            }
        }

        return result;
    } else {
        return objB as A & B;
    }    
}