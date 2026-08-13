'use strict';

/*
Every successful operation in this namespace is an equivalence-preserving
rewrite under the nonzero-divisor assumptions supplied by the active level.
Unsupported drags return the original equation reference.
*/
function Equations(expressions, monomial_expressions, expression_latex, expression_paths) {
    const paths = expression_paths;
    const monomials = monomial_expressions;
    const latex = expression_latex;

    function _other_side(side) {
        return side === 'L'? 'R' : 'L';
    }

    function _replace_two_children(equation, parent_path, source_index, target_index, replacement, identity_type) {
        const parent = paths.resolve(equation, parent_path);
        const items = parent.contents.slice();
        const low = Math.min(source_index, target_index);
        const high = Math.max(source_index, target_index);
        items.splice(high, 1);
        items.splice(low, 1, replacement);

        let updated;
        if (identity_type === 'add' && replacement.type === 'constant' && replacement.contents === 0) {
            items.splice(low, 1);
            updated = expressions.add(items);
        } else if (identity_type === 'mul' && replacement.type === 'constant' && replacement.contents === 1) {
            items.splice(low, 1);
            updated = expressions.mul(items);
        } else {
            updated = identity_type === 'add'? expressions.add(items) : expressions.mul(items);
        }
        return paths.replace(equation, parent_path, updated);
    }

    function _move_across(equation, source_path, target_side) {
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
            const new_target = expressions.append_add(target_root, monomials.negate(source));
            return paths.with_side(
                paths.with_side(equation, parsed.side, new_source),
                target_side,
                new_target
            );
        }

        // ab = c  ->  b = c/a
        // a/b = c is represented as a*b^-1 = c, so dragging b^-1 across
        // uses the same rule and reciprocal(b^-1) simplifies back to b.
        if (
            source_root.type === 'mul' &&
            parent_path === source_root_path &&
            !(source.type === 'constant' && source.contents === 0)
        ) {
            const index = Number(segment);
            const remainder = expressions.remove_indexed(source_root, index);
            const new_source = expressions.is_reciprocal(source)? expressions.ungroup(remainder) : remainder;
            const new_target = expressions.append_mul(target_root, expressions.reciprocal(source));
            return paths.with_side(
                paths.with_side(equation, parsed.side, new_source),
                target_side,
                new_target
            );
        }

        return equation;
    }

    function _combine_siblings(equation, source_path, target_path) {
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
            const combined = monomials.combine(source, target);
            if (combined == null) return equation;
            return _replace_two_children(
                equation,
                source_parent_path,
                Number(source_segment),
                Number(target_segment),
                combined,
                'add'
            );
        }

        if (parent.type === 'mul') {
            // 5 * 6 -> 30.  Numeric multiplication is intentionally explicit.
            if (source.type === 'constant' && target.type === 'constant') {
                return _replace_two_children(
                    equation,
                    source_parent_path,
                    Number(source_segment),
                    Number(target_segment),
                    expressions.constant(source.contents * target.contents),
                    'mul'
                );
            }

            // 28 * 4^-1 -> 7.  The reciprocal may be dragged in either direction.
            const source_reciprocal = expressions.is_reciprocal(source)? source.contents[0] : null;
            const target_reciprocal = expressions.is_reciprocal(target)? target.contents[0] : null;
            const numerator = source.type === 'constant' && target_reciprocal && target_reciprocal.type === 'constant'?
                source :
                target.type === 'constant' && source_reciprocal && source_reciprocal.type === 'constant'?
                    target : null;
            const denominator = target_reciprocal && target_reciprocal.type === 'constant'?
                target_reciprocal :
                source_reciprocal && source_reciprocal.type === 'constant'?
                    source_reciprocal : null;

            if (numerator && denominator && denominator.contents !== 0) {
                return _replace_two_children(
                    equation,
                    source_parent_path,
                    Number(source_segment),
                    Number(target_segment),
                    expressions.constant(numerator.contents / denominator.contents),
                    'mul'
                );
            }

            // 2(x+3) -> 2x+6 by dropping the numeric factor on the group.
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

            if (scale && grouped && grouped.contents.type === 'add') {
                const distributed = expressions.add(
                    grouped.contents.contents.map(term => monomials.scale(scale, term))
                );
                const factors = parent.contents.slice();
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
            return _move_across(equation, source_path, target_key.slice(5));
        }

        if (!target_key.startsWith('path:')) return equation;
        const target_path = target_key.slice(5);
        if (
            source_path === target_path ||
            paths.is_ancestor(source_path, target_path) ||
            paths.is_ancestor(target_path, source_path)
        ) return equation;

        return _combine_siblings(equation, source_path, target_path);
    }

    function moves_for_source(equation, source_path) {
        const parsed = paths.split(source_path);
        const candidates = [
            `side:${_other_side(parsed.side)}`,
            ...paths.all(equation).map(path => `path:${path}`),
        ];
        return Object.freeze(candidates.filter(target_key =>
            move(equation, source_path, target_key) !== equation
        ));
    }

    function path_latex(equation, source_path) {
        const source = expression_paths.resolve(equation, source_path);
        return source && latex.encode(source);
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
        path_latex,
    });
}
