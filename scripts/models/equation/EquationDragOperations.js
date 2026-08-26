'use strict';
// HUMAN VETTED

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
    const expression_shape = dependencies.expression_shape;

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
                    return [expression_shape.encode(normalized.equation), normalized];
                }
            )).values()
        ]);
    }

    function choices(equation, source, target_key, drag_options) {
        if (source == null || target_key == null) return freeze([]);
        const source_key = source.includes(':')? source : `path:${source}`;
        const source_path = paths.path(source_key);
        const target_path = paths.path(target_key);
 
        switch(paths.domain(source_key) + '->' + paths.domain(target_key)){

            case 'side->side':
                return format(
                    path_operations.swap(equation, source_path, target_path),
                    drag_options
                );

            case 'path->side': 
                return format(
                    path_operations.balance(equation, source_path, target_path),
                    drag_options
                );

            case 'path->path': 
                // non-existant target? no-op
                if (paths.resolve(equation, target_path) == null) return freeze([]);
                // source_path and target are the same or direct descendants? no-op
                if (source_path === target_path ||
                    paths.is_ancestor(source_path, target_path) ||
                    paths.is_ancestor(target_path, source_path)
                ) return freeze([]);

                const substantive = [
                    ...path_operations.strip(equation, source_path, target_path),
                    ...path_operations.combine(equation, source_path, target_path),
                    ...path_operations.distribute(equation, source_path, target_path),
                ];
                return substantive.length > 0? 
                    format(substantive, drag_options)
                  : format(path_operations.commute(equation, source_path, target_path), drag_options);

            default:
                return freeze([]);

        }

    }

    function moves_for_source(equation, source, drag_options) {
        const source_key = source.includes(':')? source : `path:${source}`;
        const source_path = paths.path(source_key);
        const source_side = paths.split(source_path).side;
        const other_side = source_side === 'L'? 'R' : 'L';
 
        if (paths.domain(source_key) === 'side') {
            const target_key = `side:${other_side}`;
            return freeze(
                choices(equation, source, target_key, drag_options).length > 0?
                    [target_key] : []
            );
        } else {
            const candidates = [
                `side:${other_side}`,
                ...paths.all(equation).map(path => `path:${path}`),
            ];
            return freeze(candidates.filter(target_key =>
                choices(equation, source, target_key, drag_options).length > 0
            ));
        }

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
