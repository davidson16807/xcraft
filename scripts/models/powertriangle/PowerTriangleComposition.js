'use strict';

/*
Power-triangle composition with a fixed base.

Result projection:
    (a^b)^c  <->  a^(bc)

Exponent projection (the logarithmic mirror):
    c log_a(x)  <->  log_a(x^c)

`computed` selects which projection of the same fixed-base composition law is
being represented.  A combine may return more than one candidate when both
siblings can occupy the projection role; ExpressionOperations resolves that
as a genuine ambiguity.
*/
const PowerTriangleComposition = (power_triangles, grouplikes, computed) => {
    computed = computed || power_triangles.RESULT;

    const fixed = power_triangles.BASE;
    const other = power_triangles.other(fixed, computed);
    const key = `${fixed}:${computed}`;
    const expanded_operation = computed === power_triangles.RESULT? 'pow' : 'mul';

    function combine_result(left, right) {
        const inner = power_triangles.as(left, computed, false);
        if (inner == null || left.type !== 'pow') return null;

        return power_triangles.create(computed, {
            [fixed]: inner[fixed],
            [other]: grouplikes.mul([inner[other], right]),
        });
    }

    function combine_exponent(left, right) {
        const candidates = [];
        [
            [left, right],
            [right, left],
        ].forEach(([projection_expression, scalar]) => {
            const projection = power_triangles.as(
                projection_expression, computed, false);
            if (projection == null || projection_expression.type !== 'log') return;

            candidates.push(power_triangles.create(computed, {
                [fixed]: projection[fixed],
                [other]: grouplikes.pow(projection[other], scalar),
            }));
        });

        if (candidates.length === 0) return null;
        return candidates.length === 1? candidates[0] : candidates;
    }

    function combine(left, right) {
        return computed === power_triangles.RESULT?
            combine_result(left, right) :
            combine_exponent(left, right);
    }

    function distribute_result(parent, source, target) {
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

    function distribute_exponent(parent, source, target) {
        const projection = power_triangles.projection(parent);
        if (projection == null || projection.computed !== computed) return null;

        const fixed_index = projection.children.indexOf(fixed);
        const other_index = projection.children.indexOf(other);
        if (fixed_index < 0 || other_index < 0) return null;
        if (parent.contents[fixed_index] !== source) return null;
        if (parent.contents[other_index] !== target) return null;

        const powered = power_triangles.as(target, power_triangles.RESULT, false);
        if (powered == null || target.type !== 'pow') return null;

        const logarithm = power_triangles.create(computed, {
            [fixed]: source,
            [other]: powered.base,
        });

        return grouplikes.mul([powered.exponent, logarithm]);
    }

    function distribute(parent, source, target) {
        return computed === power_triangles.RESULT?
            distribute_result(parent, source, target) :
            distribute_exponent(parent, source, target);
    }

    return Object.freeze({
        family: 'composition',
        fixed,
        computed,
        key,
        expanded_operation,
        combine,
        distribute,
    });
};
