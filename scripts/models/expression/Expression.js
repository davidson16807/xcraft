'use strict';
// HUMAN VETTED

class Expression {
    constructor(type, contents) {
        this.type = type;
        this.contents = contents;
        Object.freeze(this);
    }

    with(attributes) {
        return new Expression(
            attributes.type     != null? attributes.type     : this.type,
            attributes.contents != null? attributes.contents : this.contents,
        );
    }
}
