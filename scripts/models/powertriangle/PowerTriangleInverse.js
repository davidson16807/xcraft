'use strict';

/*
`PowerTriangleInverse` handles nested inverse relationships and balancing one
known triangle vertex across an equation.

The fixed and computed vertices are derived from the actual parent projection,
so one instance handles all six inverse/co-inverse orientations.
*/
const PowerTriangleInverse = (triangles, expression_shape, expression_caveats) => {
    const shape = expression_shape;

    function cancel(parent, source) {
        const triangle = triangles.from_expression(parent, false);
        if (triangle == null) return null;

        const computed = triangles.computed(triangle);
        const fixed = triangle.indexOf(source);
        if (computed == null || fixed < 0) return null;

        return expression_caveats.inherit(
            triangle[triangles.other(fixed, computed)],
            parent,
            source
        );
    }

    function append(parent, source, target) {
        const triangle = triangles.from_expression(parent, false);
        if (triangle == null) return null;

        const computed = triangles.computed(triangle);
        const fixed = triangle.indexOf(source);
        if (computed == null || fixed < 0) return null;

        const values = [null, null, null];
        values[fixed] = source;
        values[computed] = target;
        const result = triangles.to_expression(new PowerTriangle(...values));
        return result == null? null : expression_caveats.inherit(result, parent, source, target);
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
        if (shape.encode(outer_fixed_expression) !== shape.encode(inner_fixed_expression)) 
            return null;

        const outer_other = triangles.other(outer_fixed, outer_computed);
        if (outer[outer_other] !== inner_expression) return null;

        const inner_other = triangles.other(inner_fixed, inner_computed);
        return expression_caveats.inherit(
            inner[inner_other],
            outer_expression,
            inner_expression,
            outer_fixed_expression,
            inner_fixed_expression
        );
    }

    return Object.freeze({
        cancel,
        append,
        strip,
    });

};
