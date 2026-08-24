'use strict';

/*
Every choice produced in this namespace is an equivalence-preserving rewrite
under the nonzero-divisor assumptions supplied by the active level.

`Equations` synthesizes algebraic operations that can be derived from
`Grouplikes`, `Ringlike`, and expression laws. It preserves every valid result;
`EquationDragOperations` decides how those choices are presented to the user.
*/
function Equations(dependencies) {
    const grouplikes = dependencies.grouplikes;
    const paths = dependencies.expression_paths;
    const ringlikes = dependencies.ringlikes;
    const expressions = dependencies.expressions;
    const balance_operations = Object.freeze([...(dependencies.balance_operations || [])]);

    function balance_preview(operation, inverse) {
        if (operation === 'mul' && ringlikes.is_inverse('mul', inverse)) return inverse;
        const create = grouplikes[operation];
        if (create == null) return inverse;
        return create([new Expression('slot'), inverse]);
    }

    function balance(equation, source_path, target_side) {
        if (source_path == null) return Object.freeze([]);

        const source_side = paths.split(source_path).side;
        if (source_side === target_side) return Object.freeze([]);

        const parent_path = paths.parent(source_path);
        const is_alone = source_path === source_side;
        if (!is_alone && parent_path !== source_side) return Object.freeze([]);

        const source_root = paths.resolve(equation, source_side);
        const target_root = paths.resolve(equation, target_side);
        const source = paths.resolve(equation, source_path);
        if (source_root == null || target_root == null || source == null) return Object.freeze([]);

        const choices = [];

        if (!is_alone) {
            expressions.balance(source_root, source, target_root).forEach(result => {
                const [left, right] = target_side === 'L'?
                    [result.target, result.source] :
                    [result.source, result.target];
                choices.push(new EquationDragChoice(
                    result.preview,
                    equation.with({ left:left, right:right }),
                    target_side,
                    'balance'
                ));
            });
        }

        const operations = is_alone?
            balance_operations :
            [source_root.type];

        operations.forEach(operation => {
            const create = grouplikes[operation];
            if (create == null) return;
            const identity = create([]);
            if (identity == null) return;

            const inverse = ringlikes.inverse(operation, source);
            if (inverse == null) return;

            const new_source = is_alone?
                identity :
                grouplikes.cancel(source_root, Number(paths.segment(source_path)));
            if (new_source == null || (!is_alone && new_source === source_root)) return;

            const new_target = grouplikes.append(operation, target_root, inverse);
            if (new_target == null) return;

            const [left, right] = target_side === 'L'?
                [new_target, new_source] :
                [new_source, new_target];
            choices.push(new EquationDragChoice(
                balance_preview(operation, inverse),
                equation.with({ left:left, right:right }),
                target_side,
                'balance'
            ));
        });

        return Object.freeze(choices);
    }

    function commute(equation, path1, path2) {
        if (path1 == null || path2 == null || path1 === path2) return Object.freeze([]);

        const parent_path = paths.parent(path1);
        if (parent_path == null || parent_path !== paths.parent(path2)) return Object.freeze([]);

        const parent = paths.resolve(equation, parent_path);
        if (parent == null) return Object.freeze([]);

        const segment1 = paths.segment(path1);
        const segment2 = paths.segment(path2);
        if (!/^\d+$/.test(segment1) || !/^\d+$/.test(segment2)) return Object.freeze([]);

        const index1 = Number(segment1);
        const index2 = Number(segment2);
        if (index1 >= parent.contents.length || index2 >= parent.contents.length) return Object.freeze([]);
        if (parent.contents[index1] === parent.contents[index2]) return Object.freeze([]);

        const commuted = grouplikes.commute(parent, index1, index2);
        if (commuted === parent) return Object.freeze([]);

        return Object.freeze([
            new EquationDragChoice(
                commuted,
                paths.replace(equation, parent_path, commuted),
                paths.split(path2).side,
                'commute'
            ),
        ]);
    }

    function combine(equation, source_path, target_path) {
        const source_parent_path = paths.parent(source_path);
        const target_parent_path = paths.parent(target_path);
        if (source_parent_path == null || target_parent_path == null) return Object.freeze([]);

        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);
        if (source == null || target == null) return Object.freeze([]);

        if (source_parent_path !== target_parent_path) {
            let outer_path, inner_path, outer_fixed, inner_fixed;
            if (paths.is_ancestor(source_parent_path, target_parent_path)) {
                [outer_path, inner_path, outer_fixed, inner_fixed] =
                    [source_parent_path, target_parent_path, source, target];
            } else if (paths.is_ancestor(target_parent_path, source_parent_path)) {
                [outer_path, inner_path, outer_fixed, inner_fixed] =
                    [target_parent_path, source_parent_path, target, source];
            } else {
                return Object.freeze([]);
            }

            const outer = paths.resolve(equation, outer_path);
            const inner = paths.resolve(equation, inner_path);
            if (outer == null || inner == null) return Object.freeze([]);

            return Object.freeze(expressions.cancel(
                outer, inner, outer_fixed, inner_fixed
            ).map(replacement => new EquationDragChoice(
                replacement,
                paths.replace(equation, outer_path, replacement),
                paths.split(target_path).side,
                'combine'
            )));
        }

        const parent = paths.resolve(equation, source_parent_path);
        if (parent == null) return Object.freeze([]);

        const source_index = Number(paths.segment(source_path));
        const target_index = Number(paths.segment(target_path));
        const left = source_index < target_index? source : target;
        const right = source_index < target_index? target : source;

        return Object.freeze(expressions.combine(parent, left, right).map(replacement =>
            new EquationDragChoice(
                replacement,
                paths.replace(
                    equation,
                    source_parent_path,
                    grouplikes.collapse(parent, source_index, target_index, replacement)
                ),
                paths.split(target_path).side,
                'combine'
            )
        ));
    }

    function distribute(equation, source_path, target_path) {
        const parent_path = paths.parent(source_path);
        if (parent_path == null || parent_path !== paths.parent(target_path)) return Object.freeze([]);

        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);
        if (source == null || target == null || target.type === 'constant') return Object.freeze([]);

        const source_index = Number(paths.segment(source_path));
        const target_index = Number(paths.segment(target_path));
        const parent = paths.resolve(equation, parent_path);
        if (parent == null) return Object.freeze([]);

        return Object.freeze(expressions.distribute(
            parent, source, target, source_index, target_index
        ).map(replacement => new EquationDragChoice(
            replacement,
            paths.replace(
                equation,
                parent_path,
                grouplikes.collapse(parent, source_index, target_index, replacement)
            ),
            paths.split(target_path).side,
            'distribute'
        )));
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
        simplify,
    });
}
