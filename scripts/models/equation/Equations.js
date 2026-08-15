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

    /* collapse two sibling operands into one replacement */
    function _collapse(equation, parent_path, source_index, target_index, replacement) {
        let parent = paths.resolve(equation, parent_path);
        if (parent == null) return equation;
        return paths.replace(equation, parent_path, 
                expressions.collapse(parent, source_index, target_index, replacement));
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
        if (parent_path !== source_root_path) return equation;

        const segment = paths.segment(source_path);
        const inverse = invert(equation, source_path);
        const index = Number(segment);
        if (inverse == null) return equation;

        // a + b = c  ->  a = c - b
        // ab = c  ->  b = c/a
        // a/b = c is represented as a*b^-1 = c, so dragging b^-1 across
        // uses the same inverse operation and reciprocal(b^-1) becomes b.
        const new_source = expressions.remove(source_root, index);
        const new_target = expressions.append(source_root.type, target_root, inverse);
        let left, right;
        [left,right] = target_side==='L'? [new_target, new_source] : [new_source, new_target];
        return equation.with({left: left, right: right});

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

    const _group_expressions_for_tag = {
        'add': scales,
        'mul': powers,
    };

    function _combine(equation, source_path, target_path) {
        const parent_path = paths.parent(source_path);
        if (parent_path == null || parent_path !== paths.parent(target_path)) return equation;

        const parent = paths.resolve(equation, parent_path);
        const group_expressions = _group_expressions_for_tag[parent.type];
        if (group_expressions == null) return equation;

        // 2x + 3x -> 5x, and 7 + (-3) -> 4.
        // x^2 * x^3 -> x^5, x * x -> x^2, and numeric products.
        const combined = group_expressions.combine(
            paths.resolve(equation, source_path), 
            paths.resolve(equation, target_path)
        );
        if (combined == null) return equation;

        return _collapse(
            equation,
            parent_path,
            Number(paths.segment(source_path)),
            Number(paths.segment(target_path)),
            combined
        );

    }

    function _distribute(equation, source_path, target_path) {
        const source_parent_path = paths.parent(source_path);
        const target_parent_path = paths.parent(target_path);
        if (source_parent_path == null || source_parent_path !== target_parent_path) return equation;

        const parent = paths.resolve(equation, source_parent_path);
        if (parent == null || parent.type !== 'mul') return equation;

        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);

        const scale_sum = {
            'constant add': [source,target],
            'add constant': [target,source],
        }[[source.type, target.type].join(' ')];

        if (scale_sum == null) return equation;
        let scale, sum; [scale,sum] = scale_sum;

        const distributed = expressions.add(
            sum.contents.map(term => scales.scale(scale, term))
        );

        return _collapse(
            equation,
            source_parent_path,
            Number(paths.segment(source_path)),
            Number(paths.segment(target_path)),
            distributed
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
        const other_side = parsed.side === 'L'? 'R' : 'L';
        const candidates = [
            `side:${other_side}`,
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


    function invert(equation, source_path) {
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
        invert,
        move,
        moves_for_source,
        draggable_paths,
    });
}
