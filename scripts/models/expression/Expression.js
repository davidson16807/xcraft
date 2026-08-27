'use strict';
// HUMAN VETTED

class Expression {
    constructor(type, contents, caveats) {
        typecheck(type, 'String');
        typecheck(contents, 'Array+Number+String+1');
        typecheck(caveats, 'Array+1');
        this.type = type;
        this.contents = contents;
        this.caveats = Object.freeze([...(caveats || [])]);
        Object.freeze(this);
    }

    with(attributes) {
        return new Expression(
            attributes.type     != null? attributes.type     : this.type,
            attributes.contents != null? attributes.contents : this.contents,
            attributes.caveats  != null? attributes.caveats  : this.caveats,
        );
    }

    caveat(...caveats) {
        typecheck(caveats, 'Array');
        return this.with({
            caveats: [
                ...this.caveats, 
                ...caveats.filter(caveat=>caveat!=null)
            ]
        })
    }

}
