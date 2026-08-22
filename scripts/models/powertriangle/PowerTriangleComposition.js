'use strict';

/*
Composition of a power-triangle projection with itself.

Computed result (power):
    (a^b)^c  <->  a^(bc)

Computed base (root):
    root_c(root_b(a))  <->  root_(bc)(a)

In both cases exponent is the composition parameter. The projection's computed
value is fed back into its remaining input, so nested projections compose by
multiplying their exponents.
*/
const PowerTriangleComposition = (power_triangles, grouplikes, computed) => {
    const exponent = power_triangles.EXPONENT;
    const recursive = power_triangles.other(computed, exponent);
    const expanded_operation = Object.freeze(['root', null, 'pow'])[computed];

    if (expanded_operation == null) return null;

    const coordinates = [
        power_triangles.BASE,
        power_triangles.EXPONENT,
        power_triangles.RESULT,
    ].filter(vertex => vertex !== computed);

    function triangle_from_inputs(left, right) {
        const values = [null, null, null];
        values[coordinates[0]] = left;
        values[coordinates[1]] = right;
        return new PowerTriangle(...values);
    }

    function combine(left, right) {
        const outer = triangle_from_inputs(left, right);
        const inner = power_triangles.from_expression(outer[recursive], false);
        if (inner == null || inner[computed] != null) return null;

        return power_triangles.to_expression(inner.with(
            exponent,
            grouplikes.mul([inner[exponent], outer[exponent]])
        ));
    }

    function distribute(parent, source, target) {
        const triangle = power_triangles.from_expression(parent, false);
        if (triangle == null || triangle[computed] != null) return null;
        if (triangle[recursive] !== source || triangle[exponent] !== target) return null;
        if (target.type !== 'mul' || target.contents.length < 2) return null;

        const inner = power_triangles.to_expression(
            triangle.with(exponent, target.contents[0])
        );
        const outer_exponent = grouplikes.mul(target.contents.slice(1));

        return power_triangles.to_expression(
            triangle.with(recursive, inner).with(exponent, outer_exponent)
        );
    }

    return Object.freeze({
        family: 'composition',
        computed,
        expanded_operation,
        combine,
        distribute,
    });
};
