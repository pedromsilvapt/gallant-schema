import * as ts from 'typescript';
import { Type } from '../core';
import { Extension } from '../extension';
import { Identifier } from '../identifiers';
import { AstOptions, AstPartialOptions } from '../options';
import { FromAstTransformer } from '../transformer';

export class ReferenceType extends Type {
    protected _childType: Type = null;
    
    public identifier: Identifier;

    public symbols: Symbols;

    public get childType () : Type {
        if ( this._childType == null ) {
            this._childType = this.symbols.get( this.identifier.toString() );
        }
        
        return this._childType;
    }

    public constructor ( identifier: Identifier, symbols: Symbols ) {
        super();

        this.identifier = identifier;
        this.symbols = symbols;
    }

    validate ( data : any ) {
        return this.childType.validate( data );
    }

    run ( data : any ) {
        return this.childType.run( data );
    }
}

declare module "../options" {
    export interface AstOptions {
        symbols: Symbols;
    }
}

export class ReferenceExtension extends Extension {
    defaultOptions: AstPartialOptions = {
        symbols: new Symbols()
    }

    fromAstTransformer: FromAstTransformer = new class implements FromAstTransformer {
        transform ( root: FromAstTransformer, node: ts.Node, options: AstOptions ): Type {
            if ( ts.isTypeReferenceNode( node ) ) {
                const identifier = Identifier.fromNode( node.typeName );

                if ( options.symbols.has( identifier.toString() ) ) {
                    return new ReferenceType( identifier, options.symbols );
                }
            }
        }
    };
}

export class Symbols {
    protected symbolStacks: Map<string, Type>[] = [];

    public constructor ( symbols?: Symbols ) {
        if ( symbols != null ) {
            this.symbolStacks = symbols.symbolStacks.map( stack => {
                return new Map( stack );
            } );
        }
    }

    public has ( key: string ) : boolean {
        for ( let i = this.symbolStacks.length - 1; i >= 0; i-- ) {
            if ( this.symbolStacks[ i ].has( key ) ) {
                return true;
            }
        }

        return false;
    }

    public get ( key: string ) : Type {
        for ( let i = this.symbolStacks.length - 1; i >= 0; i-- ) {
            const type = this.symbolStacks[ i ].get( key );

            if ( type != null ) {
                return type;
            }
        }

        return null;
    }

    public setMany ( keys: string[] | Symbols | Map<string, Type> | Record<string, Type> ) {
        if ( this.symbolStacks.length === 0 ) {
            this.push();
        }

        const stack = this.symbolStacks[ this.symbolStacks.length - 1 ];

        if ( keys != null ) {
            if ( keys instanceof Array ) {
                for ( const key of keys ) {
                    stack.set( key, void 0 );
                }
            } else if ( keys instanceof Symbols || keys instanceof Map ) {
                for ( const [ key, type ] of keys ) {
                    stack.set( key, type );
                }
            } else {
                for ( const key of Object.keys( keys ) ) {
                    stack.set( key, keys[ key ] );
                }
            }
        }
    }

    set ( key: string, type: Type ) {
        if ( this.symbolStacks.length === 0 ) {
            this.push();
        }

        this.symbolStacks[ this.symbolStacks.length - 1 ].set( key, type );
    }

    public push ( keys?: string[] | Symbols | Map<string, Type> | Record<string, Type> ) {
        this.symbolStacks.push( new Map<string, Type>() );

        if ( keys != null ) {
            this.setMany( keys );
        }
    }

    public pop () {
        if ( this.symbolStacks.length > 0 ) {
            this.symbolStacks.pop();
        }
    }

    public * [Symbol.iterator] (): IterableIterator<[string, Type]> {
        // Used to store the names of the symbols that have been yielded
        // This allows us to prevent duplicate symbols (a symbol on a lower stack 
        // that is overshadowed by another symbol in a higher stack with that same name)
        const visited = new Set<string>();

        for ( let i = this.symbolStacks.length - 1; i >= 0; i-- ) {
            const stack = this.symbolStacks[ i ];

            for ( const [ key, type ] of stack ) {
                if ( visited.has( key ) === false ) {
                    visited.add( key );

                    yield [ key, type ];
                }
            }
        }
    }

    public entries () {
        return this[Symbol.iterator]();
    }

    public * values () {
        for ( const [ _, value ] of this ) {
            yield value;
        }
    }

    public * keys () {
        for ( const [ key, _ ] of this ) {
            yield key;
        }
    }
}
