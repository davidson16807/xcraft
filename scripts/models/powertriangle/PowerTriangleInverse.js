'use strict';
// HUMAN VETTED

/*
`PowerTriangleSameness` handles laws on `Expression`s where 
there are nested triangles representing inverse relationships.

This consists of:

    x^logₓ(k) = k
    logₓ(xᵏ)  = k
    ᵏ√xᵏ      = k

or, in triangle of power notation:


    △ 
   ˣ△ᵏ = k
   x   


    △ ₖ  = k
   x  △
     ˣ


     x
    △ ₓ  = k
      △
     ᵏ


and there are another 3 laws where triangles are mirrored.
Here, "⊕" indicates harmonic addition such that a⊕b = 1 / (1/a + 1/b).

Using drags, each power law is implemented by two operations:
* a "combine" operation that combines triangles belonging to the same operation
* a "distribute" operation that distributes the matching vertex
  across the operation of the other known vertex

Names for drags are chosen by analogy to drags for arithmetic.
*/
const PowerTriangleInverse = (triangles, expression_shape, fixed, computed) => {
    const other = triangles.other(fixed, computed);

    function cancel(parent, source) {
        const triangle = triangles.from_expression(parent, false);
        if (triangle == null) return null;
        if (triangles.computed(triangle) !== computed) return null;
        if (triangle[fixed] !== source) return null;
        return triangle[other];
    }

    function append(source, target) {
        const values = [null, null, null];
        values[fixed] = source;
        values[computed] = target;
        return triangles.to_expression(new PowerTriangle(...values));
    }

    function strip(outer_expression, inner_expression, outer_fixed_expression, inner_fixed_expression) {
        const outer = triangles.from_expression(outer_expression);
        const inner = triangles.from_expression(inner_expression);
        if (outer == null || inner == null) return null;

        const outer_fixed = outer.indexOf(outer_fixed_expression);
        const inner_fixed = inner.indexOf(inner_fixed_expression);
        if (inner_fixed < 0 || outer_fixed < 0) return null;

        const outer_computed = triangles.computed(outer);
        const inner_computed = triangles.computed(inner);
        if (outer_computed == null || inner_computed == null) return null;
        if (outer_computed === inner_computed) return null;
        if (outer_fixed !== inner_fixed) return null;
        if (expression_shape.encode(outer_fixed_expression) !== expression_shape.encode(inner_fixed_expression)) 
            return null;

        const outer_other = triangles.other(outer_fixed, outer_computed);
        if (outer[outer_other] !== inner_expression) return null;

        const inner_other = triangles.other(inner_fixed, inner_computed);
        return inner[inner_other];
    }

    return Object.freeze({
        cancel,
        append,
        strip,
    });
};
