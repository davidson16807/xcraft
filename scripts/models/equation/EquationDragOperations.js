'use strict';
// HUMAN VETTED

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

    function move(equation, source_path, target_key, drag_options) {
        if (source_path == null || target_key == null) return equation;

        const parent_path = paths.parent(source_path);
        const parent = parent_path == null? null : paths.resolve(equation, parent_path);
        if (parent != null && drag_options.enabled[parent.type] === false) return equation;

        let moved = equation;
        switch(paths.domain(target_key))
        {
        case 'side':
            moved = equations.balance(equation, source_path, target_key.slice(5), drag_options['enabled']);
            break;
        case 'path':
            const target_path = paths.path(target_key);
            if (paths.resolve(equation, target_path) == null) return equation;
            if (
                source_path === target_path ||
                paths.is_ancestor(source_path, target_path) ||
                paths.is_ancestor(target_path, source_path)
            ) return equation;
            moved = equations.combine(equation, source_path, target_path);
            if (moved !== equation) break;
            moved = equations.distribute(equation, source_path, target_path);
            if (moved !== equation) break;
            moved = equations.commute(equation, source_path, target_path);
            break;
        default:
            return equation;
        }

        if (moved === equation) return equation;
        return drag_options.auto_simplify? equations.simplify(moved) : moved;
    }

    function moves_for_source(equation, source_path, drag_options) {
        const parsed = paths.split(source_path);
        const other_side = parsed.side === 'L'? 'R' : 'L';
        const candidates = [
            `side:${other_side}`,
            ...paths.all(equation).map(path => `path:${path}`),
        ];
        return Object.freeze(candidates.filter(target_key =>
            move(equation, source_path, target_key, drag_options) !== equation
        ));
    }


    function draggable_paths(equation, drag_options) {
        return Object.freeze(paths.all(equation).filter(path =>
            moves_for_source(equation, path, drag_options).length > 0
        ));
    }

    function invert(equation, source_path, drag_options) {
        return equations.invert(equation, source_path, drag_options['enabled']);
    }

    return Object.freeze({
        invert,
        move,
        moves_for_source,
        draggable_paths,
    });
}
