import { AstPartialOptions, AstOptions, deepMerge } from './options';
import type { FromAstTransformer, ToAstTransformer } from './transformer';

export class Extension {
    public fromAstTransformer: FromAstTransformer = null;

    public toAstTransformer: ToAstTransformer = null;

    public defaultOptions: AstPartialOptions = {};

    public install ( config: AstOptions ): AstOptions | void {
        config = deepMerge( config, this.defaultOptions );

        if ( this.fromAstTransformer != null ) {
            config.fromAstTransformer.transformers.push( this.fromAstTransformer );
        }

        if ( this.toAstTransformer != null ) {
            config.toAstTransformer.transformers.push( this.toAstTransformer );
        }

        return config;
    }
}
