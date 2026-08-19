'use strict';

class Exponent {
    constructor(base, exponent, key) {
        this.base = base;
        this.exponent = exponent;
        this.key = key;
        Object.freeze(this);
    }

    with(attributes) {
        return new Exponent(
            attributes.base     != null? attributes.base     : this.base,
            attributes.exponent != null? attributes.exponent : this.exponent,
            attributes.key      != null? attributes.key      : this.key,
        );
    }
}
