'use strict';

/*
Every returned rewrite is equivalence-preserving under the nonzero-divisor
assumptions supplied by the active level. Unsupported operations return an
empty list.
*/
function Equations(dependencies) {
    const grouplikes = dependencies.grouplikes;
    const paths = dependencies.expression_paths;
    const ringlikes = dependencies.ringlikes;
    const expressions = dependencies.expressions;

    const freeze = Object.freeze;

    function balance_operation(equation, target_side, new_source, new_target, preview_expression, operator_tag) {
        const left_right = target_side === 'L'?
            [new_target, new_source] : [new_source, new_target];
        return freeze({
            expression: preview_expression,
            equation: equation.with({ left:left_right[0], right:left_right[1] }),
            operator: operator_tag || null,
        });
    }

    function balance(equation, source_path, target_side) {
        if (source_path == null) return freeze([]);

        const source_side = paths.split(source_path).side;
        if (source_side === target_side) return freeze([]);

        const parent_path = paths.parent(source_path);
        const is_alone = source_path === source_side;
        if (!is_alone && parent_path !== source_side) return freeze([]);

        const source_root = paths.resolve(equation, source_side);
        const target_root = paths.resolve(equation, target_side);
        if (source_root == null || target_root == null) return freeze([]);

        const choices = [];

        if (!is_alone) {
            const source = paths.resolve(equation, source_path);
            expressions.balance(source_root, source, target_root).forEach(result =>
                choices.push(balance_operation(
                    equation,
                    target_side,
                    result.source,
                    result.target,
                    result.preview,
                    null
                ))
            );

            const operation = source_root.type;
            const inverse = ringlikes.inverse(operation, source);
            if (inverse != null) {
                const new_source = grouplikes.cancel(
                    source_root,
                    Number(paths.segment(source_path))
                );
                if (new_source != null && new_source !== source_root) {
                    const new_target = grouplikes.append(operation, target_root, inverse);
                    const operator = ringlikes.is_inverse(operation, inverse)? null : operation;
                    choices.push(balance_operation(
                        equation,
                        target_side,
                        new_source,
                        new_target,
                        inverse,
                        operator
                    ));
                }
            }

            return freeze(choices);
        }

        grouplikes.types.forEach(operation => {
            const create = grouplikes[operation];
            if (create == null) return;
            const identity = create([]);
            if (identity == null) return;

            const inverse = ringlikes.inverse(operation, source_root);
            if (inverse == null) return;

            const new_target = grouplikes.append(operation, target_root, inverse);
            const operator = ringlikes.is_inverse(operation, inverse)? null : operation;
            choices.push(balance_operation(
                equation,
                target_side,
                identity,
                new_target,
                inverse,
                operator
            ));
        });

        return freeze(choices);
    }

    function commute(equation, path1, path2) {
        if (path1 == null || path2 == null || path1 === path2) return freeze([]);

        const parent_path = paths.parent(path1);
        if (parent_path == null || parent_path !== paths.parent(path2)) return freeze([]);

        const parent = paths.resolve(equation, parent_path);
        if (parent == null) return freeze([]);

        const segment1 = paths.segment(path1);
        const segment2 = paths.segment(path2);
        if (!/^\d+$/.test(segment1) || !/^\d+$/.test(segment2)) return freeze([]);

        const index1 = Number(segment1);
        const index2 = Number(segment2);
        if (index1 >= parent.contents.length || index2 >= parent.contents.length) return freeze([]);
        if (parent.contents[index1] === parent.contents[index2]) return freeze([]);

        const commuted = grouplikes.commute(parent, index1, index2);
        if (commuted === parent) return freeze([]);

        return freeze([freeze({
            expression: commuted,
            equation: paths.replace(equation, parent_path, commuted),
            operator: null,
        })]);
    }

    function combine(equation, source_path, target_path) {
        const source_parent_path = paths.parent(source_path);
        const target_parent_path = paths.parent(target_path);
        if (source_parent_path == null || target_parent_path == null) return freeze([]);

        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);
        if (source == null || target == null) return freeze([]);

        if (source_parent_path !== target_parent_path) {
            let outer_path, inner_path, outer_fixed, inner_fixed;
            if (paths.is_ancestor(source_parent_path, target_parent_path)) {
                [outer_path, inner_path, outer_fixed, inner_fixed] =
                    [source_parent_path, target_parent_path, source, target];
            } else if (paths.is_ancestor(target_parent_path, source_parent_path)) {
                [outer_path, inner_path, outer_fixed, inner_fixed] =
                    [target_parent_path, source_parent_path, target, source];
            } else {
                return freeze([]);
            }

            const outer = paths.resolve(equation, outer_path);
            const inner = paths.resolve(equation, inner_path);
            if (outer == null || inner == null) return freeze([]);

            return freeze(expressions.strip(
                outer, inner, outer_fixed, inner_fixed
            ).map(replacement => freeze({
                expression: replacement,
                equation: paths.replace(equation, outer_path, replacement),
                operator: null,
            })));
        }

        const parent = paths.resolve(equation, source_parent_path);
        if (parent == null) return freeze([]);

        const source_index = Number(paths.segment(source_path));
        const target_index = Number(paths.segment(target_path));
        const left = source_index < target_index? source : target;
        const right = source_index < target_index? target : source;

        return freeze(expressions.combine(parent, left, right).map(replacement =>
            freeze({
                expression: replacement,
                equation: paths.replace(
                    equation,
                    source_parent_path,
                    grouplikes.collapse(parent, source_index, target_index, replacement)
                ),
                operator: null,
            })
        ));
    }

    function distribute(equation, source_path, target_path) {
        const parent_path = paths.parent(source_path);
        if (parent_path == null || parent_path !== paths.parent(target_path)) return freeze([]);

        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);
        if (source == null || target == null || target.type === 'constant') return freeze([]);

        const source_index = Number(paths.segment(source_path));
        const target_index = Number(paths.segment(target_path));
        const parent = paths.resolve(equation, parent_path);
        if (parent == null) return freeze([]);

        return freeze(expressions.distribute(
            parent, source, target, source_index, target_index
        ).map(replacement => freeze({
            expression: replacement,
            equation: paths.replace(
                equation,
                parent_path,
                grouplikes.collapse(parent, source_index, target_index, replacement)
            ),
            operator: null,
        })));
    }

    function simplify(equation) {
        const left = grouplikes.simplify(equation.left);
        const right = grouplikes.simplify(equation.right);
        return left === equation.left && right === equation.right? equation :
            equation.with({ left:left, right:right });
    }

    return freeze({
        balance,
        commute,
        combine,
        distribute,
        simplify,
    });
}
