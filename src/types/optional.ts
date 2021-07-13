import { Type, ValidationResult } from '../core';

export class OptionalType extends Type {
    subSchema : Type;

    defaultValue : any = null;

    constructor ( subSchema : Type, defaultValue : any = null ) {
        super();

        this.subSchema = subSchema;

        this.defaultValue = defaultValue;
    }

    validate ( data : any ) : ValidationResult {
        if ( data === null || data === void 0 ) {
            return null;
        }

        return this.subSchema.validate( data );
    }

    run ( data : any ) {
        if ( data === null || data === void 0 ) {
            data = this.defaultValue;
        }

        return this.subSchema.run( data );
    }
}
