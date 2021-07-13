export {
    ValidationError,
    ValidationResult,
    errorsToString,
    throwIfErrors,
    Type, 
} from './core';

export * from './types';

export {
    TypesDictionary,

    parse,
    parseFile,
    parseFileSync,
    parseMany,

    stringify,
    stringifyMany,
} from './parser';

export {
    AstSchemaIdentifiers,
    AstIdentifiers,
    AstOptions,
} from './options';

export { 
    Transformer,
    GroupTransformer,
    
    FromAstTransformer,
    FromAstGroupTransformer,
    fromAst,

    ToAstTransformer,
    ToAstGroupTransformer,
    toAst,
} from './transformer';

import { mergeAdvanced } from 'object-merge-advanced';
import { Type } from './core';
import { Extension } from './extension';
import { Identifier } from './identifiers';
import { AstOptions, AstPartialOptions } from './options';
import * as types from './types';

// Extensions
import { NumberExtension } from './types/number';
import { BooleanExtension } from './types/boolean';
import { DateExtension } from './types/date';
import { StringExtension } from './types/string';

export const extensions: Extension[] = [
    new NumberExtension(),
    new BooleanExtension(),
    new DateExtension(),
    new StringExtension(),
];

export function createDefaultOptions ( customOptions: AstPartialOptions = {} ): AstOptions {
    let options: AstPartialOptions = {
        extensions: [ ...extensions ],
        defaultNumberStrict: true,
        defaultBooleanStrict: true,
        identifiers: {
            Number: new Identifier( 'Number' ),
            String: new Identifier( 'String' ),
            Boolean: new Identifier( 'Boolean' ),
            RegExp: new Identifier( 'RegExp' ),
            Array: new Identifier( 'Array' ),
            Object: new Identifier( 'Object' ),
        },
        references: [],
    };

    if ( customOptions.extensions ) {
        options.extensions.push( ...customOptions.extensions );
    }

    for ( const extension of options.extensions ) {
        options = extension.install( options as AstOptions ) || options;
    }

    return mergeAdvanced( options as AstOptions, customOptions, {
        hardArrayConcat: true,
    } );
}

export function normalize ( schema : any ) : Type {
    if ( schema instanceof Type ) {
        return schema;
    } else if ( schema instanceof Array ) {
        if ( schema.length == 0 ) {
            return new types.ArrayType( new types.AnyType() );
        } else if ( schema.length == 1 ) {
            return new types.ArrayType( normalize( schema[ 0 ] ) );
        } else {
            return new types.TupleType( schema.map( normalize ) );
        }
    } else if ( schema === String ) {
        return new types.StringType();
    } else if ( schema === Number ) {
        return new types.NumberType();
    } else if ( schema === Boolean ) {
        return new types.BooleanType();
    } else if ( typeof schema === 'object' ) {
        const subSchema: Record<string, Type> = {};

        for ( let key of Object.keys( schema ) ) {
            subSchema[ key ] = normalize( schema[ key ] );
        }

        return new types.ObjectType( schema );
    } else {
        return new types.ConstantType( schema );
    }
}
