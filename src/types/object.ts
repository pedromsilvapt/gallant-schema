import { Type, ValidationError, ValidationResult } from '../core';

export class ObjectType extends Type {
    subSchema : Record<string, Type>;

    // If true, keys that are not defined in the schema are not allowed
    strict : boolean;

    constructor ( subSchema : Record<string, Type>, strict : boolean = false ) {
        super();

        this.subSchema = subSchema;

        this.strict = strict;
    }

    validate ( data : any ) : ValidationResult {
        if ( data && typeof data === 'object' ) {
            const errors : ValidationError[] = [];

            const requiredKeys = new Set( Object.keys( this.subSchema ) );

            for ( let key of Object.keys( data ) ) {
                if ( !( key in this.subSchema ) && this.strict ) {
                    errors.push( new ValidationError( 'Undefined', typeof data[ key ], key ) )
                } else if ( key in this.subSchema ) {
                    requiredKeys.delete( key );

                    const keyErrors = this.subSchema[ key ].validate( data[ key ] );

                    if ( keyErrors instanceof Array ) {
                        errors.push( ...keyErrors.map( error => error.prefix( key ) ) );
                    } else if ( keyErrors !== null ) {
                        errors.push( keyErrors.prefix( key ) );
                    }
                }
            }

            for ( let key of requiredKeys ) {
                const keyErrors = this.subSchema[ key ].validate( void 0 );

                if ( keyErrors instanceof Array ) {
                    errors.push( ...keyErrors.map( error => error.prefix( key ) ) );
                } else if ( keyErrors !== null ) {
                    errors.push( keyErrors.prefix( key ) );
                }
            }

            if ( errors.length === 0 ) {
                return null;
            }

            return errors;
        }

        return new ValidationError( 'Object', typeof data );
    }

    run ( data : any ) {
        const requiredKeys = new Set( Object.keys( this.subSchema ) );

        const result : any = {};

        for ( let key of Object.keys( data ) ) {
            if ( key in this.subSchema ) {
                requiredKeys.delete( key );

                result[ key ] = this.subSchema[ key ].run( data[ key ] );
            } else {
                result[ key ] = data[ key ];
            }
        }

        for ( let key of requiredKeys ) {
            result[ key ] = this.subSchema[ key ].run( data[ key ] );
        }

        return result;
    }
}
