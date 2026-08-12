'use strict';

/*
Every successful operation in this namespace is an equivalence-preserving
rewrite.  Unsupported drags return the original equation reference.
*/
function Equations(expressions, equation_paths) {
    const paths = equation_paths;

    function sign_and_absolute(expression) {
        const mono = expressions.coefficient_and_basis(expression);
        if (mono.coefficient < 0) {
            return {
                sign: -1,
                absolute: expressions.from_coefficient_and_basis(-mono.coefficient, mono.basis),
            };
        }
        return { sign: 1, absolute: expression };
    }

    function path_latex(equation, source_path) {
        const source = equation_paths.resolve(equation, source_path);
        return source && expressions.to_latex(source);
    }

    function other_side(side) {
        return side === 'L'? 'R' : 'L';
    }

    function is_direct_child(path, parent_path) {
        return paths.parent(path) === parent_path;
    }

    function replace_two_children(equation, parent_path, source_index, target_index, replacement, identity_type) {
        const parent = paths.resolve(equation, parent_path);
        const items = parent.type === 'add'? parent.terms.slice() : parent.factors.slice();
        const low = Math.min(source_index, target_index);
        const high = Math.max(source_index, target_index);
        items.splice(high, 1);
        items.splice(low, 1, replacement);

        let updated;
        if (identity_type === 'add' && replacement.type === 'constant' && replacement.value === 0) {
            items.splice(low, 1);
            updated = expressions.add(items);
        } else if (identity_type === 'mul' && replacement.type === 'constant' && replacement.value === 1) {
            items.splice(low, 1);
            updated = expressions.mul(items);
        } else {
            updated = identity_type === 'add'? expressions.add(items) : expressions.mul(items);
        }
        return paths.replace(equation, parent_path, updated);
    }

    function move_across(equation, source_path, target_side) {
        const parsed = paths.split(source_path);
        if (parsed.side === target_side) return equation;

        const source = paths.resolve(equation, source_path);
        if (source == null) return equation;

        const source_root_path = parsed.side;
        const source_root = paths.resolve(equation, source_root_path);
        const target_root = paths.resolve(equation, target_side);
        const parent_path = paths.parent(source_path);
        const segment = paths.segment(source_path);

        // a + b = c  ->  a = c - b
        if (source_root.type === 'add' && parent_path === source_root_path) {
            const index = Number(segment);
            const new_source = expressions.remove_indexed(source_root, index);
            const new_target = expressions.append_add(target_root, expressions.negate(source));
            return paths.with_side(
                paths.with_side(equation, parsed.side, new_source),
                target_side,
                new_target
            );
        }

        // ab = c  ->  b = c/a, restricted to known nonzero constants.
        if (
            source_root.type === 'mul' &&
            parent_path === source_root_path &&
            source.type === 'constant' &&
            source.value !== 0
        ) {
            const index = Number(segment);
            const new_source = expressions.remove_indexed(source_root, index);
            const new_target = expressions.div(target_root, source);
            return paths.with_side(
                paths.with_side(equation, parsed.side, new_source),
                target_side,
                new_target
            );
        }

        // a/b = c  ->  a = bc, restricted to known nonzero denominators.
        if (
            source_root.type === 'div' &&
            parent_path === source_root_path &&
            segment === 'd' &&
            source.type === 'constant' &&
            source.value !== 0
        ) {
            const new_source = expressions.ungroup(source_root.numerator);
            const new_target = expressions.append_mul(target_root, source);
            return paths.with_side(
                paths.with_side(equation, parsed.side, new_source),
                target_side,
                new_target
            );
        }

        return equation;
    }

    function combine_siblings(equation, source_path, target_path) {
        const source_parent_path = paths.parent(source_path);
        const target_parent_path = paths.parent(target_path);
        if (source_parent_path == null || source_parent_path !== target_parent_path) return equation;

        const parent = paths.resolve(equation, source_parent_path);
        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);
        const source_segment = paths.segment(source_path);
        const target_segment = paths.segment(target_path);

        // 2x + 3x -> 5x, and 7 + (-3) -> 4.
        if (parent.type === 'add') {
            const combined = expressions.combine_like(source, target);
            if (combined == null) return equation;
            return replace_two_children(
                equation,
                source_parent_path,
                Number(source_segment),
                Number(target_segment),
                combined,
                'add'
            );
        }

        // 5 * 6 -> 30.  Numeric multiplication is intentionally explicit.
        if (
            parent.type === 'mul' &&
            source.type === 'constant' &&
            target.type === 'constant'
        ) {
            return replace_two_children(
                equation,
                source_parent_path,
                Number(source_segment),
                Number(target_segment),
                expressions.constant(source.value * target.value),
                'mul'
            );
        }

        // 28/4 -> 7.  Either numerator or denominator may be dragged.
        if (
            parent.type === 'div' &&
            source.type === 'constant' &&
            target.type === 'constant' &&
            ((source_segment === 'n' && target_segment === 'd') ||
             (source_segment === 'd' && target_segment === 'n')) &&
            parent.denominator.value !== 0
        ) {
            return paths.replace(
                equation,
                source_parent_path,
                expressions.constant(parent.numerator.value / parent.denominator.value)
            );
        }

        // 2(x+3) -> 2x+6 by dropping the numeric factor on the group.
        if (parent.type === 'mul') {
            let scale = null;
            let grouped = null;
            let scale_index = null;
            let group_index = null;

            if (source.type === 'constant' && target.type === 'group') {
                scale = source;
                grouped = target;
                scale_index = Number(source_segment);
                group_index = Number(target_segment);
            } else if (target.type === 'constant' && source.type === 'group') {
                scale = target;
                grouped = source;
                scale_index = Number(target_segment);
                group_index = Number(source_segment);
            }

            if (scale && grouped && grouped.expressions.type === 'add') {
                const distributed = expressions.add(
                    grouped.expressions.terms.map(term => expressions.scale_term(scale, term))
                );
                const factors = parent.factors.slice();
                const high = Math.max(scale_index, group_index);
                const low = Math.min(scale_index, group_index);
                factors.splice(high, 1);
                factors.splice(low, 1);
                factors.splice(Math.min(group_index, factors.length), 0, distributed);
                return paths.replace(
                    equation,
                    source_parent_path,
                    expressions.mul(factors)
                );
            }
        }

        return equation;
    }

    function move(equation, source_path, target_key) {
        if (source_path == null || target_key == null) return equation;

        if (target_key.startsWith('side:')) {
            return move_across(equation, source_path, target_key.slice(5));
        }

        if (!target_key.startsWith('path:')) return equation;
        const target_path = target_key.slice(5);
        if (
            source_path === target_path ||
            paths.is_ancestor(source_path, target_path) ||
            paths.is_ancestor(target_path, source_path)
        ) return equation;

        return combine_siblings(equation, source_path, target_path);
    }

    function moves_for_source(equation, source_path) {
        const parsed = paths.split(source_path);
        const candidates = [
            `side:${other_side(parsed.side)}`,
            ...paths.all(equation).map(path => `path:${path}`),
        ];
        return Object.freeze(candidates.filter(target_key =>
            move(equation, source_path, target_key) !== equation
        ));
    }

    function draggable_paths(equation) {
        return Object.freeze(paths.all(equation).filter(path =>
            moves_for_source(equation, path).length > 0
        ));
    }

    return Object.freeze({
        move,
        moves_for_source,
        draggable_paths,
        sign_and_absolute,
        path_latex,
    });
}
