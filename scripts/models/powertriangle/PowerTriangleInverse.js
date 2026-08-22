'use strict';

/*
One reversible inverse relationship for a fixed power-triangle vertex.

For fixed=exponent, computed=result:
    base^exponent = result
    base = result^(1/exponent)

`cancel` removes the fixed coordinate from the current projection; `append`
constructs the missing coordinate from the fixed coordinate and the expression
occupying the computed coordinate.
*/
const PowerTriangleInverse = (power_triangles, fixed, computed) => {
    const other = power_triangles.other(fixed, computed);

    function cancel(parent, source) {
        const triangle = power_triangles.from_expression(parent, false);
        if (triangle == null || triangle[computed] != null) return null;
        if (triangle[fixed] !== source) return null;
        return triangle[other];
    }

    function append(source, target) {
        const values = [null, null, null];
        values[fixed] = source;
        values[computed] = target;
        return power_triangles.to_expression(new PowerTriangle(...values));
    }

    function cancel_pair(outer_expression, inner_expression, outer_fixed, inner_fixed) {
        const outer = power_triangles.from_expression(outer_expression, false);
        const inner = power_triangles.from_expression(inner_expression, false);
        if (outer == null || inner == null) return null;
        if (outer[computed] != null || inner[other] != null) return null;
        if (!power_triangles.same(outer, inner, fixed)) return null;
        if (outer[other] !== inner_expression) return null;
        if (outer[fixed] !== outer_fixed || inner[fixed] !== inner_fixed) return null;

        return inner[computed];
    }

    return Object.freeze({
        family: 'inverse',
        fixed,
        computed,
        cancel,
        append,
        cancel_pair,
    });
};
