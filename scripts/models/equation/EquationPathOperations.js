'use strict';

/*
`EquationPathOperations` translates path-addressed equation operations into the
path-free algebra exposed by `Equations`. It owns path validation, resolution,
ancestry, replacement, and target-side placement; it owns no algebraic laws.
*/
function EquationPathOperations(dependencies) {
    const paths = dependencies.expression_paths;
    const equations = dependencies.equations;

    const freeze = Object.freeze;

    function balance(equation, source_path, target_side) {
        if (source_path == null) return freeze([]);
        // no source? no-op

        const source_side = paths.split(source_path).side;
        if (source_side === target_side) return freeze([]);
        // nothing to balance? no-op

        const parent_path = paths.parent(source_path);
        const is_alone = source_path === source_side;
        if (!is_alone && parent_path !== source_side) return freeze([]);
        // not alone and not top-level? no-op

        const source_index = is_alone? null : Number(paths.segment(source_path));
        if (!is_alone && !Number.isInteger(source_index)) return freeze([]);
        // invalid source index? no-op

        return equations.balance(equation, source_side, source_index, target_side);
    }

    function commute(equation, path1, path2) {
        if (path1 == null || path2 == null || path1 === path2) return freeze([]);
        // nothing to swap? no-op

        const parent_path = paths.parent(path1);
        if (parent_path == null || parent_path !== paths.parent(path2)) return freeze([]);
        // don't share the same parent? no-op

        const parent = paths.resolve(equation, parent_path);
        if (parent == null) return freeze([]);
        // non-existant parent? no-op

        const index1 = Number(paths.segment(path1));
        const index2 = Number(paths.segment(path2));
        if (!Number.isInteger(index1) || !Number.isInteger(index2)) return freeze([]);
        // invalid source and target indices? no-op

        return freeze(
            equations.commute(parent, index1, index2)
                .map(replacement =>
                    new EquationDragChoice(
                        replacement,
                        null,
                        paths.replace(equation, parent_path, replacement),
                        paths.split(path2).side,
                        'commute'
                    )
                )
        );
    }

    function strip(equation, path1, path2) {
        const parent_path1 = paths.parent(path1);
        const parent_path2 = paths.parent(path2);
        if (parent_path1 == null || parent_path2 == null || parent_path1 === parent_path2) {
            return freeze([]);
        }
        // strip only applies across nested parents

        const expression1 = paths.resolve(equation, path1);
        const expression2 = paths.resolve(equation, path2);
        if (expression1 == null || expression2 == null) return freeze([]);
        // invalid expressions? no-op

        let outer_parent_path, inner_parent_path, outer, inner;
        if (paths.is_ancestor(parent_path1, parent_path2)) {
            [outer_parent_path, inner_parent_path, outer, inner] =
                [parent_path1, parent_path2, expression1, expression2];
        } else if (paths.is_ancestor(parent_path2, parent_path1)) {
            [outer_parent_path, inner_parent_path, outer, inner] =
                [parent_path2, parent_path1, expression2, expression1];
        } else {
            return freeze([]);
        }

        const outer_parent = paths.resolve(equation, outer_parent_path);
        const inner_parent = paths.resolve(equation, inner_parent_path);
        if (outer_parent == null || inner_parent == null) return freeze([]);

        return freeze(
            equations.strip(outer_parent, inner_parent, outer, inner)
                .map(replacement => new EquationDragChoice(
                    replacement,
                    null,
                    paths.replace(equation, outer_parent_path, replacement),
                    paths.split(path2).side,
                    'combine'
                ))
        );
    }

    function combine(equation, source_path, target_path) {
        const source_parent_path = paths.parent(source_path);
        const target_parent_path = paths.parent(target_path);
        if (source_parent_path == null || target_parent_path == null) return freeze([]);
        // invalid parents? no-op

        const parent = paths.resolve(equation, source_parent_path);
        if (parent == null) return freeze([]);

        const source_index = Number(paths.segment(source_path));
        const target_index = Number(paths.segment(target_path));
        if (!Number.isInteger(source_index) || !Number.isInteger(target_index)) return freeze([]);

        return freeze(equations.combine(parent, source_index, target_index).map(replacement =>
            new EquationDragChoice(
                replacement,
                null,
                paths.replace(equation, source_parent_path, replacement),
                paths.split(target_path).side,
                'combine'
            )
        ));
    }

    function distribute(equation, source_path, target_path) {
        const parent_path = paths.parent(source_path);
        if (parent_path == null || parent_path !== paths.parent(target_path)) return freeze([]);
        // source and target do not share the same parent? no-op

        const parent = paths.resolve(equation, parent_path);
        if (parent == null) return freeze([]);
        // non-existant parent? no-op

        const source_index = Number(paths.segment(source_path));
        const target_index = Number(paths.segment(target_path));
        if (!Number.isInteger(source_index) || !Number.isInteger(target_index)) return freeze([]);
        // invalid source and target indices? no-op

        return freeze(
            equations.distribute(parent, source_index, target_index)
                .map(replacement =>
                    new EquationDragChoice(
                        replacement,
                        null,
                        paths.replace(equation, parent_path, replacement),
                        paths.split(target_path).side,
                        'distribute'
                    )
                )
        );
    }

    return freeze({
        balance,
        commute,
        strip,
        combine,
        distribute,
    });

}
