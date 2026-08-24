'use strict';
// HUMAN VETTED

/*
`EquationDragOperations.choices` is the single entry point for user drag
behavior. It returns every distinct equation that the source/target drag can
legally produce. Ambiguity is preserved for the application layer to resolve.
*/
function EquationDragOperations(dependencies) {
    const paths = dependencies.expression_paths;
    const equations = dependencies.equations;
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

    function choices(equation, source_path, target_key, drag_options) {
        if (source_path == null || target_key == null) return freeze([]);

        switch(paths.domain(target_key)) {
        case 'side': 
            const side = target_key.slice(5);
            return format(equations.balance(equation, source_path, side), drag_options);

        case 'path': 
            const target_path = paths.path(target_key);
            // non-existant target? no-op
            if (paths.resolve(equation, target_path) == null) return freeze([]);
            // source and target are the same or direct descendants? no-op
            if (source_path === target_path ||
                paths.is_ancestor(source_path, target_path) ||
                paths.is_ancestor(target_path, source_path)
            ) return freeze([]);

            const substantive = [
                ...equations.combine(equation, source_path, target_path),
                ...equations.distribute(equation, source_path, target_path),
            ];
            return substantive.length > 0? 
                format(substantive, drag_options)
              : format(equations.commute(equation, source_path, target_path), drag_options);

        default:
            return freeze([]);
        }
    }

    function moves_for_source(equation, source_path, drag_options) {
        const parsed = paths.split(source_path);
        const other_side = parsed.side === 'L'? 'R' : 'L';
        const candidates = [
            `side:${other_side}`,
            ...paths.all(equation).map(path => `path:${path}`),
        ];
        return freeze(candidates.filter(target_key =>
            choices(equation, source_path, target_key, drag_options).length > 0
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
