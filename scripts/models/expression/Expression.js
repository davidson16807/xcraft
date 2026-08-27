'use strict';
// HUMAN VETTED

class Expression {
    constructor(type, contents, caveats) {
        this.type = type;
        this.contents = contents;
        this.caveats = ExpressionCaveats.index(caveats || []);
        Object.freeze(this);
    }

    with(attributes) {
        return new Expression(
            attributes.type     != null? attributes.type     : this.type,
            attributes.contents != null? attributes.contents : this.contents,
            [...this.caveats, ...(attributes.caveats || [])],
        );
    }
}
