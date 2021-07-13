import { Type, ValidationError, ValidationResult } from '../core';
import { Extension } from '../extension';
import { Identifier } from '../identifiers';
import { AstPartialOptions } from '../options';
import { ConstantType } from './constant';

export interface MaxLen<L extends number> {}

export interface MinLen<L extends number> {}

export interface Email {}

export class StringType extends Type {
    validate ( data : any ) : ValidationResult {
        if ( typeof data === 'string' ) {
            return null;
        }

        return new ValidationError( 'String', typeof data );
    }
}

export class MinLenType extends Type {
    public value: number;

    public constructor ( value : number ) {
        super();

        this.value = value;
    }

    validate ( data : any ) : ValidationResult {
        if ( typeof data === 'string' ) {
            if ( data.length >= this.value ) {
                return null;
            }

            return new ValidationError( '>= ' + this.value, '' + data.length, 'length' );
        }

        return null;
    }
}

export class MaxLenType extends Type {
    public value: number;

    public constructor ( value : number ) {
        super();

        this.value = value;
    }

    validate ( data : any ) : ValidationResult {
        if ( typeof data === 'string' ) {
            if ( data.length >= this.value ) {
                return null;
            }

            return new ValidationError( '<= ' + this.value, '' + data.length, 'length' );
        }

        return null;
    }
}

const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

export class EmailType extends Type {
    validate ( data : any ) : ValidationResult {
        if ( typeof data === 'string' ) {
            if ( emailRegex.test( data ) ) {
                return null;
            }

            return new ValidationError( 'email format', 'invalid format' );
        }

        return null;
    }
}

declare module "../options" {
    export interface AstSchemaIdentifiers {
        MinLen: Identifier;
        MaxLen: Identifier;
        Email: Identifier;
    }
}

export class StringExtension extends Extension {
    defaultOptions: AstPartialOptions = {
        identifiers: {
            schema: {
                MinLen: new Identifier('schema.MinLen'),
                MaxLen: new Identifier('schema.MaxLen'),
                Email: new Identifier('schema.Email'),
            }
        },
        references: [
            {
                identifier: id => id.schema.MinLen,
                factory: ( opts, n: ConstantType ) => new MinLenType( n.constant ),
            },
            {
                identifier: id => id.schema.MaxLen,
                factory: ( opts, n: ConstantType ) => new MaxLenType( n.constant ),
            },
            {
                identifier: id => id.schema.Email,
                factory: () => new EmailType(),
            }
        ]
    }
}
