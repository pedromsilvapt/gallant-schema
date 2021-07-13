import { Type, ValidationResult } from '../core';

export class AnyType extends Type {
    validate () : ValidationResult {
        return null;
    }

    run ( data : any ) {
        return data;
    }
}
