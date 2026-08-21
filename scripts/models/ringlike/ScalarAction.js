'use strict';

/*
A scalar action is the executable form of the four one-dimensional vector-space
laws used by both ordinary scaling and exponentiation.

`vector_add` is the vector-space addition operation.  For ScaleExpressions it
is ordinary addition; for PowerExpressions it is multiplication.
`act(scalar, vector)` is scalar multiplication.  For powers this is vector^scalar.
*/
const ScalarAction = ({
    grouplikes,
    scalar_add,
    scalar_multiply,
    vector_add,
    act,
}) => {

    function create(type, contents) {
        const operation = grouplikes[type];
        return operation == null? null : operation(contents);
    }

    function combine_or_create(type, left, right) {
        return grouplikes.combine(type, left, right) || create(type, [left, right]);
    }

    function scalar_sum(scalars) {
        if (scalars.length === 0) return create(scalar_add, []);
        return scalars.slice(1).reduce(
            (sum, scalar) => combine_or_create(scalar_add, sum, scalar),
            scalars[0]
        );
    }

    function scalar_product(scalars) {
        if (scalars.length === 0) return create(scalar_multiply, []);
        return scalars.slice(1).reduce(
            (product, scalar) => combine_or_create(scalar_multiply, product, scalar),
            scalars[0]
        );
    }

    function vector_sum(vectors) {
        if (vectors.length === 0) return create(vector_add, []);
        return vectors.slice(1).reduce(
            (sum, vector) => combine_or_create(vector_add, sum, vector),
            vectors[0]
        );
    }

    function scalar_identity(vector) {
        const one = grouplikes.constant(1);
        return Object.freeze({
            expanded: act(one, vector),
            contracted: vector,
        });
    }

    function scalar_composition(outer, inner, vector) {
        return Object.freeze({
            expanded: act(outer, act(inner, vector)),
            contracted: act(scalar_product([outer, inner]), vector),
        });
    }

    function scalar_distributivity(scalars, vector) {
        return Object.freeze({
            expanded: vector_sum(scalars.map(scalar => act(scalar, vector))),
            contracted: act(scalar_sum(scalars), vector),
        });
    }

    function vector_distributivity(scalar, vectors) {
        return Object.freeze({
            expanded: vector_sum(vectors.map(vector => act(scalar, vector))),
            contracted: act(scalar, vector_sum(vectors)),
        });
    }

    return Object.freeze({
        scalar_add,
        scalar_multiply,
        vector_add,
        act,
        scalar_identity,
        scalar_composition,
        scalar_distributivity,
        vector_distributivity,
    });
};
