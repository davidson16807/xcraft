'use strict';

/*
Power-triangle scalar composition for one fixed/computed vertex pair.

Fixed base, computed result:
    (a^b)^c  <->  a^(bc)

Fixed base, computed exponent:
    c log_a(x)  <->  log_a(x^c)

Fixed result, computed exponent:
    (1/c) log_a(x)  <->  log_(a^c)(x)

A combine may return more than one candidate when either sibling can occupy
an expression projection role. Expressions resolves those candidates
as genuine ambiguity rather than choosing an interpretation by order.
*/
const PowerTriangleComposition = (
    power_triangles, grouplikes, powers, fixed, computed
) => {
    const other = power_triangles.other(fixed, computed);
    const key = `${fixed}:${computed}`;
    const expanded_operation =
        fixed === power_triangles.BASE && computed === power_triangles.RESULT?
            'pow' : 'mul';

    function inverse(expression) {
        return powers.to_expression(
            powers.invert(
                powers.from_expression(expression)));
    }

    function combine_result(left, right) {
        if (fixed !== power_triangles.BASE) return null;

        const inner = power_triangles.from_expression(left, false);
        if (inner == null || inner[computed] != null) return null;

        return power_triangles.to_expression(inner.with({
            [other]: grouplikes.mul([inner[other], right]),
        }));
    }

    function combine_exponent(left, right) {
        const candidates = [];
        [
            [left, right],
            [right, left],
        ].forEach(([projection_expression, scalar]) => {
            const projection = power_triangles.from_expression(
                projection_expression, false);
            if (projection == null || projection[computed] != null) return;

            if (fixed === power_triangles.BASE) {
                candidates.push(power_triangles.to_expression(projection.with({
                    [other]: grouplikes.pow(projection[other], scalar),
                })));
                return;
            }

            if (fixed === power_triangles.RESULT) {
                if (powers.from_expression(scalar).power !== -1) return;
                candidates.push(power_triangles.to_expression(projection.with({
                    [other]: grouplikes.pow(projection[other], inverse(scalar)),
                })));
            }
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
        if (fixed !== power_triangles.BASE) return null;

        const triangle = power_triangles.from_expression(parent, false);
        if (triangle == null || triangle[computed] != null) return null;
        if (triangle[fixed] !== source || triangle[other] !== target) return null;
        if (target.type !== 'mul' || target.contents.length < 2) return null;

        const inner = power_triangles.to_expression(triangle.with({
            [other]: target.contents[0],
        }));
        const outer_exponent = grouplikes.mul(target.contents.slice(1));

        return power_triangles.to_expression(triangle.with({
            [fixed]: inner,
            [other]: outer_exponent,
        }));
    }

    function distribute_exponent(parent, source, target) {
        const triangle = power_triangles.from_expression(parent, false);
        if (triangle == null || triangle[computed] != null) return null;
        if (triangle[fixed] !== source || triangle[other] !== target) return null;

        const powered = power_triangles.from_expression(target, false);
        if (powered == null || powered[power_triangles.RESULT] != null) return null;

        const logarithm = power_triangles.to_expression(triangle.with({
            [other]: powered.base,
        }));

        if (fixed === power_triangles.BASE) {
            return grouplikes.mul([powered.exponent, logarithm]);
        }

        if (fixed === power_triangles.RESULT) {
            return grouplikes.mul([inverse(powered.exponent), logarithm]);
        }

        return null;
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
