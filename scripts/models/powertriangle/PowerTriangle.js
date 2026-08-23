'use strict';
// HUMAN VETTED

/*
Represents base^exponent=result as the three vertices [base, exponent, result].
Exactly one vertex is nullish; its index is the projection being computed.

For motivation, see PowerTriangle.pdf, or the 3blue1brown 
video here: https://www.youtube.com/watch?v=sULa9Lc4pck
*/
class PowerTriangle extends Array {
    static get [Symbol.species]() { return Array; }

    constructor(base, exponent, result) {
        super(base, exponent, result);
        Object.freeze(this);
    }

    with(vertex, value) {
        const values = [...this];
        values[vertex] = value;
        return new PowerTriangle(...values);
    }
}
