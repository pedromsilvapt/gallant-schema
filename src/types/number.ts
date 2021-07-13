import { Type, ValidationError } from '../core';
import { Extension } from '../extension';
import { Identifier } from '../identifiers';
import { AstPartialOptions, AstReference } from '../options';

export interface NumberLike { }

export class NumberType extends Type {
    // When strict is false, strings that contain valid 
    // numeric representations are accepted as well
    public strict: boolean;
    
    public constructor ( strict: boolean = true ) {
        super();

        this.strict = strict;
    }

    validate ( data : any ) {
        if ( typeof data === 'number' ) {
            return null;
        }

        if ( this.strict === false && typeof data === 'string' ) {
            try {
                parseInt(data);

                return null;
            } catch {}
        }

        return new ValidationError( 'Number', typeof data );
    }

    run ( data : any ) {
        return data;
    }
}

declare module "../options" {
    export interface AstSchemaIdentifiers {
        NumberLike: Identifier;
    }
}

export class NumberExtension extends Extension {
    defaultOptions: AstPartialOptions = {
        identifiers: {
            schema: {
                NumberLike: new Identifier('schema.NumberLike'),
            },
        },
        references: [
            {
                identifier: id => id.schema.NumberLike,
                factory: () => new NumberType( false ),
            }
        ]
    }
}
