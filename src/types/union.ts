import { Type, ValidationError, ValidationResult } from '../core';

export class UnionType extends Type {
    typeSchemas: Type[];
    
    constructor ( ...typeSchemas: Type[] ) {
        super();

        this.typeSchemas = typeSchemas;
    }
    
    validate ( data : any ) : ValidationResult {
        const errors: ValidationError[] = [];

        for ( const schema of this.typeSchemas ) {
            const schemaErrors = schema.validate( data );

            if ( schemaErrors === null ) {
                return null;
            }

            if ( schemaErrors instanceof Array ) {
                errors.push( ...schemaErrors );
            } else {
                errors.push( schemaErrors );
            }
        }

        if ( errors.length === 0 ) {
            return null;
        }

        return errors;
    }

    run ( data : any ) {
        for ( const schema of this.typeSchemas ) {
            const schemaErrors = schema.validate( data );

            if ( schemaErrors === null ) {
                return schema.run( schema );
            }
        }

        return data;
    }
}
