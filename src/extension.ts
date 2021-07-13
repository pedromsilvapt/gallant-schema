import { mergeAdvanced } from 'object-merge-advanced';
import type { AstPartialOptions, AstOptions } from './options';
import type { FromAstTransformer, ToAstTransformer } from './transformer';

export class Extension {
    public fromAstTransformer: FromAstTransformer = null;

    public toAstTransformer: ToAstTransformer = null;

    public defaultOptions: AstPartialOptions = {};

    public install ( config: AstOptions ): AstOptions | void {
        config = mergeAdvanced( config, this.defaultOptions, {
            hardArrayConcat: true,
        } );

        // TODO Install transformers

        return config;
    }
}
