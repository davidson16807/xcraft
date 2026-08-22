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
const PowerTriangleInverse = (power_triangles, expression_shape, fixed, computed) => {
    const other = ['base', 'exponent', 'result']
        .find(vertex => vertex !== fixed && vertex !== computed);
    const key = `${fixed}:${computed}`;

    function from_expression(expression, projection) {
        const triangle = power_triangles.from_expression(expression);
        return triangle != null && triangle[projection] == null? triangle : null;
    }

    function to_expression(vertices) {
        return power_triangles.to_expression(new PowerTriangle(
            vertices.base ?? null,
            vertices.exponent ?? null,
            vertices.result ?? null
        ));
    }

    function cancel(parent, source) {
        const triangle = from_expression(parent, computed);
        if (triangle == null || triangle[fixed] !== source) return null;
        return triangle[other];
    }

    function append(source, target) {
        return to_expression({
            [fixed]: source,
            [computed]: target,
        });
    }

    function cancel_pair(outer_expression, inner_expression, outer_fixed, inner_fixed) {
        const outer = from_expression(outer_expression, computed);
        const inner = from_expression(inner_expression, other);
        if (outer == null || inner == null) return null;
        if (expression_shape.encode(outer[fixed]) !== expression_shape.encode(inner[fixed])) return null;
        if (outer[other] !== inner_expression) return null;
        if (outer[fixed] !== outer_fixed || inner[fixed] !== inner_fixed) return null;

        return inner[computed];
    }

    return Object.freeze({
        family: 'inverse',
        fixed,
        computed,
        key,
        cancel,
        append,
        cancel_pair,
    });
};
