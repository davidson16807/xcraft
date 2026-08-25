'use strict';

/*
`EquationDragOperations.choices` is the single entry point for user drag behavior. 
It addresses concerns regarding how user drags correspond to operations on equations.

It returns every distinct equation that the source/target drag can
legally produce. Ambiguity is preserved for the application layer to resolve.
*/
function EquationDragOperations(dependencies) {
    const paths = dependencies.expression_paths;
    const equations = dependencies.equations;
    const path_operations = dependencies.equation_path_operations;
    const equation_shape = dependencies.equation_shape;

    const freeze = Object.freeze;

    /*
    `format` filters out redundant choices 
    and simplifies choices if auto_simplify is activated
    */
    function format(choices, drag_options) {
        return freeze([
            ...new Map(choices.map(choice => {
                    const equation = drag_options.auto_simplify?
                        equations.simplify(choice.equation) : choice.equation;
                    const normalized = equation === choice.equation? choice :
                        new EquationDragChoice(
                            choice.expression,
                            choice.operator,
                            equation,
                            choice.side,
                            choice.type
                        );
                    return [equation_shape.encode(normalized.equation), normalized];
                }
            )).values()
        ]);
    }

    function source_domain(source) {
        return source.startsWith('side:')? 'side' : 'path';
    }

    function choices(equation, source, target_key, drag_options) {
        if (source == null || target_key == null) return freeze([]);

        if (source_domain(source) === 'side') {
            if (paths.domain(target_key) !== 'side') return freeze([]);
            return format(
                path_operations.swap(
                    equation,
                    paths.path(source),
                    paths.path(target_key)
                ),
                drag_options
            );
        }

        switch(paths.domain(target_key)) {
        case 'side': 
            return format(
                path_operations.balance(equation, source, paths.path(target_key)),
                drag_options
            );

        case 'path': 
            const target_path = paths.path(target_key);
            // non-existant target? no-op
            if (paths.resolve(equation, target_path) == null) return freeze([]);
            // source and target are the same or direct descendants? no-op
            if (source === target_path ||
                paths.is_ancestor(source, target_path) ||
                paths.is_ancestor(target_path, source)
            ) return freeze([]);

            const substantive = [
                ...path_operations.strip(equation, source, target_path),
                ...path_operations.combine(equation, source, target_path),
                ...path_operations.distribute(equation, source, target_path),
            ];
            return substantive.length > 0? 
                format(substantive, drag_options)
              : format(path_operations.commute(equation, source, target_path), drag_options);

        default:
            return freeze([]);
        }
    }

    function moves_for_source(equation, source, drag_options) {
        if (source_domain(source) === 'side') {
            const side = paths.path(source);
            const other_side = side === 'L'? 'R' : 'L';
            const target_key = `side:${other_side}`;
            return freeze(
                choices(equation, source, target_key, drag_options).length > 0?
                    [target_key] : []
            );
        }

        const parsed = paths.split(source);
        const other_side = parsed.side === 'L'? 'R' : 'L';
        const candidates = [
            `side:${other_side}`,
            ...paths.all(equation).map(path => `path:${path}`),
        ];
        return freeze(candidates.filter(target_key =>
            choices(equation, source, target_key, drag_options).length > 0
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
