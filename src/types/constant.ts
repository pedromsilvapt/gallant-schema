import { Type, ValidationError, ValidationResult } from '../core';

export class ConstantType extends Type {
    constant : any = null;

    constructor ( constant : any ) {
        super();

        this.constant = constant;
    }

    validate ( data : any ) : ValidationResult {
        if ( data == this.constant ) {
            return null;
        }

        return new ValidationError( `"${ this.constant }"`, `"${ data }"` );
    }

    run ( data : any ) {
        return this.constant;
    }
}