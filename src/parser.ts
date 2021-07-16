import * as ts from 'typescript';
import * as transformers from './transformer';
import * as fs from 'fs';
import * as schema from './main';
import { promisify } from "util";
import * as path from 'path';
import { Type } from './core';
import { Symbols } from './types/reference';

export class TypesDictionary extends Map<string, schema.Type<any>> {
    get<T> ( key : any ) : schema.Type<T> {
        return super.get( key ) as schema.Type<T>;
    }
}

export class PartialTypesDictionary extends Map<string, PartialType> {
    
}

export function transform ( root: ts.Node, mapper: (node: ts.Node) => ts.Node | ts.Node[] | undefined ) {
    function visitorTransformer<T extends ts.Node>(): ts.TransformerFactory<T> {
        return context => {
            const visit: ts.Visitor = node => {
                const result = mapper( node );

                if ( result == null ) {
                    return ts.visitEachChild(node, child => visit( child ), context);
                } else {
                    return result;
                }
            };
        
            return node => ts.visitNode(node, visit);
        };
    }

    return ts.transform( root, [ visitorTransformer() ] )
}

export function findTypeReferences<T extends string | number | symbol> ( node: ts.Node, filter: ( node: ts.TypeReferenceNode ) => T | null ): Record<T, ts.TypeReferenceNode> {
    const results: Record<T, ts.TypeReferenceNode> = {} as any;

    const visit = ( node: ts.Node ): void => {
        if ( ts.isTypeReferenceNode( node ) ) {

            const key = filter( node );

            if ( key != null ) {
                results[ key ] = node;
            }
        }

        ts.forEachChild( node, visit );
    };

    visit( node );

    return results;
}

export interface PartialTypeApplication {
    options?: schema.AstOptions;
    symbolCounter?: number;
    typeNames?: Map<PartialType | Type, string>
    symbols?: Record<string, ts.Node | Type>;
    nodeReferences?: Map<ts.TypeReferenceNode, PartialType | Type>;
}

export class PartialType {
    node: ts.Node;
    sharedTypes: Map<PartialType | Type, ts.TypeReferenceNode[]>;

    public apply ( application: PartialTypeApplication = {} ): [ts.Node, Record<string, ts.Node | Type>] {
        // Initialize properties with default values if they are not initialized yet
        application.symbolCounter ??= 0;
        application.typeNames ??= new Map();
        application.symbols ??= {};
        application.nodeReferences ??= new Map();

        // If this type has been already applied, do not apply it twice
        if ( application.typeNames.has( this ) ) {
            const typeName = application.typeNames.get( this );

            // We know that the symbol with this name must be a ts.Node because the type name
            // we retrieved was associated with this instance (of a PartialType class)
            // And the symbols of PartialTypes are ts.Node (whereas the symbols of Types are Types themselves)
            return [ application.symbols[ typeName ] as ts.Node, application.symbols ];
        }

        // For each reference identifier used in this Partial Type, generate a name for them
        for ( const [ sharedType, identifierNodes ] of this.sharedTypes ) {
            // Apply the shared type (we can ignore it's result for now)
            if ( sharedType instanceof PartialType ) {
                sharedType.apply( application );
            } else {
                // When the sharedType is a PartialType, assigning a name/identifier
                // is done inside the `apply` method. Since the class Type has no such method
                // we must do that here
                let sharedName = '__SharedType_' + ( application.symbolCounter++ );
                
                while ( application.options != null && application.options.symbols.has( sharedName ) ) {
                    sharedName = '__SharedType_' + ( application.symbolCounter++ );
                }

                // We must also set the two Maps, that associate the Type and it's Name, and vice-versa
                application.typeNames.set( sharedType, sharedName );
                application.symbols[ sharedName ] = sharedType;
            }

            for ( const identifier of identifierNodes ) {
                application.nodeReferences.set( identifier, sharedType );
                
            }
        }
        
        let thisName = '__SharedType_' + ( application.symbolCounter++ );
        
        while ( application.options != null && application.options.symbols.has( thisName ) ) {
            thisName = '__SharedType_' + ( application.symbolCounter++ );
        }

        application.typeNames.set( this, thisName );

        const transformedNode = transform( this.node, node => {
            if ( ts.isTypeReferenceNode( node ) ) {
                const nodeSharedType = application.nodeReferences.get( node );

                if ( nodeSharedType != null ) {
                    const nodeTypeName = application.typeNames.get( nodeSharedType );
                    
                    const newNodeIdentifier = ts.factory.createIdentifier( nodeTypeName );
                    
                    return ts.factory.updateTypeReferenceNode( node, newNodeIdentifier, void 0 );
                }
            }

            return null;
        } ).transformed[ 0 ];

        application.symbols[ thisName ] = transformedNode;

        return [ transformedNode, application.symbols ];
    }
}

function parseTypeScript ( code: string ): ts.NodeArray<ts.Node> {
    return ts.createSourceFile(
        "schema.ts",
        code,
        ts.ScriptTarget.ES2015,
        /*setParentNodes */ true,
        ts.ScriptKind.TS
    ).statements;
}

export function mapTemplateStringsArray ( original: TemplateStringsArray, mapper: ( text: string, index: number ) => string ): TemplateStringsArray {
    const transformed: any = Array.from( original ).map( mapper );
    transformed.raw = Array.from( original.raw ).map( mapper );
    
    return transformed;
}

export function compose ( segments: TemplateStringsArray, ...components: (string | PartialType | Type)[] ) : PartialType {
    const mappedSegments = mapTemplateStringsArray( segments, ( text, index ) => {
        if ( index === 0 ) {
            return 'type Schema = ' + text;
        }

        return text;
    } );

    return composeMany( mappedSegments, ...components ).get( 'Schema' );
}

export function composeMany ( segments: TemplateStringsArray, ...components: (string | PartialType | Type)[] ) : PartialTypesDictionary {
    const typesDictionary = new PartialTypesDictionary();
    
    const concatenated = [];

    for ( let i = 0; i < segments.length; i++ ) {
        if ( i > 0 ) {
            const component = components[ i - 1 ];

            if ( typeof component !== 'string' ) {
                concatenated.push( `___schema_partial_type_${ i - 1 }` );
            } else {
                concatenated.push( component );
            }
        }
        
        concatenated.push( segments[ i ] );
    }
    
    for ( const statement of parseTypeScript( concatenated.join( '' ) ) ) {
        const partialType = new PartialType();
        partialType.sharedTypes = new Map();
        
        if ( ts.isInterfaceDeclaration( statement ) || ts.isTypeAliasDeclaration( statement ) ) {
            partialType.node = statement;
    
            const identifiers = findTypeReferences( partialType.node, node => {
                if ( ts.isIdentifier( node.typeName ) && node.typeName.text.startsWith( '___schema_partial_type_' ) ) {
                    return +node.typeName.text.slice( '___schema_partial_type_'.length );
                }
        
                return null;
            } );
        
            for ( let i = 0; i < components.length; i++ ) {
                const component = components[ i ];
        
                if ( typeof component !== 'string' ) {
                    let typeReferences = partialType.sharedTypes.get( component );
        
                    if ( typeReferences == null ) {
                        partialType.sharedTypes.set( component, typeReferences = [] );
                    }
        
                    typeReferences.push( identifiers[ i ] );
                }
            }
                
            typesDictionary.set( statement.name.text, partialType );
        }
    }

    return typesDictionary;
}

export function parse ( code: string | PartialType, options: schema.AstOptions = schema.defaultOptions ) {
    if ( typeof code === 'string' ) {
        return parseMany( `type Schema = ` + code, options ).get( 'Schema' );
    } else {
        return parseMany( new PartialTypesDictionary( [ [ 'Schema', code ] ] ) ).get( 'Schema' );
    }
}

export function parseMany ( code: string | PartialTypesDictionary, options: schema.AstOptions = schema.defaultOptions ) : TypesDictionary {
    if ( typeof code === 'string' ) {
        code = composeMany`${ code }`;
    }

    options = {
        ...options,
        symbols: new Symbols( options.symbols ),
    };

    options.symbols.push();
    
    const statements: [string, ts.Node, Record<string, ts.Node | Type>][] = [];

    for ( const [ name, partialType ] of code ) {
        // Set the symbol with this very name
        options.symbols.set( name, void 0 );

        // Apply the partial type and gather the newly generated symbols
        const [ statement, symbols ] = partialType.apply( { options } );

        // Pre-reserve those symbols. Their values will be undefined for now,
        // this is done just to prevent generating conflicting names
        options.symbols.setMany( Object.keys( symbols ) );

        statements.push( [ name, statement, symbols ] );
    }

    const typesDictionary = new TypesDictionary();

    for ( const [ name, statement, symbols ] of statements ) {
        // Pre-fill the symbols object
        for ( const symbolName of Object.keys( symbols ) ) {
            // Since the symbolName is always there at the start, we must check it
            // it is instead different from undefined
            if ( options.symbols.get( symbolName ) != void 0 ) continue;

            const symbolValue = symbols[ symbolName ];

            if ( symbolValue instanceof Type ) {
                options.symbols.set( symbolName, symbolValue );
            } else {
                const symbolType = transformers.fromAst( symbolValue, options );
    
                options.symbols.set( symbolName, symbolType );
            }
        }
        
        const type = transformers.fromAst( statement, options );
        
        typesDictionary.set( name, type );
        options.symbols.set( name, type );
    }

    return typesDictionary;
}

const fileAccess = promisify( fs.access );
const readFile = promisify( fs.readFile );

export function parseFile ( dirname: string, filePath: string, options?: schema.AstOptions ) : Promise<TypesDictionary>;
export function parseFile ( filePath: string, options?: schema.AstOptions ) : Promise<TypesDictionary>;
export async function parseFile ( dirname: string, filePath?: string | schema.AstOptions, options?: schema.AstOptions ) : Promise<TypesDictionary> {
    if ( typeof filePath === 'string' ) {
        filePath = path.join( dirname, filePath );
    } else {
        options = filePath;
        filePath = dirname;
    }

    options ??= schema.defaultOptions;

    let realFilePath = filePath;

    try {
        await fileAccess( realFilePath )
    } catch {
        realFilePath = filePath + '.ts';
        
        try {
            await fileAccess( realFilePath );
        } catch {
            realFilePath = filePath + '.d.ts';
            
            await fileAccess( realFilePath );
        }
    }

    const code = await readFile( realFilePath, { encoding: 'utf8' } );

    return parseMany( code, options );
}

export function parseFileSync ( dirname: string, filePath: string, options?: schema.AstOptions ) : TypesDictionary;
export function parseFileSync ( filePath: string, options?: schema.AstOptions ) : TypesDictionary;
export function parseFileSync ( dirname: string, filePath?: string | schema.AstOptions, options?: schema.AstOptions ) : TypesDictionary {
    if ( typeof filePath === 'string' ) {
        filePath = path.join( dirname, filePath );
    } else {
        options = filePath;
        filePath = dirname;
    }

    options ??= schema.defaultOptions;

    let realFilePath = filePath;

    try {
        fs.accessSync( realFilePath )
    } catch {
        realFilePath = filePath + '.ts';
        
        try {
            fs.accessSync( realFilePath );
        } catch {
            realFilePath = filePath + '.d.ts';
            
            fs.accessSync( realFilePath );
        }
    }
    const code = fs.readFileSync( realFilePath, { encoding: 'utf8' } );

    return parseMany( code, options );
}

function stringifyAst ( node: ts.Node | ts.Node[] ) : string {
    if ( node instanceof Array ) {
        // Map \n and join \n gives an empty line between each statement
        // and a single newline after the last statement
        return node.map( node => stringifyAst( node ) + '\n' ).join( '\n' );
    }
    
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

    return printer.printNode(
        ts.EmitHint.Unspecified,
        node,
        resultFile,
    );
}

export function stringify ( type: schema.Type<any>, options: schema.AstOptions = schema.defaultOptions ): string {
    return stringifyAst( transformers.toAst( type, options ) );
}

export function stringifyMany ( types: TypesDictionary | Record<string, schema.Type>, options: schema.AstOptions = schema.defaultOptions ): string {
    const statements: ts.Statement[] = [];

    if ( types instanceof TypesDictionary ) {
        for ( const [name, type] of types.entries() ) {
            statements.push(
                ts.factory.createTypeAliasDeclaration(
                    void 0, 
                    void 0,
                    name,
                    void 0,
                    transformers.toAst( type, options ),
                )
            );
        }
    } else {
        for ( const name of Object.keys( types ) ) {
            const type = types[ name ];
            statements.push(
                ts.factory.createTypeAliasDeclaration(
                    void 0, 
                    void 0,
                    name,
                    void 0,
                    transformers.toAst( type, options ),
                )
            );
        }
    }

    return stringifyAst( statements );
}
