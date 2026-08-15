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

    /*
    Equation roots intentionally retain add([mul([...])]) wrappers.  Algebraic
    operations sometimes need the value represented by a side without those
    interaction-only singleton wrappers.
    */
    function side_value(side) {
        if (side.type !== 'add') return side;
        return expressions.add(side.contents.map(term =>
            term.type === 'mul'? expressions.mul(term.contents) : term
        ));
    }

    function operation_for_source(equation, source_path) {
        const parsed = paths.split(source_path);
        const root_path = parsed.side;
        const root = paths.resolve(equation, root_path);
        const parent_path = paths.parent(source_path);

        if (root == null || root.type !== 'add') return null;

        if (parent_path === root_path) {
            return { type:'add', parent:root };
        }

        if (root.contents.length !== 1) return null;
        const term_path = paths.nary(root_path, 0);
        if (parent_path !== term_path) return null;

        const term = paths.resolve(equation, term_path);
        return term != null && term.type === 'mul'?
            { type:'mul', parent:term } :
            null;
    }

    /* collapse two sibling operands into one replacement */
    function collapse(equation, parent_path, source_index, target_index, replacement) {
        let parent = paths.resolve(equation, parent_path);
        if (parent == null) return equation;
        return paths.replace(equation, parent_path, 
                expressions.collapse(parent, source_index, target_index, replacement));
    }

    function balance(equation, source_path, target_side) {
        const parsed = paths.split(source_path);
        if (parsed.side === target_side) return equation;

        const source = paths.resolve(equation, source_path);
        const operation = operation_for_source(equation, source_path);
        if (source == null || operation == null) return equation;

        const source_root = paths.resolve(equation, parsed.side);
        const target_root = paths.resolve(equation, target_side);
        const inverse = invert(equation, source_path);
        const index = Number(paths.segment(source_path));
        if (inverse == null) return equation;

        let new_source, new_target;
        if (operation.type === 'add') {
            // a + b = c  ->  a = c - b
            new_source = expressions.remove(source_root, index);
            new_target = expressions.append('add', target_root, inverse);
        } else {
            // ab = c  ->  b = c/a
            // The enclosing add has exactly one term, so removing a factor
            // changes the value of the whole source side.
            new_source = expressions.remove(operation.parent, index);
            new_target = expressions.append('mul', side_value(target_root), inverse);
        }

        let left, right;
        [left,right] = target_side === 'L'?
            [new_target, new_source] :
            [new_source, new_target];
        return equation.with({left:left, right:right});
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

        // 2x + 3x -> 5x, and 7 + (-3) -> 4.
        // x^2 * x^3 -> x^5, x * x -> x^2, and numeric products.
        const combined = group_expressions.combine(
            paths.resolve(equation, source_path), 
            paths.resolve(equation, target_path)
        );
        if (combined == null) return equation;

        return collapse(
            equation,
            parent_path,
            Number(paths.segment(source_path)),
            Number(paths.segment(target_path)),
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

    function invert(equation, source_path) {
        if (source_path == null) return null;

        const source = paths.resolve(equation, source_path);
        const operation = operation_for_source(equation, source_path);
        if (source == null || operation == null) return null;

        if (operation.type === 'add') {
            return scales.negate(source);
        }

        if (
            operation.type === 'mul' &&
            !(source.type === 'constant' && source.contents === 0)
        ) {
            return expressions.reciprocal(source);
        }

        return null;
    }

    return Object.freeze({
        collapse,
        balance,
        swap,
        combine,
        distribute,
        invert,
    });
}
