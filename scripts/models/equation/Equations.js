'use strict';

/*
Every successful operation in this namespace is an equivalence-preserving
rewrite under the nonzero-divisor assumptions supplied by the active level.
Unsupported drags return the original equation reference.

`Equations` synthesizes algebraic operations that can be derived from `Grouplikes` and `Ringlike`.
*/
function Equations(dependencies) {
    const grouplikes = dependencies.grouplikes;
    const paths = dependencies.expression_paths;
    const ringlikes = dependencies.ringlikes;

    function invert(equation, source_path, enabled) {
        if (source_path == null) return null; // no source? no-op

        const source_side = paths.split(source_path).side;
        const source = paths.resolve(equation, source_path);
        if (source == null) return null; // non-existant source? no-op

        const source_root = paths.resolve(equation, source_side);
        const parent_path = paths.parent(source_path);
        const is_alone = source_path === source_side;

        if (is_alone) {
            const inverses = [...enabled]
                .map(operation => {
                    if (grouplikes.create(operation, []) == null) return null;
                    return ringlikes.inverse(operation, source);
                })
                .filter(inverse => inverse != null);
            return inverses.length === 1? inverses[0] : null;
        }

        if (!enabled.has(source_root.type)) return null; // disabled? no-op
        if (parent_path !== source_side) return null; // not top-level? no-op
        const inverse = ringlikes.inverse(source_root.type, source);
        if (inverse == null) return null;
        const cancelled = grouplikes.cancel(
            source_root, Number(paths.segment(source_path)));
        return cancelled === source_root? null : inverse;
    }

    function balance(equation, source_path, target_side, enabled) {
        if (source_path == null) return equation; // no source? no-op

        const source_side = paths.split(source_path).side;
        if (source_side === target_side) return equation; // same on both sides? no-op

        const parent_path = paths.parent(source_path);
        const is_alone = source_path === source_side;
        if (!is_alone && parent_path !== source_side) return equation; // not top-level? no-op

        const source_root = paths.resolve(equation, source_side);
        const target_root = paths.resolve(equation, target_side);

        let operation = source_root.type;
        let inverse = invert(equation, source_path, enabled);
        if (inverse == null) return equation; // non-invertible or ambiguous? no-op

        if (is_alone) {
            const operations = [...enabled].filter(operation => {
                return grouplikes.create(operation, []) != null &&
                    ringlikes.inverse(operation, source_root) != null;
            });
            if (operations.length !== 1) return equation;
            operation = operations[0];
        }

        // a + b = c  ->  a = c - b
        // ab = c  ->  b = c/a
        // a/b = c is represented as a*b^-1 = c, so dragging b^-1 across
        // uses the same inverse operation and reciprocal(b^-1) becomes b.
        const new_source = is_alone? grouplikes.create(operation, []) :
            grouplikes.cancel(source_root, Number(paths.segment(source_path)));
        if (new_source == null || (!is_alone && new_source === source_root)) return equation;
        const new_target = grouplikes.append(operation, target_root, inverse);
        let left, right;
        [left,right] = target_side==='L'? [new_target, new_source] : [new_source, new_target];
        return equation.with({left: left, right: right});

    }

    function commute(equation, path1, path2) {
        if (path1 == null || path2 == null || path1 === path2) return equation;

        const parent_path = paths.parent(path1);
        if (parent_path == null || parent_path !== paths.parent(path2)) return equation;

        const parent = paths.resolve(equation, parent_path);
        if (parent == null) return equation;

        const segment1 = paths.segment(path1);
        const segment2 = paths.segment(path2);
        if (!/^\d+$/.test(segment1) || !/^\d+$/.test(segment2)) return equation;

        const index1 = Number(segment1);
        const index2 = Number(segment2);
        if (index1 >= parent.contents.length || index2 >= parent.contents.length) return equation;

        const commuted = grouplikes.commute(parent, index1, index2);

        return paths.replace(equation, parent_path, commuted);
    }

    function combine(equation, source_path, target_path) {
        const parent_path = paths.parent(source_path);
        if (parent_path == null || parent_path !== paths.parent(target_path)) return equation;

        const parent = paths.resolve(equation, parent_path);
        if (parent == null) return equation;

        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);
        const source_index = Number(paths.segment(source_path));
        const target_index = Number(paths.segment(target_path));

        const left = source_index < target_index? source : target;
        const right = source_index < target_index? target : source;
        const combined = (
            grouplikes.combine(parent.type, left, right) ||
            ringlikes.combine(parent, source, target)
        );
        if (combined == null) return equation;

        return paths.replace(equation, parent_path, 
                grouplikes.collapse(parent, source_index, target_index, combined));

    }

    function distribute(equation, source_path, target_path) {
        const parent_path = paths.parent(source_path);
        if (parent_path == null || parent_path !== paths.parent(target_path)) return equation;

        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);
        const source_index = Number(paths.segment(source_path));
        const target_index = Number(paths.segment(target_path));
        if (target.type === 'constant') return equation;

        const parent = paths.resolve(equation, parent_path);
        if (parent == null) return equation;

        // The source always distributes across the target,
        // so source and target position determines whether the distribution is left or right.
        const distributed = source_index < target_index?
            ringlikes.left_distribute(parent, source, target)
          : ringlikes.right_distribute(parent, target, source);
        if (distributed == null) return equation;

        return paths.replace(equation, parent_path, 
                grouplikes.collapse(parent, source_index, target_index, distributed));
    }

    function simplify(equation) {
        const left = grouplikes.simplify(equation.left);
        const right = grouplikes.simplify(equation.right);
        return left === equation.left && right === equation.right? equation :
            equation.with({ left:left, right:right });
    }

    return Object.freeze({
        balance,
        commute,
        combine,
        distribute,
        invert,
        simplify,
    });
}
