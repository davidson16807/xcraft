'use strict';

/*
Every successful operation in this namespace is an equivalence-preserving
rewrite.  Unsupported drags return the original equation reference.
*/
function Equations() {

    function other_side(side) {
        return side === 'L'? 'R' : 'L';
    }

    function is_direct_child(path, parent_path) {
        return EquationPaths.parent(path) === parent_path;
    }

    function replace_two_children(equation, parent_path, source_index, target_index, replacement, identity_type) {
        const parent = EquationPaths.resolve(equation, parent_path);
        const items = parent.type === 'add'? parent.terms.slice() : parent.factors.slice();
        const low = Math.min(source_index, target_index);
        const high = Math.max(source_index, target_index);
        items.splice(high, 1);
        items.splice(low, 1, replacement);

        let updated;
        if (identity_type === 'add' && replacement.type === 'constant' && replacement.value === 0) {
            items.splice(low, 1);
            updated = Expressions.add(items);
        } else if (identity_type === 'mul' && replacement.type === 'constant' && replacement.value === 1) {
            items.splice(low, 1);
            updated = Expressions.mul(items);
        } else {
            updated = identity_type === 'add'? Expressions.add(items) : Expressions.mul(items);
        }
        return EquationPaths.replace(equation, parent_path, updated);
    }

    function move_across(equation, source_path, target_side) {
        const parsed = EquationPaths.split(source_path);
        if (parsed.side === target_side) return equation;

        const source = EquationPaths.resolve(equation, source_path);
        if (source == null) return equation;

        const source_root_path = parsed.side;
        const source_root = EquationPaths.resolve(equation, source_root_path);
        const target_root = EquationPaths.resolve(equation, target_side);
        const parent_path = EquationPaths.parent(source_path);
        const segment = EquationPaths.segment(source_path);

        // a + b = c  ->  a = c - b
        if (source_root.type === 'add' && parent_path === source_root_path) {
            const index = Number(segment);
            const new_source = Expressions.remove_indexed(source_root, index);
            const new_target = Expressions.append_add(target_root, Expressions.negate(source));
            return EquationPaths.with_side(
                EquationPaths.with_side(equation, parsed.side, new_source),
                target_side,
                new_target
            );
        }

        // ab = c  ->  b = c/a, restricted to known nonzero constants.
        if (
            source_root.type === 'mul' &&
            parent_path === source_root_path &&
            source.type === 'constant' &&
            source.value !== 0
        ) {
            const index = Number(segment);
            const new_source = Expressions.remove_indexed(source_root, index);
            const new_target = Expressions.div(target_root, source);
            return EquationPaths.with_side(
                EquationPaths.with_side(equation, parsed.side, new_source),
                target_side,
                new_target
            );
        }

        // a/b = c  ->  a = bc, restricted to known nonzero denominators.
        if (
            source_root.type === 'div' &&
            parent_path === source_root_path &&
            segment === 'd' &&
            source.type === 'constant' &&
            source.value !== 0
        ) {
            const new_source = Expressions.ungroup(source_root.numerator);
            const new_target = Expressions.append_mul(target_root, source);
            return EquationPaths.with_side(
                EquationPaths.with_side(equation, parsed.side, new_source),
                target_side,
                new_target
            );
        }

        return equation;
    }

    function combine_siblings(equation, source_path, target_path) {
        const source_parent_path = EquationPaths.parent(source_path);
        const target_parent_path = EquationPaths.parent(target_path);
        if (source_parent_path == null || source_parent_path !== target_parent_path) return equation;

        const parent = EquationPaths.resolve(equation, source_parent_path);
        const source = EquationPaths.resolve(equation, source_path);
        const target = EquationPaths.resolve(equation, target_path);
        const source_segment = EquationPaths.segment(source_path);
        const target_segment = EquationPaths.segment(target_path);

        // 2x + 3x -> 5x, and 7 + (-3) -> 4.
        if (parent.type === 'add') {
            const combined = Expressions.combine_like(source, target);
            if (combined == null) return equation;
            return replace_two_children(
                equation,
                source_parent_path,
                Number(source_segment),
                Number(target_segment),
                combined,
                'add'
            );
        }

        // 5 * 6 -> 30.  Numeric multiplication is intentionally explicit.
        if (
            parent.type === 'mul' &&
            source.type === 'constant' &&
            target.type === 'constant'
        ) {
            return replace_two_children(
                equation,
                source_parent_path,
                Number(source_segment),
                Number(target_segment),
                Expressions.constant(source.value * target.value),
                'mul'
            );
        }

        // 28/4 -> 7.  Either numerator or denominator may be dragged.
        if (
            parent.type === 'div' &&
            source.type === 'constant' &&
            target.type === 'constant' &&
            ((source_segment === 'n' && target_segment === 'd') ||
             (source_segment === 'd' && target_segment === 'n')) &&
            parent.denominator.value !== 0
        ) {
            return EquationPaths.replace(
                equation,
                source_parent_path,
                Expressions.constant(parent.numerator.value / parent.denominator.value)
            );
        }

        // 2(x+3) -> 2x+6 by dropping the numeric factor on the group.
        if (parent.type === 'mul') {
            let scale = null;
            let grouped = null;
            let scale_index = null;
            let group_index = null;

            if (source.type === 'constant' && target.type === 'group') {
                scale = source;
                grouped = target;
                scale_index = Number(source_segment);
                group_index = Number(target_segment);
            } else if (target.type === 'constant' && source.type === 'group') {
                scale = target;
                grouped = source;
                scale_index = Number(target_segment);
                group_index = Number(source_segment);
            }

            if (scale && grouped && grouped.Expressions.type === 'add') {
                const distributed = Expressions.add(
                    grouped.Expressions.terms.map(term => Expressions.scale_term(scale, term))
                );
                const factors = parent.factors.slice();
                const high = Math.max(scale_index, group_index);
                const low = Math.min(scale_index, group_index);
                factors.splice(high, 1);
                factors.splice(low, 1);
                factors.splice(Math.min(group_index, factors.length), 0, distributed);
                return EquationPaths.replace(
                    equation,
                    source_parent_path,
                    Expressions.mul(factors)
                );
            }
        }

        return equation;
    }

    function move(equation, source_path, target_key) {
        if (source_path == null || target_key == null) return equation;

        if (target_key.startsWith('side:')) {
            return move_across(equation, source_path, target_key.slice(5));
        }

        if (!target_key.startsWith('path:')) return equation;
        const target_path = target_key.slice(5);
        if (
            source_path === target_path ||
            EquationPaths.is_ancestor(source_path, target_path) ||
            EquationPaths.is_ancestor(target_path, source_path)
        ) return equation;

        return combine_siblings(equation, source_path, target_path);
    }

    function moves_for_source(equation, source_path) {
        const parsed = EquationPaths.split(source_path);
        const candidates = [
            `side:${other_side(parsed.side)}`,
            ...EquationPaths.all(equation).map(path => `path:${path}`),
        ];
        return Object.freeze(candidates.filter(target_key =>
            move(equation, source_path, target_key) !== equation
        ));
    }

    function draggable_paths(equation) {
        return Object.freeze(EquationPaths.all(equation).filter(path =>
            moves_for_source(equation, path).length > 0
        ));
    }

    return Object.freeze({
        move,
        moves_for_source,
        draggable_paths,
    });
}
