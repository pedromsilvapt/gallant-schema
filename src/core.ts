// import * as types from './types';

export class ValidationError {
    expected : string[];
    received : string;
    property ?: string;

    constructor ( expected : string[] | string, received : string, property : string = null ) {
        this.property = property;
        
        if ( expected instanceof Array ) {
            this.expected = expected;
        } else {
            this.expected = [ expected ];
        }

        this.received = received;
    }

    prefix ( property : string ) : ValidationError {
        if ( this.property == null ) {
            return new ValidationError( this.expected, this.received, property );
        }

        return new ValidationError( this.expected, this.received, property + '.' + this.property );
    }

    get message () {
        const expectations = `Expected ${ this.expected.join( ', ' ) }, got ${ this.received } instead.`;

        if ( this.property !== null ) {
            return `${ this.property }: ${ expectations }`
        } else {
            return expectations;
        }
    }

    public static prefix ( errors : ValidationResult, property : string ) : ValidationResult {
        if ( !errors ) {
            return  null;
        }

        if ( errors instanceof Array ) {
            return errors.map( error => error.prefix( property ) );
        } else {
            return errors.prefix( property );
        }
    }

    public static toString ( errors ?: ValidationResult ) : string {
        if ( !errors ) {
            return  null;
        }

        if ( errors instanceof Array ) {
            return errors.map( error => error.message ).join( '\n' );
        } else {
            return errors.message;
        }
    }

    public static throwIf ( errors ?: ValidationResult ) : void {
        if ( !errors ) {
            return;
        }

        throw new Error( ValidationError.toString( errors ) );
    }
}

export type ValidationResult = null | ValidationError | ValidationError[];

export function errorsToString ( result: ValidationResult ) : string {
    return ValidationError.toString( result );
}

export function throwIfErrors ( result: ValidationResult ) {
    return ValidationError.throwIf( result );
}

export abstract class Type<T = any> {
    abstract validate ( data : any ) : ValidationResult;

    public assert ( data : any ) : asserts data is T {
        const errors = this.validate( data );

        if ( errors != null ) {
            throw new Error( errorsToString( errors ) );
        }
    }

    public run ( data : any ) : T {
        return data;
    }
}
