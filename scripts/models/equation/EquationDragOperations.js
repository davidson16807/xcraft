'use strict';

/*
`EquationDragOperations` presents and consolidates operations under `Equations`
under a single operation, `move`, that is analogous to the drag-and-drop action of a user.
This operation returns a new Equation that is the result of an equivalence-preserving rewrite 
under the nonzero-divisor assumptions supplied by the active level.
Unsupported drags return the original equation reference.
*/
function EquationDragOperations(dependencies) {
    const paths = dependencies.expression_paths;
    const equations = dependencies.equations;

    function move(equation, source_path, target_key, root_operation) {
        if (source_path == null || target_key == null) return equation;

        switch(paths.domain(target_key))
        {
        case 'side':
            return equations.balance(equation, source_path, target_key.slice(5), root_operation);
        case 'path':
            const target_path = paths.path(target_key);
            if (
                source_path === target_path ||
                paths.is_ancestor(source_path, target_path) ||
                paths.is_ancestor(target_path, source_path)
            ) return equation;
            const combined = equations.combine(equation, source_path, target_path);
            if (combined !== equation) return combined;
            const distributed = equations.distribute(equation, source_path, target_path);
            return distributed !== equation? distributed : equations.swap(equation, source_path, target_path);
        default:
            return equation;
        }

    }

    function moves_for_source(equation, source_path, root_operation) {
        const parsed = paths.split(source_path);
        const other_side = parsed.side === 'L'? 'R' : 'L';
        const candidates = [
            `side:${other_side}`,
            ...paths.all(equation).map(path => `path:${path}`),
        ];
        return Object.freeze(candidates.filter(target_key =>
            move(equation, source_path, target_key, root_operation) !== equation
        ));
    }


    function root_operations(equation, source_path) {
        if (paths.parent(source_path) != null) return Object.freeze([]);
        const source = paths.resolve(equation, source_path);
        if (source == null || source.type === 'add' || source.type === 'mul') return Object.freeze([]);
        return Object.freeze(['add', 'mul'].filter(operation =>
            moves_for_source(equation, source_path, operation).length > 0
        ));
    }

    function draggable_paths(equation) {
        return Object.freeze(paths.all(equation).filter(path =>
            moves_for_source(equation, path).length > 0
        ));
    }

    return Object.freeze({
        invert: equations.invert,
        move,
        moves_for_source,
        draggable_paths,
        root_operations,
    });
}
