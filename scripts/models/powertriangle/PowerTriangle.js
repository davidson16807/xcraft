'use strict';
// HUMAN VETTED

/*
Represents the ternary relationship base^exponent=result with exactly one
unknown coordinate. The nullish coordinate is the value computed by the
projection represented by the source Expression.
*/
class PowerTriangle {
    constructor(base, exponent, result) {
        this.base = base;
        this.exponent = exponent;
        this.result = result;
        Object.freeze(this);
    }
}
