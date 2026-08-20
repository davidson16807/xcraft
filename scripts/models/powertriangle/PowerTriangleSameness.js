'use strict';

/*
One reversible sameness law for a fixed power-triangle vertex.

The initial instance is fixed=base, computed=result:
    a^b * a^c  <->  a^(b+c)
*/
const PowerTriangleSameness = (
    power_triangles,
    grouplikes,
    fixed,
    computed,
    other_operation,
    computed_operation,
    promote
) => {
    const other = power_triangles.other(fixed, computed);
    const key = `${fixed}:${computed}`;

    function combine(left, right) {
        const a = power_triangles.as(left, computed, promote);
        const b = power_triangles.as(right, computed, promote);
        if (a == null || b == null) return null;
        if (!power_triangles.same(a[fixed], b[fixed])) return null;

        return power_triangles.create(computed, {
            [fixed]: a[fixed],
            [other]: grouplikes[other_operation]([a[other], b[other]]),
        });
    }

    function distribute(parent, source, target) {
        const projection = power_triangles.projection(parent);
        if (projection == null || projection.computed !== computed) return null;

        const fixed_index = projection.children.indexOf(fixed);
        const other_index = projection.children.indexOf(other);
        if (fixed_index < 0 || other_index < 0) return null;
        if (parent.contents[fixed_index] !== source) return null;
        if (parent.contents[other_index] !== target) return null;
        if (target.type !== other_operation) return null;

        return grouplikes[computed_operation](target.contents.map(term =>
            power_triangles.create(computed, {
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
