import * as schema from '../main';

const bodySchema = schema.parse( `{
    username: string;
    password: string & schema.MinLen<8>;
    email: string & schema.Email;
    birthdate: Date;
}` );

const bodyErrors = bodySchema.validate({
    username: 'foo',
    password: 'bar',
    email: 'foobar.com',
    birthdate: new Date()
});

if ( bodyErrors != null ) {
    // Convert the error(s) to a string
    console.error( schema.errorsToString( bodyErrors ) );
} else {
    console.log( 'Schema validated with success.' );
}
