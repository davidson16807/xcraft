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
    const key = `${fixed}:${computed}`;

    function cancel(parent, source) {
        const projection = power_triangles.projection(parent);
        if (projection == null || projection.computed !== computed) return null;

        const fixed_index = projection.children.indexOf(fixed);
        const other_index = projection.children.indexOf(other);
        if (fixed_index < 0 || other_index < 0) return null;
        if (parent.contents[fixed_index] !== source) return null;

        return parent.contents[other_index];
    }

    function append(source, target) {
        return power_triangles.create(other, {
            [fixed]: source,
            [computed]: target,
        });
    }

    return Object.freeze({
        family: 'inverse',
        fixed,
        computed,
        key,
        cancel,
        append,
    });
};
