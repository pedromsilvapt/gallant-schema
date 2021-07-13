import { Extension } from '../extension';
import { Identifier } from '../identifiers';
import { AstPartialOptions } from '../options';
import { InstanceType } from './instance';

declare module "../options" {
    export interface AstIdentifiers {
        Date: Identifier;
    }
}

export class DateExtension extends Extension {
    defaultOptions: AstPartialOptions = {
        identifiers: {
            Date: new Identifier( 'Date' ),
        },
        references: [
            {
                identifier: id => id.Date,
                factory: () => new InstanceType<Date>( Date ),
            }
        ]
    }
}
