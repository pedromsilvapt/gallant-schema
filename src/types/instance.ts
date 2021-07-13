import { Type, ValidationError, ValidationResult } from '../core';

export class InstanceType<T = any> extends Type<T> {
    public classType: any;

    public constructor ( classType: any ) {
        super();

        this.classType = classType;
    }

    validate ( data : any ) : ValidationResult {
        if ( data instanceof this.classType ) {
            return null;
        }

        const actualType = typeof data === 'object'
            ? data?.constructor.name
            : typeof data;

        return new ValidationError( this.classType.name, actualType );
    }

    run ( data: any ) : T {
        return data;
    }
}
