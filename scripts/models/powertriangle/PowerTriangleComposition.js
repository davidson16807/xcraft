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
    const other = ['base', 'exponent', 'result']
        .find(vertex => vertex !== fixed && vertex !== computed);
    const key = `${fixed}:${computed}`;
    const expanded_operation =
        fixed === 'base' && computed === 'result'?
            'pow' : 'mul';

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

    function inverse(expression) {
        return powers.to_expression(
            powers.invert(
                powers.from_expression(expression)));
    }

    function combine_result(left, right) {
        if (fixed !== 'base') return null;

        const inner = from_expression(left, computed);
        if (inner == null) return null;

        return to_expression({
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
            const projection = from_expression(projection_expression, computed);
            if (projection == null) return;

            if (fixed === 'base') {
                candidates.push(to_expression({
                    [fixed]: projection[fixed],
                    [other]: grouplikes.pow(projection[other], scalar),
                }));
                return;
            }

            if (fixed === 'result') {
                if (powers.from_expression(scalar).power !== -1) return;
                candidates.push(to_expression({
                    [fixed]: projection[fixed],
                    [other]: grouplikes.pow(projection[other], inverse(scalar)),
                }));
            }
        });

        if (candidates.length === 0) return null;
        return candidates.length === 1? candidates[0] : candidates;
    }

    function combine(left, right) {
        return computed === 'result'?
            combine_result(left, right) :
            combine_exponent(left, right);
    }

    function distribute_result(parent, source, target) {
        if (fixed !== 'base') return null;

        const projection = from_expression(parent, computed);
        if (projection == null) return null;
        if (projection[fixed] !== source || projection[other] !== target) return null;
        if (target.type !== 'mul' || target.contents.length < 2) return null;

        const inner = to_expression({
            [fixed]: source,
            [other]: target.contents[0],
        });
        const outer_exponent = grouplikes.mul(target.contents.slice(1));

        return to_expression({
            [fixed]: inner,
            [other]: outer_exponent,
        });
    }

    function distribute_exponent(parent, source, target) {
        const projection = from_expression(parent, computed);
        if (projection == null) return null;
        if (projection[fixed] !== source || projection[other] !== target) return null;

        const powered = from_expression(target, 'result');
        if (powered == null) return null;

        const logarithm = to_expression({
            [fixed]: source,
            [other]: powered.base,
        });

        if (fixed === 'base') {
            return grouplikes.mul([powered.exponent, logarithm]);
        }

        if (fixed === 'result') {
            return grouplikes.mul([inverse(powered.exponent), logarithm]);
        }

        return null;
    }

    function distribute(parent, source, target) {
        return computed === 'result'?
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
