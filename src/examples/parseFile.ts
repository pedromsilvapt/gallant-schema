import * as schema from '../main';
// Import the file so we can use it in typescript as a type
import * as HttpSchema from './httpSchema';

// Read the file (if not found, tries to look up a .ts and then a .d.ts file as with the same name)
// The explicit type is required by Typescript for using the `assert` method later on
const bodySchema: schema.Type<HttpSchema.Request> = schema.parseFileSync( __dirname, 'httpSchema' ).get( 'Request' );

// Let's declare our obj as unknown to simulate the usecase of receiving input from the user: we won't know what it is
const obj: unknown = {
    username: 'foo',
    password: 'bar',
    email: 'foobar.com',
    birthdate: new Date()
};

// Try commening this line and verify that TypeScript no longer recognizes the line 
// `obj.username` as valid
bodySchema.assert( obj );

console.log( 'Schema validated with success (an exception would have been thrown otherwise!)' );
console.log( 'Registered username ' + obj.username);
