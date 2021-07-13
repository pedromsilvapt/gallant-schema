import * as ts from 'typescript';
import * as transformers from './transformer';
import { Type } from './core';
import * as fs from 'fs';
import { AstOptions } from './options';
import { createDefaultOptions } from './main';
import { promisify } from "util";
import * as path from 'path';

export class TypesDictionary {
    protected types: Map<string, Type<any>> = new Map();

    public get size () {
        return this.types.size;
    }

    set ( key : string, type : Type<unknown> ) : void {
        this.types.set( key as string, type );
    }
    
    get<T> ( key : any ) : Type<T> {
        return this.types.get( key as string );
    }

    entries () {
        return this.types.entries();
    }

    keys () {
        return this.types.keys();
    }

    values () {
        return this.types.values();
    }
}

export function parse ( code: string ) {
    return parseMany( `type Schema = ` + code ).get( 'Schema' );
}

export function parseMany ( code: string, options: AstOptions = createDefaultOptions() ) : TypesDictionary {
    const sourceFile = ts.createSourceFile(
        "schema.ts",
        code,
        ts.ScriptTarget.ES2015,
        /*setParentNodes */ true,
        ts.ScriptKind.TS
    );

    const typesDictionary = new TypesDictionary();

    for ( const statement of sourceFile.statements ) {
        if ( ts.isInterfaceDeclaration( statement ) || ts.isTypeAliasDeclaration( statement ) ) {
            const type = transformers.fromAst( statement, options );

            typesDictionary.set( statement.name.text, type );
        }
    }

    return typesDictionary;
}

const fileAccess = promisify( fs.access );
const readFile = promisify( fs.readFile );

export function parseFile ( dirname: string, filePath: string, options?: AstOptions ) : Promise<TypesDictionary>;
export function parseFile ( filePath: string, options?: AstOptions ) : Promise<TypesDictionary>;
export async function parseFile ( dirname: string, filePath?: string | AstOptions, options?: AstOptions ) : Promise<TypesDictionary> {
    if ( typeof filePath === 'string' ) {
        filePath = path.join( dirname, filePath );
    } else {
        options = filePath;
        filePath = dirname;
    }

    options ??= createDefaultOptions();

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

export function parseFileSync ( dirname: string, filePath: string, options?: AstOptions ) : TypesDictionary;
export function parseFileSync ( filePath: string, options?: AstOptions ) : TypesDictionary;
export function parseFileSync ( dirname: string, filePath?: string | AstOptions, options?: AstOptions ) : TypesDictionary {
    if ( typeof filePath === 'string' ) {
        filePath = path.join( dirname, filePath );
    } else {
        options = filePath;
        filePath = dirname;
    }

    options ??= createDefaultOptions();

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

export function stringify ( type: Type<any>, options: AstOptions = createDefaultOptions() ): string {
    return stringifyAst( transformers.toAst( type, options ) );
}

export function stringifyMany ( types: TypesDictionary | Record<string, Type>, options: AstOptions = createDefaultOptions() ): string {
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
