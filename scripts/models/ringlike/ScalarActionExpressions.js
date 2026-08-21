'use strict';

/*
Matches Expressions against the executable laws of a ScalarAction.

This object deliberately returns candidate rewrites.  Ambiguity is resolved
above this layer after candidates have been installed back into the complete
Expression/Equation tree, so a candidate that reconstructs the original tree
can be discarded as a no-op before uniqueness is decided.
*/
const ScalarActionExpressions = ({
    scalar_action,
    expression_shape,
    action_type,
    decompose,
    pair_interpretations,
}) => {

    const shape = expression_shape;

    function unique(candidates) {
        const by_shape = new Map();
        candidates
            .filter(candidate => candidate != null)
            .forEach(candidate => {
                const key = shape.encode(candidate);
                if (!by_shape.has(key)) by_shape.set(key, candidate);
            });
        return Object.freeze([...by_shape.values()]);
    }

    function same(left, right) {
        return left != null && right != null &&
            shape.encode(left) === shape.encode(right);
    }

    function combine_candidates(parent_type, left, right) {
        if (parent_type !== scalar_action.vector_add) return Object.freeze([]);

        const a = decompose(left);
        const b = decompose(right);
        if (a == null || b == null) return Object.freeze([]);

        const candidates = [];

        // (a + b)v <-> av + bv
        if (
            a.vector != null && b.vector != null &&
            a.key === b.key
        ) {
            candidates.push(
                scalar_action.scalar_distributivity(
                    [a.scalar, b.scalar],
                    a.vector
                ).contracted
            );
        }

        // a(u + v) <-> au + av
        if (
            a.vector != null && b.vector != null &&
            same(a.scalar, b.scalar)
        ) {
            candidates.push(
                scalar_action.vector_distributivity(
                    a.scalar,
                    [a.vector, b.vector]
                ).contracted
            );
        }

        return unique(candidates);
    }

    function distribute_candidates(parent, left, right, source_is_left) {
        if (parent == null || parent.type !== action_type) return Object.freeze([]);

        const source = source_is_left? left : right;
        const target = source_is_left? right : left;
        const candidates = [];

        for (const interpretation of pair_interpretations(left, right)) {
            if (
                interpretation.scalar === target &&
                interpretation.vector === source &&
                target.type === scalar_action.scalar_add
            ) {
                candidates.push(
                    scalar_action.scalar_distributivity(
                        target.contents,
                        source
                    ).expanded
                );
            }

            if (
                interpretation.vector === target &&
                interpretation.scalar === source &&
                target.type === scalar_action.vector_add
            ) {
                candidates.push(
                    scalar_action.vector_distributivity(
                        source,
                        target.contents
                    ).expanded
                );
            }
        }

        return unique(candidates);
    }

    return Object.freeze({
        combine_candidates,
        distribute_candidates,
    });
};
