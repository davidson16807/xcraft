'use strict';

/*
Every successful operation in this namespace is an equivalence-preserving
rewrite under the nonzero-divisor assumptions supplied by the active level.
Unsupported drags return the original equation reference.
*/
function Equations(dependencies) {
    const expressions = dependencies.expressions;
    const paths = dependencies.expression_paths;
    const scales = dependencies.scale_expressions;
    const powers = dependencies.power_expressions;

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

    function _balance(equation, source_path, target_side) {
        const parsed = paths.split(source_path);
        if (parsed.side === target_side) return equation;

        const source = paths.resolve(equation, source_path);
        if (source == null) return equation;

        const source_root_path = parsed.side;
        const source_root = paths.resolve(equation, source_root_path);
        const target_root = paths.resolve(equation, target_side);
        const parent_path = paths.parent(source_path);
        const segment = paths.segment(source_path);
        const inverse = opposite(equation, source_path);
        if (inverse == null) return equation;

        // a + b = c  ->  a = c - b
        if (source_root.type === 'add' && parent_path === source_root_path) {
            const index = Number(segment);
            const new_source = expressions.remove_indexed(source_root, index);
            const new_target = expressions.append_add(target_root, inverse);
            return paths.with_side(
                paths.with_side(equation, parsed.side, new_source),
                target_side,
                new_target
            );
        }

        // ab = c  ->  b = c/a
        // a/b = c is represented as a*b^-1 = c, so dragging b^-1 across
        // uses the same inverse operation and reciprocal(b^-1) becomes b.
        if (source_root.type === 'mul' && parent_path === source_root_path) {
            const index = Number(segment);
            const remainder = expressions.remove_indexed(source_root, index);
            const new_source = remainder;
            const new_target = expressions.append_mul(target_root, inverse);
            return paths.with_side(
                paths.with_side(equation, parsed.side, new_source),
                target_side,
                new_target
            );
        }

        return equation;
    }

    function _swap(equation, path1, path2) {
        if (path1 == null || path2 == null || path1 === path2) return equation;

        const parent_path = paths.parent(path1);
        if (parent_path == null || parent_path !== paths.parent(path2)) return equation;

        const parent = paths.resolve(equation, parent_path);
        if (parent == null || (parent.type !== 'add' && parent.type !== 'mul')) return equation;

        const segment1 = paths.segment(path1);
        const segment2 = paths.segment(path2);
        if (!/^\d+$/.test(segment1) || !/^\d+$/.test(segment2)) return equation;

        const index1 = Number(segment1);
        const index2 = Number(segment2);
        if (index1 >= parent.contents.length || index2 >= parent.contents.length) return equation;

        if (parent.contents[index1] === parent.contents[index2]) return equation;

        const contents = parent.contents.slice();
        [contents[index1], contents[index2]] = [contents[index2], contents[index1]];

        const replacement = parent.type === 'add'?
            expressions.add(contents) :
            expressions.mul(contents);

        return paths.replace(equation, parent_path, replacement);
    }

    function _combine(equation, source_path, target_path) {
        const source_parent_path = paths.parent(source_path);
        const target_parent_path = paths.parent(target_path);
        if (source_parent_path == null || source_parent_path !== target_parent_path) return equation;

        const parent = paths.resolve(equation, source_parent_path);
        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);
        const source_segment = paths.segment(source_path);
        const target_segment = paths.segment(target_path);

        switch(parent.type) {
        case 'add': {
            // 2x + 3x -> 5x, and 7 + (-3) -> 4.
            const combined = scales.combine(source, target);
            return combined == null?
                equation
              : _replace_two_children(
                    equation,
                    source_parent_path,
                    Number(source_segment),
                    Number(target_segment),
                    combined,
                    'add'
                );
        }

        case 'mul': {
            // x^2 * x^3 -> x^5, x * x -> x^2, and numeric products.
            const combined = powers.combine(source, target);
            return combined == null?
                equation
              : _replace_two_children(
                    equation,
                    source_parent_path,
                    Number(source_segment),
                    Number(target_segment),
                    combined,
                    'mul'
                );
        }

        default:
            return equation;
        }
    }

    function _distribute(equation, source_path, target_path) {
        const source_parent_path = paths.parent(source_path);
        const target_parent_path = paths.parent(target_path);
        if (source_parent_path == null || source_parent_path !== target_parent_path) return equation;

        const parent = paths.resolve(equation, source_parent_path);
        if (parent == null || parent.type !== 'mul') return equation;

        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);
        const source_segment = paths.segment(source_path);
        const target_segment = paths.segment(target_path);

        let scale = null;
        let sum = null;

        if (source.type === 'constant' && target.type === 'add') {
            scale = source;
            sum = target;
        } else if (target.type === 'constant' && source.type === 'add') {
            scale = target;
            sum = source;
        }

        if (scale == null || sum == null) return equation;

        const distributed = expressions.add(
            sum.contents.map(term => scales.scale(scale, term))
        );

        return _replace_two_children(
            equation,
            source_parent_path,
            Number(source_segment),
            Number(target_segment),
            distributed,
            'mul'
        );
    }

    function move(equation, source_path, target_key) {
        if (source_path == null || target_key == null) return equation;

        switch(paths.domain(target_key))
        {
        case 'side':
            return _balance(equation, source_path, target_key.slice(5));
        case 'path':
            const target_path = paths.path(target_key);
            if (
                source_path === target_path ||
                paths.is_ancestor(source_path, target_path) ||
                paths.is_ancestor(target_path, source_path)
            ) return equation;
            const combined = _combine(equation, source_path, target_path);
            if (combined !== equation) return combined;
            const distributed = _distribute(equation, source_path, target_path);
            return distributed !== equation? distributed : _swap(equation, source_path, target_path);
        default:
            return equation;
        }

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


    function draggable_paths(equation) {
        return Object.freeze(paths.all(equation).filter(path =>
            moves_for_source(equation, path).length > 0
        ));
    }


    function opposite(equation, source_path) {
        if (source_path == null) return null;

        const parsed = paths.split(source_path);
        const source = paths.resolve(equation, source_path);
        if (source == null) return null;

        const source_root_path = parsed.side;
        const source_root = paths.resolve(equation, source_root_path);
        const parent_path = paths.parent(source_path);

        // a + b = c applies -b to both sides.
        if (source_root.type === 'add' && parent_path === source_root_path) {
            return scales.negate(source);
        }

        // ab = c applies a^-1 to both sides.  A reciprocal factor is its
        // own inverse operation in the expected way: (a^-1)^-1 -> a.
        if (
            source_root.type === 'mul' &&
            parent_path === source_root_path &&
            !(source.type === 'constant' && source.contents === 0)
        ) {
            return expressions.reciprocal(source);
        }

        return null;
    }

    return Object.freeze({
        opposite,
        move,
        moves_for_source,
        draggable_paths,
    });
}
