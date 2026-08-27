'use strict';

/*
`EquationDragOperations.choices` is the single entry point for user drag behavior.
It addresses concerns regarding how user drags correspond to operations on equations.

All drag sources and targets are ordinary Expression paths. Relation side nodes
are distinguished structurally by `type === 'side'`, not by a separate path domain.

It returns every distinct equation that the source/target drag can
legally produce. Ambiguity is preserved for the application layer to resolve.
*/
function EquationDragOperations(dependencies) {
    const paths = dependencies.expression_paths;
    const equations = dependencies.equations;
    const path_operations = dependencies.equation_path_operations;
    const expression_shape = dependencies.expression_shape;
    const expression_caveats = dependencies.expression_caveats;

    const freeze = Object.freeze;

    /*
    `format` filters out redundant choices
    and simplifies choices if auto_simplify is activated
    */
    function format(choices, drag_options) {
        const distinct = new Map();
        choices.forEach(choice => {
            const equation = drag_options.auto_simplify?
                equations.simplify(choice.equation) : choice.equation;
            let normalized = equation === choice.equation? choice :
                new EquationDragChoice(
                    choice.expression,
                    choice.operator,
                    equation,
                    choice.side,
                    choice.type
                );
            const key = expression_shape.encode(normalized.equation);
            const existing = distinct.get(key);
            if (existing != null) {
                normalized = new EquationDragChoice(
                    normalized.expression,
                    normalized.operator,
                    expression_caveats.inherit(normalized.equation, existing.equation),
                    normalized.side,
                    normalized.type
                );
            }
            distinct.set(key, normalized);
        });
        return freeze([...distinct.values()]);
    }

    function choices(equation, source_path, target_path, drag_options) {
        if (source_path == null || target_path == null) return freeze([]);
        // no paths? no-op

        const source = paths.resolve(equation, source_path);
        const target = paths.resolve(equation, target_path);
        if (source == null || target == null) return freeze([]);
        // non-existant paths? no-op

        const source_is_side = source.type === 'side';
        const target_is_side = target.type === 'side';

        if (source_is_side) {
            return target_is_side?
                format(path_operations.swap(equation, source_path, target_path), drag_options) :
                freeze([]);
        }

        if (target_is_side) {
            return format(path_operations.balance(equation, source_path, target_path), drag_options);
        }

        if (source_path === target_path ||
            paths.is_ancestor(source_path, target_path) ||
            paths.is_ancestor(target_path, source_path)
        ) return freeze([]);
        // source_path and target are the same or direct descendants? no-op

        const primary = [
            ...path_operations.strip(equation, source_path, target_path),
            ...path_operations.combine(equation, source_path, target_path),
            ...path_operations.distribute(equation, source_path, target_path),
        ];
        const secondary = [
            ...path_operations.commute(equation, source_path, target_path),
        ]
        return format(primary.length > 0? primary : secondary, drag_options);
    }

    function moves_for_source(equation, source_path, drag_options) {
        if (paths.resolve(equation, source_path) == null) return freeze([]);
        return freeze(paths.all(equation).filter(target_path =>
            choices(equation, source_path, target_path, drag_options).length > 0
        ));
    }

    function draggable_paths(equation, drag_options) {
        return freeze(paths.all(equation).filter(path =>
            moves_for_source(equation, path, drag_options).length > 0
        ));
    }

    return freeze({
        choices,
        moves_for_source,
        draggable_paths,
    });
}
