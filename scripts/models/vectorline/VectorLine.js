'use strict';

/*
A one-dimensional vector space presented through an action relation.

This object is mathematical data, not a drag dispatcher.  `scalar.add`,
`scalar.multiply`, and `vector.add` are the operations from the vector-space
axioms.  `action` is the ternary relation scalar * vector = result, exposed
through whichever projections the representation can recognize.

For the multiplicative positive-real line:
    scalar.add       = +
    scalar.multiply  = *
    vector.add       = *
    action            = pow / log / root
    parallel_add      = harmonic addition

For the ordinary additive line:
    scalar.add       = +
    scalar.multiply  = *
    vector.add       = +
    action            = multiplication-as-scaling
*/
const VectorLine = attributes => {
    const action = attributes.action;
    const vector = attributes.vector;
    const scalar = attributes.scalar;
    const parallel_add = attributes.parallel_add || null;

    const VECTOR = action.VECTOR;
    const SCALAR = action.SCALAR;
    const RESULT = action.RESULT;

    const axioms = Object.freeze({
        scalar_identity: Object.freeze({ scalar: scalar.one }),
        scalar_composition: Object.freeze({ scalar_multiply: scalar.multiply }),
        scalar_additivity: Object.freeze({
            scalar_add: scalar.add,
            vector_add: vector.add,
        }),
        vector_additivity: Object.freeze({ vector_add: vector.add }),
    });

    /*
    With one triangle vertex fixed, the other two coordinates inherit a
    binary operation from the vector-space axioms.  The fixed-result scalar
    operation is parallel addition, a derived coordinate operation.
    */
    function coordinate_operation(fixed, coordinate) {
        if (fixed === VECTOR) {
            if (coordinate === SCALAR) return scalar.add;
            if (coordinate === RESULT) return vector.add;
        }
        if (fixed === SCALAR) {
            if (coordinate === VECTOR || coordinate === RESULT) return vector.add;
        }
        if (fixed === RESULT) {
            if (coordinate === VECTOR) return vector.add;
            if (coordinate === SCALAR) return parallel_add;
        }
        return null;
    }

    return Object.freeze({
        name: attributes.name,
        action,
        vector,
        scalar,
        parallel_add,
        axioms,
        VECTOR,
        SCALAR,
        RESULT,
        coordinate_operation,
    });
};
