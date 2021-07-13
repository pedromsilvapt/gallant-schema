import { Type, ValidationError } from '../core';
import { Extension } from '../extension';
import { Identifier } from '../identifiers';
import { AstPartialOptions } from '../options';

export interface BooleanLike { }

export class BooleanType extends Type {
    // When strict is false, strings that contain valid 
    // boolean representations are accepted as well
    public strict: boolean;
    
    public constructor ( strict: boolean = true ) {
        super();

        this.strict = strict;
    }

    validate ( data : any ) {
        if ( typeof data === 'boolean' ) {
            return null;
        }

        if ( this.strict === false ) {
            if ( data === 'true' || data === 'TRUE' || data === 'false' || data === 'FALSE' ) {
                return null;
            }
        }

        return new ValidationError( 'Boolean', typeof data );
    }

    run ( data : any ) {
        return data;
    }
}

declare module "../options" {
    export interface AstSchemaIdentifiers {
        BooleanLike: Identifier;
    }
}

export class BooleanExtension extends Extension {
    defaultOptions: AstPartialOptions = {
        identifiers: {
            schema: {
                BooleanLike: new Identifier('schema.BooleanLike'),
            },
        },
        references: [
            {
                identifier: id => id.schema.BooleanLike,
                factory: () => new BooleanType( false ),
            }
        ]
    }
}