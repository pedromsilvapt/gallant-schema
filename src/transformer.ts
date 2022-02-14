import * as ts from 'typescript';
import * as schema from './types';
import { Identifier } from './identifiers';
import { AstOptions } from './options';

const factory = ts.factory;

export interface Transformer<I, O, C> {
    transform ( root: Transformer<I, O, C>, node: I, options: C ) : O;
}

export class GroupTransformer<I, O, C> implements Transformer<I, O, C> {
    public readonly transformers: Transformer<I, O, C>[];

    public throwOnMissing: boolean = false;

    public constructor ( transformers: Transformer<I, O, C>[] = [] ) {
        this.transformers = transformers;
    }

    public match ( node: I, options: C ) : boolean {
        return true;
    }

    public transform ( root: Transformer<I, O, C>, input: I, options: C ) : O {
        if ( this.match( input, options ) ) {
            let output: O = null;

            for ( const transformer of this.transformers ) {
                output = transformer.transform( root, input, options );

                if ( output != null ) {
                    break;
                }
            }
            
            if ( this.throwOnMissing === true && output == null ) {
                this.throwNotFoundException( input, options );
            }

            return output;
        }
    }

    protected throwNotFoundException ( input: I, options: C ): never {
        throw new Error( `Cannot transform input ${ input }` );
    }
}

// ASTs
export interface FromAstTransformer extends Transformer<ts.Node, schema.Type, AstOptions> {}

export class FromAstGroupTransformer extends GroupTransformer<ts.Node, schema.Type, AstOptions> {
    protected throwNotFoundException ( input: ts.Node, options: AstOptions ): never {
        if ( ts.isTypeReferenceNode( input ) ) {
            const resultFile = ts.createSourceFile(
                "schema.ts",
                "",
                ts.ScriptTarget.Latest,
                /*setParentNodes*/ false,
                ts.ScriptKind.TS
            );
        
            const printer = ts.createPrinter( {
                newLine: ts.NewLineKind.LineFeed,
            } );
        
            const name = printer.printNode(
                ts.EmitHint.Unspecified,
                input,
                resultFile,
            );

            throw new Error(`Cannot transform AST node kind ${ts.SyntaxKind[input.kind]} (${input.kind}) "${name}"`);
        } else {
            throw new Error(`Cannot transform AST node kind ${ts.SyntaxKind[input.kind]} (${input.kind})`);
        }
    }
}

/* Helper Class for both interface declarations and type literals */
class MembersTransformer {
    transformMembersAst ( root: FromAstTransformer, members: Iterable<ts.TypeElement>, options: AstOptions ): schema.Type {
        const subSchema: any = {};

        let strict: boolean = options.defaultObjectStrict;

        for ( const member of members ) {
            if ( ts.isPropertySignature( member ) ) {
                const memberType = root.transform( root, member.type, options );
                const memberName = member.name.getText();

                if ( member.questionToken != null ) {
                    subSchema[ memberName ] = new schema.OptionalType( memberType );
                } else {
                    subSchema[ memberName ] = memberType;
                }
            } else if ( ts.isIndexSignatureDeclaration( member ) ) {
                // TODO Improve this code path here to handle Record<S, T>
                strict = false;
            } else {
                throw new Error( `Unexpected member` );
            }
        }

        return new schema.ObjectType( subSchema, strict );
    }
}

export function createRootFromAstTransformer () {
    const rootAst = new FromAstGroupTransformer();
    rootAst.throwOnMissing = true;

    // Literals
    rootAst.transformers.push(new class implements FromAstTransformer {
        transform ( root: FromAstTransformer, node: ts.Node, options: AstOptions ): schema.Type {
            if ( ts.isLiteralTypeNode( node ) ) {
                const literal = node.literal;

                let value: any;
                let matched: boolean = true;

                // TODO Regexp and BigInt literals
                if ( ts.isStringLiteral( literal ) ) {
                    value = literal.text;
                } else if ( ts.isNumericLiteral( literal ) ) {
                    value = parseFloat( literal.text );
                } else if ( ts.isBigIntLiteral( literal ) ) {
                    throw new Error('Not yet implemented.');
                } else if ( ts.isRegularExpressionLiteral( literal ) ) {
                    throw new Error('Not yet implemented.');
                } else if ( ts.isToken( literal ) ) {
                    return root.transform( root, literal, options );
                } else {
                    matched = false;
                }

                if ( matched === true ) {
                    return new schema.ConstantType( value );
                }
            }
        }
    } );

    // Interface
    rootAst.transformers.push( new class extends MembersTransformer implements FromAstTransformer {
        transform ( root: FromAstTransformer, node: ts.Node, options: AstOptions ): schema.Type {
            if ( ts.isInterfaceDeclaration( node ) ) {
                return this.transformMembersAst( root, node.members, options );
            }
        }
    } );

    // Type alias
    rootAst.transformers.push( new class implements FromAstTransformer {
        transform ( root: FromAstTransformer, node: ts.Node, options: AstOptions ): schema.Type {
            if ( ts.isTypeAliasDeclaration( node ) ) {
                return root.transform( root, node.type, options );
            }
        }
    } );

    // Tokens
    rootAst.transformers.push( new class implements FromAstTransformer {
        transform ( root: FromAstTransformer, node: ts.Node, options: AstOptions ): schema.Type {
            if ( ts.isToken( node ) ) {
                if ( node.kind === ts.SyntaxKind.TrueKeyword ) {
                    return new schema.ConstantType( true );
                } else if ( node.kind === ts.SyntaxKind.FalseKeyword ) {
                    return new schema.ConstantType( false );
                } else if ( node.kind === ts.SyntaxKind.NullKeyword ) {
                    return new schema.ConstantType( null );
                } else if ( node.kind === ts.SyntaxKind.UndefinedKeyword
                        || node.kind === ts.SyntaxKind.VoidKeyword ) {
                    return new schema.ConstantType(undefined);
                // TODO Match identifiers too (Number, String, Boolean)
                } else if ( node.kind === ts.SyntaxKind.NumberKeyword ) {
                    return new schema.NumberType( options.defaultNumberStrict );
                } else if ( node.kind === ts.SyntaxKind.StringKeyword ) {
                    return new schema.StringType();
                } else if ( node.kind === ts.SyntaxKind.BooleanKeyword ) {
                    return new schema.BooleanType( options.defaultNumberStrict );
                } else if ( node.kind === ts.SyntaxKind.ObjectKeyword ) {
                    return new schema.ObjectType( {}, false );
                } else if ( node.kind === ts.SyntaxKind.AnyKeyword ) {
                    return new schema.AnyType();
                }
            } else if ( ts.isParenthesizedTypeNode( node ) ) {
                return root.transform( root, node.type, options );
            }
        }
    } );

    // Type literals (different from literal types)
    rootAst.transformers.push( new class extends MembersTransformer implements FromAstTransformer {
        transform ( root: FromAstTransformer, node: ts.Node, options: AstOptions ): schema.Type {
            if ( ts.isTypeLiteralNode( node ) ) {
                return this.transformMembersAst( root, node.members, options );
            }
        }
    } );

    // Arrays and tuples
    rootAst.transformers.push( new class extends MembersTransformer implements FromAstTransformer {
        transform ( root: FromAstTransformer, node: ts.Node, options: AstOptions ): schema.Type {
            if ( ts.isArrayTypeNode( node ) ) {
                const elementType = root.transform( root, node.elementType, options );
                
                return new schema.ArrayType( elementType );
            } else if ( ts.isTupleTypeNode( node ) ) {
                const subSchemas = [];

                for ( const type of node.elements ) {
                    if ( ts.isNamedTupleMember( type ) ) {
                        subSchemas.push( root.transform( root, type.type, options ) );
                    } else {
                        subSchemas.push( root.transform( root, type, options ) );
                    }
                }

                return new schema.TupleType( subSchemas );
            }
        }
    } );

    // Type references
    rootAst.transformers.push( new class implements FromAstTransformer {
        transform ( root: FromAstTransformer, node: ts.Node, options: AstOptions ): schema.Type {
            if ( ts.isTypeReferenceNode( node ) ) {
                if ( options.identifiers.Boolean.matchesNode( node ) ) {
                    return new schema.BooleanType( options.defaultBooleanStrict );
                } else if ( options.identifiers.String.matchesNode( node ) ) {
                    return new schema.StringType();
                } else if ( options.identifiers.Number.matchesNode( node ) ) {
                    return new schema.NumberType( options.defaultNumberStrict );
                } else if ( options.identifiers.Object.matchesNode( node ) ) {
                    return new schema.ObjectType( {}, false );
                } else if ( options.identifiers.Array.matchesNode( node ) ) {
                    if ( node.typeArguments?.length > 0 ) {
                        const elementType = root.transform( root, node.typeArguments[ 0 ], options );

                        return new schema.ArrayType( elementType );
                    } else {
                        return new schema.ArrayType( new schema.AnyType() );
                    }
                } else {
                    for ( const reference of options.references ) {
                        let identifier = reference.identifier;

                        if ( typeof identifier === 'function' ) {
                            identifier = identifier( options.identifiers );
                        }

                        if ( identifier.matchesNode( node ) ) {
                            const subTypes = node.typeArguments?.map( typeNode => root.transform( root, typeNode, options ) ) ?? [];
                            
                            if ( reference.factory != null ) {
                                return reference.factory( options, ...subTypes );
                            } else if ( reference.classType != null ) {
                                return new reference.classType( ...subTypes );
                            } else {
                                throw new Error( `Reference provides no factory nor class type.` );
                            }
                        }
                    }
                } 
            }
        }
    } );

    // Union Types
    type IntersectionOrUnionClass = typeof schema.IntersectionType | typeof schema.UnionType;

    rootAst.transformers.push( new class implements FromAstTransformer {
        transform ( root: FromAstTransformer, node: ts.Node, options: AstOptions ): schema.Type {
            let schemaConstructor: IntersectionOrUnionClass = null;

            if ( ts.isIntersectionTypeNode( node ) ) {
                schemaConstructor = schema.IntersectionType;
            } else if ( ts.isUnionTypeNode( node ) ) {
                schemaConstructor = schema.UnionType;
            }

            if ( ts.isIntersectionTypeNode( node ) || ts.isUnionTypeNode( node ) ) {
                const typeSchemas: schema.Type[] = [];
                
                for ( const subNode of node.types ) {
                    const subType = root.transform( root, subNode, options );
                    
                    if ( subType instanceof schemaConstructor ) {
                        typeSchemas.push( ...subType.typeSchemas );
                    } else {
                        typeSchemas.push( subType );
                    }
                }

                if ( typeSchemas.length === 1 ) {
                    return typeSchemas[ 0 ];
                }

                if ( ts.isUnionTypeNode( node ) ) {
                    return new schema.UnionType( ...typeSchemas );
                } else {
                    return new schema.IntersectionType( ...typeSchemas );
                }
            }
        }
    } );

    return rootAst;
};

export function fromAst ( node: ts.Node, options: AstOptions ) : schema.Type {
    return options.fromAstTransformer.transform( options.fromAstTransformer, node, options );
}

// Schemas
export interface ToAstTransformer extends Transformer<any, ts.TypeNode, AstOptions> {}

export class ToAstGroupTransformer extends GroupTransformer<any, ts.TypeNode, AstOptions> {
    protected throwNotFoundException ( input: any, options: AstOptions ): never {
        if ( input instanceof schema.Type ) {
            throw new Error(`Cannot transform Schema Type of ${input.constructor.name} to AST`);
        } else {
            throw new Error(`Cannot transform value ${input.constructor.name} to AST`);
        }
    }
}

export function createRootToAstTransformer () {
    const rootToAst = new ToAstGroupTransformer();
    rootToAst.throwOnMissing = true;

    rootToAst.transformers.push(new class implements ToAstTransformer {
        transform ( root: ToAstTransformer, value: any, options: AstOptions ): ts.TypeNode {
            if ( value instanceof schema.Type ) {
                if ( value instanceof schema.ConstantType ) {
                    return root.transform( root, value.constant, options );
                } else if ( value instanceof schema.OptionalType ) {
                    const subSchemaAst = root.transform( root, value.subSchema, options );
    
                    if ( value.defaultValue === null || value.defaultValue === void 0 ) {
                        return subSchemaAst;
                    }
                    
                    const defaultAst = root.transform( root, value.defaultValue, options );
            
                    return factory.createIntersectionTypeNode( [
                        subSchemaAst,
                        factory.createTypeReferenceNode( "Default", [ defaultAst ] )
                    ] );
                } else if ( value instanceof schema.AnyType ) {
                    return factory.createKeywordTypeNode( ts.SyntaxKind.AnyKeyword );
                } else if ( value instanceof schema.UnionType ) {
                    const types = value.typeSchemas.map( 
                        schema => root.transform( root, schema, options ) 
                    );
            
                    return factory.createUnionTypeNode( types );
                } else if ( value instanceof schema.IntersectionType ) {
                    const types = value.typeSchemas.map( 
                        schema => root.transform( root, schema, options ) 
                    );
            
                    return factory.createIntersectionTypeNode( types );
                } else if ( value instanceof schema.StringType ) {
                    return factory.createKeywordTypeNode( ts.SyntaxKind.StringKeyword );
                } else if ( value instanceof schema.NumberType ) {
                    if ( value.strict === true || options.defaultNumberStrict === true ) {
                        return factory.createKeywordTypeNode( ts.SyntaxKind.NumberKeyword );
                    } else {
                        return factory.createTypeReferenceNode( identifierToAst( options.identifiers.schema.NumberLike ) );
                    }
                } else if ( value instanceof schema.BooleanType ) {
                    if ( value.strict === true || options.defaultBooleanStrict === true ) {
                        return factory.createKeywordTypeNode( ts.SyntaxKind.BooleanKeyword );
                    } else {
                        return factory.createTypeReferenceNode( identifierToAst( options.identifiers.schema.BooleanLike ) );
                    }
                } else if ( value instanceof schema.TupleType ) {
                    const types = value.subSchema.map( 
                        schema => root.transform( root, schema, options )
                    );
            
                    return factory.createTupleTypeNode( types );
                } else if ( value instanceof schema.ArrayType ) {
                    const subType = root.transform( root, value.subSchema, options );
    
                    return factory.createArrayTypeNode( subType );
                } else if ( value instanceof schema.ObjectType ) {
                    if ( Object.keys( value.subSchema ).length === 0 ) {
                        if ( value.strict === true ) {
                            return factory.createKeywordTypeNode( ts.SyntaxKind.ObjectKeyword );
                        } else {
                            return factory.createTypeReferenceNode( factory.createIdentifier( "Object" ) );
                        }
                    } else {
                        const properties: ts.TypeElement[] = Object.keys( value.subSchema )
                            .map( key => {
                                const keySchema = value.subSchema[ key ];
    
                                if ( keySchema instanceof schema.OptionalType ) {
                                    return factory.createPropertySignature( 
                                        void 0,
                                        factory.createIdentifier( key ),
                                        factory.createToken( ts.SyntaxKind.QuestionToken ),
                                        root.transform( root, keySchema.subSchema, options ),
                                    );
                                }
                                
                                return factory.createPropertySignature( 
                                    void 0,
                                    factory.createIdentifier( key ),
                                    void 0,
                                    root.transform( root, keySchema, options )
                                );
                            } );
    
                        if ( value.strict == false && options.defaultObjectStrict == true ) {
                            properties.push( factory.createIndexSignature(
                                void 0,
                                void 0,
                                [
                                    factory.createParameterDeclaration(
                                        void 0,
                                        void 0,
                                        void 0,
                                        factory.createIdentifier( 'key' ),
                                        void 0,
                                        factory.createKeywordTypeNode( ts.SyntaxKind.AnyKeyword ),
                                        void 0
                                    )
                                ],
                                factory.createKeywordTypeNode( ts.SyntaxKind.AnyKeyword )
                            ) );
                        }
                        
                        return factory.createTypeLiteralNode( properties );
                    }
                }
            }
        }
    } );
    
    rootToAst.transformers.push(new class implements ToAstTransformer {
        transform ( root: ToAstTransformer, value: any, options: AstOptions ): ts.TypeNode {
            if ( !( value instanceof schema.Type ) ) {
                if ( value === null ) {
                    return factory.createLiteralTypeNode(factory.createNull());
                } else if ( value === void 0 ) {
                    return factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword);
                } else if ( value instanceof Array ) {
                    const subTypes = value.map( subValue => root.transform( root, subValue, options ) );
        
                    return factory.createTupleTypeNode( subTypes );
                } else if ( typeof value === 'string' ) {
                    return factory.createLiteralTypeNode( factory.createStringLiteral( value ) );
                } else if ( typeof value === 'number' ) {
                    return factory.createLiteralTypeNode( factory.createNumericLiteral( value ) );
                } else if ( typeof value === 'boolean' ) {
                    return factory.createLiteralTypeNode(
                        value === true 
                            ? factory.createToken( ts.SyntaxKind.TrueKeyword )
                            : factory.createToken( ts.SyntaxKind.FalseKeyword )
                    );
                } else if ( typeof value === 'object' ) {
                    return factory.createTypeLiteralNode( 
                        Object.keys( value ).map( 
                            key => factory.createPropertySignature( 
                                void 0,
                                key,
                                void 0, 
                                root.transform( root, ( value as any )[ key ], options )
                            )
                        )
                    );
                }
            }
        }
    } );
    
    return rootToAst;
}

export function toAst ( value: any, options: AstOptions ) : ts.TypeNode {
    return options.toAstTransformer.transform( options.toAstTransformer, value, options );
}

function identifierToAst ( identifier: Identifier, end?: number ): ts.EntityName {
    end ??= identifier.qualifiedName.length;

    if ( end === 1 ) {
        return factory.createIdentifier( identifier.qualifiedName[ 0 ] );
    } else {
        const left = identifierToAst( identifier, end - 1 );
        const right = factory.createIdentifier( identifier.qualifiedName[ end - 1 ] );

        return factory.createQualifiedName( left, right );
    }
}