'use strict';
// HUMAN VETTED

/*
`EquationPathOperations` translates path-addressed equation operations into the
path-free algebra exposed by `Equations`. It owns path validation, resolution,
ancestry, replacement, and target-side placement; it owns no algebraic laws.
*/
function EquationPathOperations(dependencies) {
    const paths = dependencies.expression_paths;
    const equations = dependencies.equations;

    const freeze = Object.freeze;
    const noop = freeze([]);
    const root = '';

    function balance(equation, source_path, target_side) {
        typecheck(equation, 'Relation');
        typecheck(source_path, 'String');
        typecheck(target_side, 'String');
        const source_side = paths.root(source_path);
        if (source_side === target_side) return noop;
        // nothing to balance? no-op

        const source_root_path = paths.nary(source_side, 0);
        const parent_path = paths.parent(source_path);
        const is_alone = source_path === source_root_path;
        if (!is_alone && parent_path !== source_root_path) return noop;
        // not alone and not top-level? no-op

        const source_index = is_alone? null : Number(paths.segment(source_path));
        if (!is_alone && !Number.isInteger(source_index)) return noop;
        // invalid source index? no-op

        return equations.balance(equation, source_side, source_index, target_side);
    }

    function swap(equation, path1, path2) {
        typecheck(equation, 'Relation');
        typecheck(path1, 'String');
        typecheck(path2, 'String');
        if (path1 === path2) return noop;
        if (paths.parent(path1) !== root || paths.parent(path2) !== root) return noop;
        // relation swapping only applies to the two top-level side nodes

        const side1 = paths.resolve(equation, path1);
        const side2 = paths.resolve(equation, path2);
        if (side1 == null || side2 == null || side1.type !== 'side' || side2.type !== 'side') {
            return noop;
        }

        const expression1 = paths.resolve(equation, paths.nary(path1, 0));
        if (expression1 == null) return noop;

        return freeze(equations.swap(equation).map(replacement =>
            new EquationDragChoice(
                expression1,
                '',
                replacement,
                path2,
                'swap'
            )
        ));
    }

    function commute(equation, path1, path2) {
        typecheck(equation, 'Relation');
        typecheck(path1, 'String');
        typecheck(path2, 'String');
        if (path1 === path2) return noop;
        // nothing to swap? no-op

        const parent_path = paths.parent(path1);
        if (parent_path === root || parent_path !== paths.parent(path2)) return noop;
        // don't share the same parent? no-op

        const parent = paths.resolve(equation, parent_path);
        if (parent == null) return noop;
        // non-existant parent? no-op

        const index1 = Number(paths.segment(path1));
        const index2 = Number(paths.segment(path2));
        if (!Number.isInteger(index1) || !Number.isInteger(index2)) return noop;
        // invalid source and target indices? no-op

        return freeze(
            equations.commute(parent, index1, index2)
                .map(replacement =>
                    new EquationDragChoice(
                        replacement,
                        '',
                        paths.replace(equation, parent_path, replacement),
                        paths.root(path2),
                        'commute'
                    )
                )
        );
    }

    function strip(equation, path1, path2) {
        typecheck(equation, 'Relation');
        typecheck(path1, 'String');
        typecheck(path2, 'String');
        const parent_path1 = paths.parent(path1);
        const parent_path2 = paths.parent(path2);
        if (parent_path1 === root || parent_path2 === root || parent_path1 === parent_path2) {
            return noop;
        }
        // strip only applies across nested parents

        const expression1 = paths.resolve(equation, path1);
        const expression2 = paths.resolve(equation, path2);
        if (expression1 == null || expression2 == null) return noop;
        // invalid expressions? no-op

        let outer_parent_path, inner_parent_path, outer, inner;
        if (paths.is_ancestor(parent_path1, parent_path2)) {
            [outer_parent_path, inner_parent_path, outer, inner] =
                [parent_path1, parent_path2, expression1, expression2];
        } else if (paths.is_ancestor(parent_path2, parent_path1)) {
            [outer_parent_path, inner_parent_path, outer, inner] =
                [parent_path2, parent_path1, expression2, expression1];
        } else {
            return noop; // neither ancestor to the other? no-op
        }

        const outer_parent = paths.resolve(equation, outer_parent_path);
        const inner_parent = paths.resolve(equation, inner_parent_path);
        if (outer_parent == null || inner_parent == null) return noop;
        // no parents? no-op

        return freeze(
            equations.strip(outer_parent, inner_parent, outer, inner)
                .map(replacement => new EquationDragChoice(
                    replacement,
                    '',
                    paths.replace(equation, outer_parent_path, replacement),
                    paths.root(path2),
                    'strip'
                ))
        );
    }

    function combine(equation, path1, path2) {
        typecheck(equation, 'Relation');
        typecheck(path1, 'String');
        typecheck(path2, 'String');
        const parent_path1 = paths.parent(path1);
        if (parent_path1 === root || paths.parent(path2) === root) return noop;
        // invalid parents? no-op

        const parent = paths.resolve(equation, parent_path1);
        if (parent == null) return noop;
        // no parent? no-op

        const index1 = Number(paths.segment(path1));
        const index2 = Number(paths.segment(path2));
        if (!Number.isInteger(index1) || !Number.isInteger(index2)) return noop;
        // invalid indices? no-op

        return freeze(equations.combine(parent, index1, index2).map(replacement =>
            new EquationDragChoice(
                replacement,
                '',
                paths.replace(equation, parent_path1, replacement),
                paths.root(path2),
                'combine'
            )
        ));
    }

    function distribute(equation, source_path, target_path) {
        typecheck(equation, 'Relation');
        typecheck(source_path, 'String');
        typecheck(target_path, 'String');
        const parent_path = paths.parent(source_path);
        if (parent_path === root || parent_path !== paths.parent(target_path)) return noop;
        // source and target do not share the same parent? no-op

        const parent = paths.resolve(equation, parent_path);
        if (parent == null) return noop;
        // non-existant parent? no-op

        const source_index = Number(paths.segment(source_path));
        const target_index = Number(paths.segment(target_path));
        if (!Number.isInteger(source_index) || !Number.isInteger(target_index)) return noop;
        // invalid source and target indices? no-op

        return freeze(
            equations.distribute(parent, source_index, target_index)
                .map(replacement =>
                    new EquationDragChoice(
                        replacement,
                        '',
                        paths.replace(equation, parent_path, replacement),
                        paths.root(target_path),
                        'distribute'
                    )
                )
        );
    }

    return freeze({
        balance,
        swap,
        commute,
        strip,
        combine,
        distribute,
    });
}
