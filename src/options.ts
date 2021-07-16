import { Type } from './core';
import type { Extension } from './extension';
import { Identifier } from './identifiers';
import { FromAstGroupTransformer, ToAstGroupTransformer } from './transformer';

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

    fromAstTransformer: FromAstGroupTransformer;
    toAstTransformer: ToAstGroupTransformer;

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

export interface DeepMergeOptions {
    exclude?: string[];
}

export function deepMerge<A, B> ( objA: A, objB: B, opts?: DeepMergeOptions ): A & B {
    if ( objB === void 0 ) {
        return objA as A & B;
    }
    
    if ( objA instanceof Array && objB instanceof Array ) {
        return objA.concat( objB ) as any;
    } else if ( typeof objA === 'object' && typeof objB === 'object' ) {
        var proto = Object.getPrototypeOf( objA );
        
        // Plain object
        if ( proto === Object.prototype || proto === null ) {
            const result = {} as any;
    
            if ( objA != null ) {
                for ( const key of Object.keys( objA ) ) {
                    if ( opts?.exclude != null && key in opts.exclude ) {
                        // If this key is in the exclude array, then copy only the original value (from objA)
                        // instead of merging it with the value from objB
                        result[ key ] = objA;
                    } else {
                        result[ key ] = deepMerge( (objA as any)[ key ], (objB as any)?.[ key ] );
                    }
                }
            }
    
            if ( objB != null ) {
                for ( const key of Object.keys( objB ) ) {
                    if ( !( key in result ) ) {
                        if ( opts?.exclude != null && key in opts.exclude ) {
                            continue;
                        }
    
                        result[ key ] = ( objB as any )[ key ];
                    }
                }
            }
    
            return result;
        } else {
            return objB as any;
        }
    } else {
        return objB as A & B;
    }    
}