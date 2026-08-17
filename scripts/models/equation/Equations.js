'use strict';
// HUMAN VETTED

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
    const ring = dependencies.ring_expressions;

    /* collapse two sibling operands into one replacement */
    function collapse(equation, parent_path, index1, index2, replacement) {
        let parent = paths.resolve(equation, parent_path);
        if (parent == null) return equation;
        return paths.replace(equation, parent_path, 
                expressions.collapse(parent, index1, index2, replacement));
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
            return ring.inverse(enabled[0], source);
        }

        if (!enabled_operations[source_root.type]) return null; // disabled? no-op
        if (parent_path !== source_side) return null; // not top-level? no-op
        return ring.inverse(source_root.type, source);
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

    function combine(equation, source_path, target_path) {
        const parent_path = paths.parent(source_path);
        if (parent_path == null || parent_path !== paths.parent(target_path)) return equation;

        const parent = paths.resolve(equation, parent_path);
        if (parent == null) return equation;

        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);
        const source_index = Number(paths.segment(source_path));
        const target_index = Number(paths.segment(target_path));

        const combined = (
            expressions.combine(parent.type, source, target) ||
            ring.combine(parent.type, source, target)
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
        const parent_path = paths.parent(source_path);
        if (parent_path == null || parent_path !== paths.parent(target_path)) return equation;

        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);
        const source_index = Number(paths.segment(source_path));
        const target_index = Number(paths.segment(target_path));
        if (target.type === 'constant') return equation;

        const parent = paths.resolve(equation, parent_path);
        if (parent == null) return equation;

        /*
        Preserve the factor's original left/right position.  This is
        immaterial for today's commutative multiplication but keeps the
        rewrite valid as a pattern for future noncommutative products.
        The source always distributes across the target,
        so their position determines whether the distribution is left or right.
        */
        const distributed = source_index < target_index?
            ring.left_distribute(target.type, parent, source, target)
          : ring.right_distribute(target.type, parent, target, source);
        if (distributed == null) return equation;

        return collapse(
            equation,
            parent_path,
            source_index,
            target_index,
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
        balance,
        swap,
        combine,
        distribute,
        invert,
        simplify,
    });
}
