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

    function _term_value(expression) {
        if (expression.type !== 'mul') return expression;
        return expressions.mul(expression.contents);
    }

    function _side_value(expression) {
        if (expression.type !== 'add') return expression;
        return expressions.add(expression.contents.map(_term_value));
    }

    /*
    A surface expression has two possible operation contexts:

        add([..., term, ...])       term is an additive operand
        add([mul([...factor...])])  factor is a multiplicative operand, but
                                    only when that product is the entire side

    The latter restriction prevents moving a factor out of just one term of a
    sum as though it multiplied the whole side.
    */
    function _operation_context(equation, source_path) {
        const parsed = paths.split(source_path);
        const side_path = parsed.side;
        const side = paths.resolve(equation, side_path);
        const parent_path = paths.parent(source_path);
        if (side == null || side.type !== 'add' || parent_path == null) return null;

        if (parent_path === side_path) {
            return {
                type: 'add',
                side: side,
                container_path: side_path,
                container: side,
            };
        }

        const container = paths.resolve(equation, parent_path);
        if (
            side.contents.length === 1 &&
            paths.parent(parent_path) === side_path &&
            paths.segment(parent_path) === '0' &&
            container != null &&
            container.type === 'mul'
        ) {
            return {
                type: 'mul',
                side: side,
                container_path: parent_path,
                container: container,
            };
        }

        return null;
    }

    function balance(equation, source_path, target_side) {
        const parsed = paths.split(source_path);
        if (parsed.side === target_side) return equation;

        const source = paths.resolve(equation, source_path);
        const context = _operation_context(equation, source_path);
        if (source == null || context == null) return equation;

        const inverse = invert(equation, source_path);
        const index = Number(paths.segment(source_path));
        if (inverse == null || !Number.isInteger(index)) return equation;

        // Remove the selected operand in its actual additive/multiplicative
        // context, then let Equation restore the surface add([mul([...])])
        // representation for the source side.
        const removed = expressions.remove(context.container, index);
        const source_equation = paths.replace(
            equation,
            context.container_path,
            removed
        );
        const new_source = paths.resolve(source_equation, parsed.side);

        // Apply the inverse operation to the entire target side.  Unwrap the
        // purely structural singleton surface nodes first so x=7 divided by 2
        // becomes 7/2 rather than (7)/2.
        const target_root = paths.resolve(equation, target_side);
        const target_value = _side_value(target_root);
        const new_target = expressions.append(context.type, target_value, inverse);

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
        const context = _operation_context(equation, source_path);
        if (source == null || context == null) return null;

        // a + b = c applies -b to both sides.
        if (context.type === 'add') {
            return scales.negate(source);
        }

        // ab = c applies a^-1 to both sides.  A reciprocal factor is its own
        // inverse operation in the expected way: (a^-1)^-1 -> a.
        if (
            context.type === 'mul' &&
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
