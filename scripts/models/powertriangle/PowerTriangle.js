'use strict';

/*
Represents one view of the ternary relationship base^exponent=result.
`computed` identifies the vertex represented by the source Expression.
*/
class PowerTriangle {
    constructor(base, exponent, result, computed) {
        this.base = base;
        this.exponent = exponent;
        this.result = result;
        this.computed = computed;
        Object.freeze(this);
    }
}
