import * as test from 'tape-catch';
import * as schema from '../main';

test( 'parser literals', function ( t: test.Test ) {
    // String
    let type = schema.parse(`"test"`);
    t.assert( type instanceof schema.ConstantType, "Type is a constant" );
    t.equals( type.constant, "test", "Expect instance value property to be \"test\"" );

    type = schema.parse(`'test'`);
    t.assert( type instanceof schema.ConstantType, "Type is a constant" );
    t.equals( type.constant, "test", "Expect instance value property to be \"test\"" );
    
    type = schema.parse(`1`);
    t.assert( type instanceof schema.ConstantType, "Type is a constant" );
    t.equals( type.constant, 1, "Expect instance value property to be 1" );

    type = schema.parse(`true`);
    t.assert( type instanceof schema.ConstantType, "Type is a constant" );
    t.equals( type.constant, true, "Expect instance value property to be true" );

    type = schema.parse(`false`);
    t.assert( type instanceof schema.ConstantType, "Type is a constant" );
    t.equals( type.constant, false, "Expect instance value property to be false" );

    type = schema.parse(`2.56`);
    t.assert( type instanceof schema.ConstantType, "Type is a constant" );
    t.equals( type.constant, 2.56, "Expect instance value property to be 2.56" );

    type = schema.parse(`undefined`);
    t.assert( type instanceof schema.ConstantType, "Type is a constant" );
    t.equals( type.constant, undefined, "Expect instance value property to be undefined" );

    type = schema.parse(`void`);
    t.assert( type instanceof schema.ConstantType, "Type is a constant" );
    t.equals( type.constant, undefined, "Expect instance value property to be undefined" );

    type = schema.parse(`void 0`);
    t.assert( type instanceof schema.ConstantType, "Type is a constant" );
    t.equals( type.constant, undefined, "Expect instance value property to be undefined" );

    t.end();
} );

test( 'parser keywords', function ( t: test.Test ) {
    let type = schema.parse(`number`);
    t.assert( type instanceof schema.NumberType, "Type is a number" );

    type = schema.parse(`Number`);
    t.assert( type instanceof schema.NumberType, "Type is a number" );

    type = schema.parse(`schema.NumberLike`);
    t.assert( type instanceof schema.NumberType, "Type is a number" );
    t.equals( type.strict, false, "Number is not strict" );
    
    type = schema.parse(`number`, schema.createDefaultOptions( { defaultNumberStrict: false } ) );
    t.assert( type instanceof schema.NumberType, "Type is a number" );
    t.equals( type.strict, false, "Number is not strict" );
    
    type = schema.parse(`string`);
    t.assert( type instanceof schema.StringType, "Type is a string" );
    
    type = schema.parse(`String`);
    t.assert( type instanceof schema.StringType, "Type is a string" );
    
    type = schema.parse(`boolean`);
    t.assert( type instanceof schema.BooleanType, "Type is a boolean" );
    
    type = schema.parse(`Boolean`);
    t.assert( type instanceof schema.BooleanType, "Type is a boolean" );
    
    type = schema.parse(`schema.BooleanLike`);
    t.assert( type instanceof schema.BooleanType, "Type is a boolean" );
    t.equals( type.strict, false, "Boolean is not strict" );
    
    t.end();
} );

test( 'parser object', function ( t: test.Test ) {
    let type = schema.parse(`{}`);
    t.assert( type instanceof schema.ObjectType, "Type is an object" );
    t.equals( type.strict, false, "Object is strict" );
    t.equals( Object.keys(type.subSchema).length, 0, "Object has no members" );

    type = schema.parse(`object`);
    t.assert( type instanceof schema.ObjectType, "Type is an object" );
    t.equals( type.strict, false, "Object is not strict" );
    t.equals( Object.keys(type.subSchema).length, 0, "Object has no members" );

    type = schema.parse(`Object`);
    t.assert( type instanceof schema.ObjectType, "Type is an object" );
    t.equals( type.strict, false, "Object is not strict" );
    t.equals( Object.keys(type.subSchema).length, 0, "Object has no members" );
    
    type = schema.parse(`{
        fieldString: string;
        fieldNumber: number;
        fieldOptional?: number;
    }`);
    t.assert( type instanceof schema.ObjectType, "Type is an object" );
    t.equals( type.strict, false, "Object is strict" );
    t.equals( Object.keys(type.subSchema).length, 3, "Object has 3 members" );
    t.assert( type.subSchema['fieldString'] instanceof schema.StringType, "Object member 'fieldString' is a string" );
    t.assert( type.subSchema['fieldNumber'] instanceof schema.NumberType, "Object member 'fieldNumber' is a number" );
    t.assert( type.subSchema['fieldOptional'] instanceof schema.OptionalType, "Object member 'fieldOptional' is optional" );
    t.assert( type.subSchema['fieldOptional'].subSchema instanceof schema.NumberType, "Object member 'fieldOptional' sub-type is a number" );

    t.end();
} );

test( 'parser array and tuples', function ( t: test.Test ) {
    let type = schema.parse(`any[]`);
    t.assert( type instanceof schema.ArrayType, "Type is an array" );
    t.assert( type.subSchema instanceof schema.AnyType, "Array element type is any" );

    type = schema.parse(`Array<number>`);
    t.assert( type instanceof schema.ArrayType, "Type is an array" );
    t.assert( type.subSchema instanceof schema.NumberType, "Array element type is number" );

    type = schema.parse(`Array`);
    t.assert( type instanceof schema.ArrayType, "Type is an array" );
    t.assert( type.subSchema instanceof schema.AnyType, "Array element type is any" );

    type = schema.parse(`[]`);
    t.assert( type instanceof schema.TupleType, "Type is a tuple" );
    t.equals( type.subSchema.length, 0, "Tuple length is 0" );

    type = schema.parse(`[string, any, boolean]`);
    t.assert( type instanceof schema.TupleType, "Type is a tuple" );
    t.equals( type.subSchema.length, 3, "Tuple length is 3" );
    t.assert( type.subSchema[0] instanceof schema.StringType, "Tuple first element is string" );
    t.assert( type.subSchema[1] instanceof schema.AnyType, "Tuple second element is any" );
    t.assert( type.subSchema[2] instanceof schema.BooleanType, "Tuple third element is boolean" );

    t.end();
} );

test( 'parser unions and intersections', function ( t: test.Test ) {
    let type = schema.parse( `
        number | string
    ` );
    t.assert( type instanceof schema.UnionType, "Type is an union" );
    t.equals( type.typeSchemas.length, 2, "Union has 2 members" );
    t.assert( type.typeSchemas[ 0 ] instanceof schema.NumberType, "Union's first type is a number" );
    t.assert( type.typeSchemas[ 1 ] instanceof schema.StringType, "Union's second type is a string" );
    
    type = schema.parse( `
    number & string
    ` );
    t.assert( type instanceof schema.IntersectionType, "Type is an intersection" );
    t.equals( type.typeSchemas.length, 2, "Intersection has 2 members" );
    t.assert( type.typeSchemas[ 0 ] instanceof schema.NumberType, "Union's first type is a number" );
    t.assert( type.typeSchemas[ 1 ] instanceof schema.StringType, "Union's second type is a string" );

    type = schema.parse( `
    number & ( string & boolean )
    ` );
    t.assert( type instanceof schema.IntersectionType, "Type is an intersection" );
    t.assert( type.typeSchemas[ 0 ] instanceof schema.NumberType, "Union's first type is a number" );
    t.assert( type.typeSchemas[ 1 ] instanceof schema.StringType, "Union's second type is a string" );
    t.assert( type.typeSchemas[ 2 ] instanceof schema.BooleanType, "Union's third type is a boolean" );
    
    t.end();
} );

test( 'parserMany', function ( t: test.Test ) {
    let type = schema.parseMany( `
    type First = number | string;
    type Second = boolean & any;
    ` );
    t.assert( type instanceof schema.TypesDictionary, "Result is a TypesDictionary" );
    t.equals( type.size, 2, "Dictionary has 2 members" );

    const first = type.get('First');
    t.assert( first instanceof schema.UnionType, "Type is an union" );

    const second = type.get('Second');
    t.assert( second instanceof schema.IntersectionType, "Type is an intersection" );
    
    t.end();
} );

test( "stringify literals", ( t: test.Test ) => {
    let code = schema.stringify( new schema.ConstantType( 1 ) );
    t.equals( code, '1' );
    
    code = schema.stringify( new schema.ConstantType( "string" ) );
    t.equals( code, '"string"' );

    code = schema.stringify( new schema.ConstantType( true ) );
    t.equals( code, 'true' );

    code = schema.stringify( new schema.ConstantType( null ) );
    t.equals( code, 'null' );

    code = schema.stringify( new schema.StringType() );
    t.equals( code, 'string' );

    code = schema.stringify( new schema.NumberType() );
    t.equals( code, 'number' );

    code = schema.stringify( new schema.BooleanType() );
    t.equals( code, 'boolean' );
    
    t.end();
} );

test( "stringify objects", ( t: test.Test ) => {
    let code = schema.stringify( new schema.ObjectType( {}, false ) );
    t.equals( code, 'Object' );
    
    code = schema.stringify( new schema.ObjectType( {}, true ) );
    t.equals( code, 'object' );

    code = schema.stringify( new schema.ObjectType( {
        first: new schema.NumberType(),
        second: new schema.StringType(),
        third: new schema.OptionalType(new schema.BooleanType())
    }, true ) );
    t.equals( code,
`{
    first: number;
    second: string;
    third?: boolean;
}` );

    code = schema.stringify( new schema.ObjectType( {
        first: new schema.NumberType(),
        second: new schema.StringType(),
        third: new schema.OptionalType(new schema.BooleanType())
    }, false ) );
    t.equals( code,
`{
    first: number;
    second: string;
    third?: boolean;
    [key: any]: any;
}` );

    code = schema.stringify( new schema.ObjectType( {
        first: new schema.NumberType(),
        second: 
        new schema.ObjectType( {
            secondFirst: new schema.StringType(),
            secondSecond: new schema.OptionalType(new schema.BooleanType())
        }, false),
    }, true ) );
    t.equals( code,
`{
    first: number;
    second: {
        secondFirst: string;
        secondSecond?: boolean;
        [key: any]: any;
    };
}` );
    
    t.end();
} );

test( "stringify arrays and tuples", ( t: test.Test ) => {
    let code = schema.stringify( new schema.ArrayType( new schema.AnyType() ) );
    t.equals( code, 'any[]' );

    code = schema.stringify( new schema.ArrayType( 
        new schema.ArrayType( new schema.AnyType() )
     ) );
    t.equals( code, 'any[][]' );

    code = schema.stringify( new schema.TupleType( [] ) );
    t.equals( code, 
`[
]` );

    code = schema.stringify( new schema.TupleType( [
        new schema.StringType(),
        new schema.ConstantType( 1 )
    ] ) );
    t.equals( code, 
`[
    string,
    1
]` );
    
    
    t.end();
} );

test( "stringify unions and intersections", ( t: test.Test ) => {
    let code = schema.stringify( new schema.IntersectionType( 
        new schema.AnyType(),
        new schema.NumberType(),
    ) );
    t.equals( code, 'any & number' );

    code = schema.stringify( new schema.UnionType( 
        new schema.AnyType(),
        new schema.NumberType(),
    ) );
    t.equals( code, 'any | number' );

    code = schema.stringify( new schema.UnionType( 
        new schema.IntersectionType( 
            new schema.AnyType(),
            new schema.NumberType(),
        ),
        new schema.UnionType( 
            new schema.StringType(),
            new schema.BooleanType(),
        ),
    ) );
    t.equals( code, '(any & number) | (string | boolean)' );

    t.end();
} );

test( "stringifyMany", ( t: test.Test ) => {
    let code = schema.stringifyMany( {
        First: new schema.AnyType(),
        Second: new schema.ConstantType(true),
    } );
    t.equals( code, 
`type First = any;

type Second = true;
` );

    t.end();
} );

test( "compose", ( t: test.Test ) => {
    const string = schema.parse( `string` );
    const object = schema.compose`{ 
        value: ${string};
    }`;

    let code = schema.parse(object);
    t.assert( code instanceof schema.ObjectType, 'Type should be object' );
    t.assert( code.subSchema.value instanceof schema.ReferenceType, 'Value should be a Reference type' );
    t.assert( code.subSchema.value.childType instanceof schema.StringType, 'Value reference\'s child type should be a string' );
    t.equals( code.subSchema.value.childType, string, 'String reference\'s child type should be the same instance as string' );

    code = schema.parse(schema.compose`{
        nested: ${ object },
        string: ${ string },
        nested2: ${ object }
    }`);
    t.assert( code instanceof schema.ObjectType, 'Type should be object' );
    t.assert( code.subSchema.nested instanceof schema.ReferenceType, 'Nested should be a Reference type' );
    t.assert( code.subSchema.nested.childType instanceof schema.ObjectType, 'Nested reference\'s child type should be an object' );

    t.assert( code.subSchema.string instanceof schema.ReferenceType, 'String should be a Reference type' );
    t.assert( code.subSchema.string.childType instanceof schema.StringType, 'String reference\'s child type should be a string' );
    t.equals( code.subSchema.string.childType, string, 'String reference\'s child type should be the same instance as string' );
    
    t.assert( code.subSchema.nested2 instanceof schema.ReferenceType, 'Value should be a Reference type' );
    t.assert( code.subSchema.nested2.childType instanceof schema.ObjectType, 'Nested reference\'s child type should be an object' );
    t.equals( code.subSchema.nested.childType, code.subSchema.nested2.childType, 'Nested reference\'s child types be the same instance' );

    t.end();
} );
