import { Type, ValidationError, ValidationResult } from '../core';

export class ArrayType extends Type {
    subSchema : Type;

    constructor ( subSchema : Type ) {
        super();

        this.subSchema = subSchema;
    }

    validate ( data : any ) : ValidationResult {
        if ( data instanceof Array ) {
            const errors = data.map( ( item, index ) => {
                    const errors = this.subSchema.validate( item );

                    if ( errors instanceof Array ) {
                        return errors.map( err => err.prefix( index.toString() ) );
                    } else if ( errors !== null ) {
                        return errors.prefix( index.toString() );
                    }
                } )
                .filter( error => error != null )
                .reduce( ( arr, errors ) => {
                    if ( errors instanceof Array ) {
                        arr.push( ...errors );
                    } else {
                        arr.push( errors )
                    }

                    return arr;
                }, [] as any[] );

                if ( errors.length === 0 ) {
                    return null;
                }

                return errors;
        }

        return new ValidationError( 'Array', typeof data );
    }

    run ( data : any ) {
        if ( data instanceof Array ) {
            return data.map( entry => this.subSchema.run( entry ) );
        }
        
        return data;
    }
}
