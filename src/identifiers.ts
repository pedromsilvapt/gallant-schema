import * as ts from 'typescript';

export class Identifier {
    public qualifiedName: string[];

    public get name () : string {
        return this.qualifiedName[ this.qualifiedName.length - 1 ];
    }
    
    public constructor ( name: string | string[] ) {
        this.qualifiedName = typeof name === 'string'
            ? name.split( '.' )
            : name;
    }

    public matchesNode ( node : ts.Node ) : boolean {
        if ( ts.isTypeReferenceNode( node ) ) {
            let name = node.typeName;

            var i = this.qualifiedName.length - 1;

            while ( ts.isQualifiedName( name ) ) {
                if ( i < 0 ) {
                    return false;
                }

                if ( this.qualifiedName[ i ] != name.right.text ) {
                    return false;
                }

                name = name.left;
                i--;
            }

            if ( ts.isIdentifier( name ) ) {
                return i === 0 && this.qualifiedName[ 0 ] == name.text;
            } else {
                return false;
            }
        }
    }

    public toString () : string {
        return this.qualifiedName.join( '.' );
    }

    public static fromNode ( node: ts.EntityName ) : Identifier {
        const names: string[] = [];

        while ( ts.isQualifiedName( node ) ) {
            names.push( node.right.text );

            node = node.left;
        }

        if ( ts.isIdentifier( node ) ) {
            names.push( node.text );
        }

        names.reverse();

        return new Identifier( names );
    }
}
