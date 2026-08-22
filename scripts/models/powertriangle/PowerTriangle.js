'use strict';
// HUMAN VETTED

/*
Represents base^exponent=result as the three vertices [base, exponent, result].
Exactly one vertex is nullish; its index is the projection being computed.
*/
class PowerTriangle extends Array {
    static get [Symbol.species]() { return Array; }

    constructor(base, exponent, result) {
        super(base, exponent, result);
        Object.freeze(this);
    }

    base(){return this[0];}
    exponent(){return this[0];}
    result(){return this[0];}

    with(vertex, value) {
        const values = [...this];
        values[vertex] = value;
        return new PowerTriangle(...values);
    }
}
