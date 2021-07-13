# @gallant/schema

> Library to handle schema validation by re-using existing Typescript interface and type declarations

# Installation
```shell
npm install --save @gallant/schema
```

# Usage
```typescript
import * as schema from '@gallant/schema';

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
```

The output of this program should be:
```
password.length: Expected >= 8, got 3 instead.
email: Expected email format, got invalid format instead.
```

This is all fine and dandy, but nothing extraordinary, because our type is just a string,
which means we cannot use it to typecheck during compile-time. What would really spark joy would be
to be to have a single source of truth: have the interface be usable by TypeScript at compile time for
type-checking and by the schema library at runtime for validation. And we can!

First let's create a small file `httpSchema.ts` with the following contents:
```typescript
import * as schema from '@gallant/schema';

export interface Request {
    username: string;
    password: string & schema.MinLen<8>;
    email: string & schema.Email;
    birthdate: Date;
}
```

Note that the interface schema we declared is totally valid TypeScript. Obviously the
constraints such as `schema.MinLen` and `schema.Email` cannot be validated at compile time by
TypeScript, since the values will only be known at runtime, but they do not interfere with the type declarations.
And they enable us to parse the file at runtime to generate the validation code:

```typescript
import * as schema from '@gallant/schema';
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
```
