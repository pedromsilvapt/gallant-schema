import * as ts from 'typescript';

export class Identifier {
    public qualifiedName: string[];

    public get name () : string {
        return this.qualifiedName[ this.qualifiedName.length - 1 ];
    }
    
    public constructor (name: string) {
        this.qualifiedName = name.split( '.' );
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
}
