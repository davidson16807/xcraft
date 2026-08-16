'use strict';

/*
Every successful operation in this namespace is an equivalence-preserving
rewrite under the nonzero-divisor assumptions supplied by the active level.
Unsupported drags return the original equation reference.

`Equations` introduces properties that require more knowledge 
than what can be provided by structures like `MonoidStructure`.
*/
function Equations(dependencies) {
    const expressions = dependencies.expressions;
    const paths = dependencies.expression_paths;
    const scales = dependencies.scale_expressions;
    const powers = dependencies.power_expressions;

    /* collapse two sibling operands into one replacement */
    function collapse(equation, parent_path, source_index, target_index, replacement) {
        let parent = paths.resolve(equation, parent_path);
        if (parent == null) return equation;
        return paths.replace(equation, parent_path, 
                expressions.collapse(parent, source_index, target_index, replacement));
    }

    function invert(equation, source_path, enabled_operations) {
        if (source_path == null) return null; // no source? no-op

        const source_side = paths.split(source_path).side;
        const source = paths.resolve(equation, source_path);
        if (source == null) return null; // non-existant source? no-op

        const source_root = paths.resolve(equation, source_side);
        const parent_path = paths.parent(source_path);
        const is_alone = source_path === source_side;
        const enabled = Object.keys(enabled_operations).filter(operation => enabled_operations[operation]);

        if (is_alone) {
            if (enabled.length !== 1) return null; // ambiguous? no-op
            if (enabled[0] === 'add') return scales.negate(source);
            if (enabled[0] === 'mul' && !(source.type === 'constant' && source.contents === 0)) {
                return expressions.reciprocal(source);
            }
            return null;
        }

        if (!enabled_operations[source_root.type]) return null; // disabled? no-op

        // a + b = c applies -b to both sides.
        if (source_root.type === 'add' && 
            parent_path === source_side) {
            return scales.negate(source);
        }

        // ab = c applies a^-1 to both sides.  A reciprocal factor is its
        // own inverse operation in the expected way: (a^-1)^-1 -> a.
        if (
            source_root.type === 'mul' &&
            parent_path === source_side &&
            !(source.type === 'constant' && source.contents === 0)
        ) {
            return expressions.reciprocal(source);
        }

        return null;
    }

    function balance(equation, source_path, target_side, enabled_operations) {
        if (source_path == null) return null; // no source? no-op

        const source_side = paths.split(source_path).side;
        if (source_side === target_side) return equation; // same on both sides? no-op

        const parent_path = paths.parent(source_path);
        const is_alone = source_path === source_side;
        if (!is_alone && parent_path !== source_side) return equation; // not top-level? no-op

        const inverse = invert(equation, source_path, enabled_operations);
        if (inverse == null) return equation; // non-invertible operation? no-op

        const source_root = paths.resolve(equation, source_side);
        const target_root = paths.resolve(equation, target_side);
        const operation = is_alone?
            Object.keys(enabled_operations).find(operation => enabled_operations[operation]) :
            source_root.type;

        // a + b = c  ->  a = c - b
        // ab = c  ->  b = c/a
        // a/b = c is represented as a*b^-1 = c, so dragging b^-1 across
        // uses the same inverse operation and reciprocal(b^-1) becomes b.
        const new_source = is_alone? expressions[operation]([]) :
            expressions.remove(source_root, Number(paths.segment(source_path)));
        const new_target = expressions.append(operation, target_root, inverse);
        let left, right;
        [left,right] = target_side==='L'? [new_target, new_source] : [new_source, new_target];
        return equation.with({left: left, right: right});

    }

    function swap(equation, path1, path2) {
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

    function combine(equation, source_path, target_path) {
        const parent_path = paths.parent(source_path);
        if (parent_path == null || parent_path !== paths.parent(target_path)) return equation;

        const parent = paths.resolve(equation, parent_path);
        const group_expressions = _group_expressions_for_tag[parent.type];
        if (group_expressions == null) return equation;

        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);
        const source_index = Number(paths.segment(source_path));
        const target_index = Number(paths.segment(target_path));

        const combined = (
            expressions.combine(parent.type, source, target) || 
            group_expressions.combine(source, target)
        );
        if (combined == null) return equation;

        return collapse(
            equation,
            parent_path,
            source_index,
            target_index,
            combined
        );

    }

    function distribute(equation, source_path, target_path) {
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

        return collapse(
            equation,
            source_parent_path,
            Number(paths.segment(source_path)),
            Number(paths.segment(target_path)),
            distributed
        );
    }


    function simplify(equation) {
        const left = expressions.simplify(equation.left);
        const right = expressions.simplify(equation.right);
        return left === equation.left && right === equation.right? equation :
            equation.with({ left:left, right:right });
    }

    return Object.freeze({
        collapse,
        balance,
        swap,
        combine,
        distribute,
        invert,
        simplify,
    });
}
