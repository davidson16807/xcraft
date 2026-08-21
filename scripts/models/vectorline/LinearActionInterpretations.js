'use strict';

/*
Compile a VectorLine's mathematical structure into user-facing drag
interpretations.  This object is intentionally programmatic: the laws live in
VectorLine; this layer enumerates projections/orientations and applies the
canonical-form policy used by the UI.
*/
const LinearActionInterpretations = (line, options) => {
    options = options || {};
    const action = line.action;
    const coordinates = [line.VECTOR, line.SCALAR, line.RESULT];
    const combine_fixed = options.combine_fixed || new Set(coordinates);
    const distribute_fixed = options.distribute_fixed || new Set(coordinates);
    const projection_inverses = options.projection_inverses !== false;
    const composition = options.composition !== false;
    const promote = options.promote || (() => false);

    function apply(operation, left, right) {
        if (operation == null) return null;
        if (operation.combine != null) {
            const combined = operation.combine(left, right);
            if (combined != null) return combined;
        }
        return operation.create([left, right]);
    }

    function matches(parent, computed, fixed, source, other, target) {
        if (action.matches != null) {
            return action.matches(parent, computed, fixed, source, other, target);
        }
        const view = action.as(parent, computed, false);
        return view != null && action.same(view[fixed], source) &&
            action.same(view[other], target);
    }

    function sameness(fixed, computed) {
        const other = action.other(fixed, computed);
        const other_operation = line.coordinate_operation(fixed, other);
        const computed_operation = line.coordinate_operation(fixed, computed);
        if (
            other == null || other_operation == null || computed_operation == null ||
            !action.supports(computed)
        ) return null;

        const key = `${fixed}:${computed}`;
        const may_combine = combine_fixed.has(fixed);
        const may_distribute = distribute_fixed.has(fixed);

        function combine(left, right) {
            if (!may_combine) return null;
            const a = action.as(left, computed, promote(fixed, computed));
            const b = action.as(right, computed, promote(fixed, computed));
            if (a == null || b == null || !action.same(a[fixed], b[fixed])) return null;

            const combined_other = apply(other_operation, a[other], b[other]);
            if (combined_other == null) return null;
            return action.create(computed, {
                [fixed]: a[fixed],
                [other]: combined_other,
            });
        }

        function distribute(parent, source, target, source_index, target_index) {
            if (!may_distribute) return null;
            if (!matches(parent, computed, fixed, source, other, target)) return null;
            if (target.type !== other_operation.tag) return null;

            const order = source_index < target_index?
                [fixed, other] : [other, fixed];
            return computed_operation.create(target.contents.map(term =>
                action.create(computed, {
                    [fixed]: source,
                    [other]: term,
                }, { order, preserve_action:true })
            ));
        }

        return Object.freeze({
            family: 'same',
            fixed,
            computed,
            key,
            expanded_operation: computed_operation.tag,
            combine,
            distribute,
        });
    }

    function inverse(fixed, computed) {
        if (!projection_inverses) return null;
        const other = action.other(fixed, computed);
        if (
            other == null || !action.supports(computed) ||
            !action.supports(other)
        ) return null;
        const key = `${fixed}:${computed}`;

        function cancel(parent, source) {
            const view = action.as(parent, computed, false);
            if (view == null || view[fixed] !== source) return null;
            return view[other];
        }

        function append(source, target) {
            return action.create(other, {
                [fixed]: source,
                [computed]: target,
            });
        }

        function cancel_pair(outer_expression, inner_expression, outer_fixed, inner_fixed) {
            const outer = action.as(outer_expression, computed, false);
            const inner = action.as(inner_expression, other, false);
            if (outer == null || inner == null) return null;
            if (!action.same(outer[fixed], inner[fixed])) return null;
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
    }

    function scalar_composition(fixed, computed) {
        if (!composition) return null;
        const vector = line.VECTOR;
        const scalar = line.SCALAR;
        const result = line.RESULT;
        const other = action.other(fixed, computed);
        if (
            other == null || !action.supports(computed) ||
            !action.supports(result) || !action.supports(scalar)
        ) return null;

        const supported =
            (fixed === vector && computed === result) ||
            (fixed === vector && computed === scalar) ||
            (fixed === result && computed === scalar);
        if (!supported) return null;

        const key = `${fixed}:${computed}`;
        const expanded_operation =
            fixed === vector && computed === result?
                action.operation(result) : line.scalar.multiply.tag;

        function combine_result(left, right) {
            if (fixed !== vector) return null;
            const inner = action.as(left, result, false);
            if (inner == null) return null;
            return action.create(result, {
                [vector]: inner[vector],
                [scalar]: line.scalar.multiply.create([inner[scalar], right]),
            });
        }

        function combine_scalar(left, right) {
            const candidates = [];
            [[left, right], [right, left]].forEach(([projection_expression, factor]) => {
                const projection = action.as(projection_expression, scalar, false);
                if (projection == null) return;

                if (fixed === vector) {
                    const new_result = action.create(result, {
                        [vector]: projection[result],
                        [scalar]: factor,
                    });
                    candidates.push(action.create(scalar, {
                        [vector]: projection[vector],
                        [result]: new_result,
                    }));
                    return;
                }

                if (fixed === result) {
                    if (line.scalar.is_inverse == null || !line.scalar.is_inverse(factor)) return;
                    const inverse_factor = line.scalar.inverse(factor);
                    if (inverse_factor == null) return;
                    const new_vector = action.create(result, {
                        [vector]: projection[vector],
                        [scalar]: inverse_factor,
                    });
                    candidates.push(action.create(scalar, {
                        [result]: projection[result],
                        [vector]: new_vector,
                    }));
                }
            });
            if (candidates.length === 0) return null;
            return candidates.length === 1? candidates[0] : candidates;
        }

        function combine(left, right) {
            return computed === result?
                combine_result(left, right) : combine_scalar(left, right);
        }

        function distribute_result(parent, source, target) {
            if (fixed !== vector) return null;
            const projection = action.as(parent, result, false);
            if (
                projection == null || projection[vector] !== source ||
                projection[scalar] !== target || target.type !== line.scalar.multiply.tag ||
                target.contents.length < 2
            ) return null;

            const inner = action.create(result, {
                [vector]: source,
                [scalar]: target.contents[0],
            });
            const outer_scalar = line.scalar.multiply.create(target.contents.slice(1));
            return action.create(result, {
                [vector]: inner,
                [scalar]: outer_scalar,
            });
        }

        function distribute_scalar(parent, source, target) {
            const projection = action.as(parent, scalar, false);
            if (projection == null || projection[fixed] !== source || projection[other] !== target) {
                return null;
            }
            const acted = action.as(target, result, false);
            if (acted == null) return null;

            if (fixed === vector) {
                const coordinate = action.create(scalar, {
                    [vector]: source,
                    [result]: acted[vector],
                });
                return line.scalar.multiply.create([acted[scalar], coordinate]);
            }

            if (fixed === result) {
                const inverse_scalar = line.scalar.inverse(acted[scalar]);
                if (inverse_scalar == null) return null;
                const coordinate = action.create(scalar, {
                    [result]: source,
                    [vector]: acted[vector],
                });
                return line.scalar.multiply.create([inverse_scalar, coordinate]);
            }
            return null;
        }

        function distribute(parent, source, target) {
            return computed === result?
                distribute_result(parent, source, target) :
                distribute_scalar(parent, source, target);
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
    }

    const laws = [];
    coordinates.forEach(fixed => coordinates.forEach(computed => {
        if (fixed === computed) return;
        const same = sameness(fixed, computed);
        if (same != null) laws.push(same);
        const inv = inverse(fixed, computed);
        if (inv != null) laws.push(inv);
        const comp = scalar_composition(fixed, computed);
        if (comp != null) laws.push(comp);
    }));

    function get(family, fixed, computed) {
        return laws.find(law =>
            law.family === family && law.fixed === fixed && law.computed === computed
        ) || null;
    }

    return Object.freeze({
        line,
        laws: Object.freeze(laws),
        get,
    });
};
