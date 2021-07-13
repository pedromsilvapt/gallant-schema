import { Type, ValidationResult, ValidationError } from '../core';

export class IntersectionType extends Type {
    typeSchemas: Type[];
    
    constructor ( ...typeSchemas: Type[] ) {
        super();

        this.typeSchemas = typeSchemas;
    }

    validate ( data : any ) : ValidationResult {
        const errors: ValidationError[] = [];

        for ( const schema of this.typeSchemas ) {
            const schemaErrors = schema.validate( data );

            if ( schemaErrors instanceof Array ) {
                errors.push( ...schemaErrors );
            } else if ( schemaErrors != null ) {
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
            data = schema.run( data );
        }

        return data;
    }
}
