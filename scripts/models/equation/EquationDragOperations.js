'use strict';

/*
`EquationDragOperations.choices` is the single model entry point for equation
symbol drags. It discovers every valid algebraic interpretation of one source /
target pair and returns immutable `EquationDragChoice` values.
*/
function EquationDragOperations(dependencies) {
    const paths = dependencies.expression_paths;
    const equations = dependencies.equations;
    const equation_shape = dependencies.equation_shape;

    function distinct(choices) {
        const results = new Map();
        choices.forEach(choice => {
            const key = [
                choice.type,
                choice.side,
                equation_shape.encode(choice.equation),
            ].join('|');
            if (!results.has(key)) results.set(key, choice);
        });
        return Object.freeze([...results.values()]);
    }

    function choices(equation, source_path, target_key, drag_options) {
        if (source_path == null || target_key == null) return Object.freeze([]);

        let found;
        switch(paths.domain(target_key)) {
        case 'side':
            found = equations.balance(equation, source_path, target_key.slice(5));
            break;
        case 'path': {
            const target_path = paths.path(target_key);
            if (paths.resolve(equation, target_path) == null) return Object.freeze([]);
            if (
                source_path === target_path ||
                paths.is_ancestor(source_path, target_path) ||
                paths.is_ancestor(target_path, source_path)
            ) return Object.freeze([]);
            found = [
                ...equations.combine(equation, source_path, target_path),
                ...equations.distribute(equation, source_path, target_path),
                ...equations.commute(equation, source_path, target_path),
            ];
            break;
        }
        default:
            return Object.freeze([]);
        }

        if (drag_options.auto_simplify) {
            found = found.map(choice => new EquationDragChoice(
                choice.preview,
                equations.simplify(choice.equation),
                choice.side,
                choice.type
            ));
        }
        return distinct(found);
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
