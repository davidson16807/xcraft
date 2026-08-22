'use strict';

/*
One reversible sameness law for a fixed power-triangle vertex and computed
projection. The operations on the remaining and computed vertices determine
the two sides of the equality.
*/
const PowerTriangleSameness = (
    power_triangles,
    grouplikes,
    expression_shape,
    fixed,
    computed,
    other_operation,
    computed_operation,
    promote
) => {
    const other = ['base', 'exponent', 'result']
        .find(vertex => vertex !== fixed && vertex !== computed);
    const key = `${fixed}:${computed}`;

    function from_expression(expression) {
        const triangle = power_triangles.from_expression(expression);
        if (triangle != null && triangle[computed] == null) return triangle;
        if (computed !== 'result' || !promote) return null;
        return new PowerTriangle(expression, grouplikes.constant(1), null);
    }

    function to_expression(vertices) {
        return power_triangles.to_expression(new PowerTriangle(
            vertices.base ?? null,
            vertices.exponent ?? null,
            vertices.result ?? null
        ));
    }

    function combine(left, right) {
        const a = from_expression(left);
        const b = from_expression(right);
        if (a == null || b == null) return null;
        if (expression_shape.encode(a[fixed]) !== expression_shape.encode(b[fixed])) return null;

        return to_expression({
            [fixed]: a[fixed],
            [other]: grouplikes[other_operation]([a[other], b[other]]),
        });
    }

    function distribute(parent, source, target) {
        const triangle = power_triangles.from_expression(parent);
        if (triangle == null || triangle[computed] != null) return null;
        if (triangle[fixed] !== source || triangle[other] !== target) return null;
        if (target.type !== other_operation) return null;

        return grouplikes[computed_operation](target.contents.map(term =>
            to_expression({
                [fixed]: source,
                [other]: term,
            })
        ));
    }

    return Object.freeze({
        family: 'same',
        fixed,
        computed,
        key,
        other_operation,
        computed_operation,
        expanded_operation: computed_operation,
        promote,
        combine,
        distribute,
    });
};
