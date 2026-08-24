'use strict';

/*
`EquationDragOperations.choices` is the single entry point for user drag
behavior. It returns every distinct equation that the source/target drag can
legally produce. Ambiguity is preserved for the application layer to resolve.
*/
function EquationDragOperations(dependencies) {
    const paths = dependencies.expression_paths;
    const equations = dependencies.equations;
    const equation_shape = dependencies.equation_shape;

    function drag_choice(operation, side, type) {
        return new EquationDragChoice(
            new EquationDragPreview(operation.expression, operation.operator),
            operation.equation,
            side,
            type
        );
    }

    function distinct(choices, drag_options) {
        const results = new Map();
        choices.forEach(choice => {
            const equation = drag_options.auto_simplify?
                equations.simplify(choice.equation) : choice.equation;
            const normalized = equation === choice.equation? choice :
                new EquationDragChoice(choice.preview, equation, choice.side, choice.type);
            const key = equation_shape.encode(normalized.equation);
            if (!results.has(key)) results.set(key, normalized);
        });
        return Object.freeze([...results.values()]);
    }

    function choices(equation, source_path, target_key, drag_options) {
        if (source_path == null || target_key == null) return Object.freeze([]);

        switch(paths.domain(target_key)) {
        case 'side': {
            const side = target_key.slice(5);
            return distinct(
                equations.balance(equation, source_path, side)
                    .map(operation => drag_choice(operation, side, 'balance')),
                drag_options
            );
        }

        case 'path': {
            const target_path = paths.path(target_key);
            if (paths.resolve(equation, target_path) == null) return Object.freeze([]);
            if (
                source_path === target_path ||
                paths.is_ancestor(source_path, target_path) ||
                paths.is_ancestor(target_path, source_path)
            ) return Object.freeze([]);

            const side = paths.split(target_path).side;
            return distinct([
                ...equations.combine(equation, source_path, target_path)
                    .map(operation => drag_choice(operation, side, 'combine')),
                ...equations.distribute(equation, source_path, target_path)
                    .map(operation => drag_choice(operation, side, 'distribute')),
                ...equations.commute(equation, source_path, target_path)
                    .map(operation => drag_choice(operation, side, 'commute')),
            ], drag_options);
        }

        default:
            return Object.freeze([]);
        }
    }

    function moves_for_source(equation, source_path, drag_options) {
        const parsed = paths.split(source_path);
        const other_side = parsed.side === 'L'? 'R' : 'L';
        const candidates = [
            `side:${other_side}`,
            ...paths.all(equation).map(path => `path:${path}`),
        ];
        return Object.freeze(candidates.filter(target_key =>
            choices(equation, source_path, target_key, drag_options).length > 0
        ));
    }

    function draggable_paths(equation, drag_options) {
        return Object.freeze(paths.all(equation).filter(path =>
            moves_for_source(equation, path, drag_options).length > 0
        ));
    }

    return Object.freeze({
        choices,
        moves_for_source,
        draggable_paths,
    });
}
