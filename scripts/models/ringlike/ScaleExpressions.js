'use strict';
// HUMAN VETTED

/*
The ordinary scaling action: (R,+) as a one-dimensional vector space over R.
`ScaleExpressions` keeps additive inverse behavior and instantiates the same
ScalarActionExpressions machinery used by powers.
*/
const ScaleExpressions = (grouplikes, scales, expression_shape) => {

    function act(scalar, vector) {
        if (vector.type === 'constant' && vector.contents === 0) return vector;
        if (scalar.type === 'constant' && scalar.contents === 0) return grouplikes.constant(0);
        if (scalar.type === 'constant' && scalar.contents === 1) return vector;
        return grouplikes.mul([scalar, vector]);
    }

    const scalar_action = ScalarAction({
        grouplikes,
        scalar_add: 'add',
        scalar_multiply: 'mul',
        vector_add: 'add',
        act,
    });

    const action_expressions = ScalarActionExpressions({
        scalar_action,
        expression_shape,
        action_type: 'mul',
        decompose: expression => {
            const scale = scales.from_expression(expression);
            return Object.freeze({
                scalar: grouplikes.constant(scale.coefficient),
                vector: scale.basis,
                key: scale.key,
            });
        },
        // Ordinary multiplication is commutative, so either factor may be
        // interpreted as the scalar for the purpose of distribution.
        pair_interpretations: (left, right) => Object.freeze([
            Object.freeze({ scalar:left, vector:right }),
            Object.freeze({ scalar:right, vector:left }),
        ]),
    });

    function inverse(expression) {
        return scales.to_expression(
            scales.invert(
                scales.from_expression(expression)));
    }

    function is_inverse(expression) {
        return scales.from_expression(expression).coefficient < 0;
    }

    function combine_candidates(parent_type, left, right) {
        return action_expressions.combine_candidates(parent_type, left, right);
    }

    function combine(left, right) {
        const candidates = combine_candidates('add', left, right);
        return candidates.length === 1? candidates[0] : null;
    }

    function left_distribute_candidates(parent, left, right) {
        return action_expressions.distribute_candidates(parent, left, right, true);
    }

    function right_distribute_candidates(parent, left, right) {
        return action_expressions.distribute_candidates(parent, left, right, false);
    }

    function left_distribute(parent, left, right) {
        const candidates = left_distribute_candidates(parent, left, right);
        return candidates.length === 1? candidates[0] : null;
    }

    function right_distribute(parent, left, right) {
        const candidates = right_distribute_candidates(parent, left, right);
        return candidates.length === 1? candidates[0] : null;
    }

    return Object.freeze({
        scalar_action,
        inverse,
        is_inverse,
        combine,
        combine_candidates,
        left_distribute,
        right_distribute,
        left_distribute_candidates,
        right_distribute_candidates,
    });
};
