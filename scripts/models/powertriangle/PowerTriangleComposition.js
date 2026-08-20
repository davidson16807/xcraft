'use strict';

/*
Power-triangle composition for the result projection with a fixed base:
    (a^b)^c  <->  a^(bc)

The expanded side is itself a power expression.  Distribution uses the
structural order of a multiplicative exponent: in a^(b*c*...), the first
factor becomes the inner exponent and the remaining factors become the outer
exponent.  Since multiplication is commutative, a user can commute exponent
factors first to choose a different nesting.
*/
const PowerTriangleComposition = (power_triangles, grouplikes) => {
    const fixed = power_triangles.BASE;
    const computed = power_triangles.RESULT;
    const other = power_triangles.EXPONENT;
    const key = `${fixed}:${computed}`;

    function combine(left, right) {
        const inner = power_triangles.as(left, computed, false);
        if (inner == null || left.type !== 'pow') return null;

        return power_triangles.create(computed, {
            [fixed]: inner[fixed],
            [other]: grouplikes.mul([inner[other], right]),
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
        if (target.type !== 'mul' || target.contents.length < 2) return null;

        const inner = power_triangles.create(computed, {
            [fixed]: source,
            [other]: target.contents[0],
        });
        const outer_exponent = grouplikes.mul(target.contents.slice(1));

        return power_triangles.create(computed, {
            [fixed]: inner,
            [other]: outer_exponent,
        });
    }

    return Object.freeze({
        family: 'composition',
        fixed,
        computed,
        key,
        expanded_operation: 'pow',
        combine,
        distribute,
    });
};
