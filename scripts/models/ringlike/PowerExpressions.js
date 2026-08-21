'use strict';
// HUMAN VETTED

/*
The power action: (R>0, multiplication) as a one-dimensional vector space over
R, with scalar action (exponent, base) -> base^exponent.
*/
const PowerExpressions = (grouplikes, powers, expression_shape) => {

    function act(scalar, vector) {
        if (vector.type === 'constant' && vector.contents === 1) return vector;
        if (scalar.type === 'constant' && scalar.contents === 0) return grouplikes.constant(1);
        if (scalar.type === 'constant' && scalar.contents === 1) return vector;
        return grouplikes.pow(vector, scalar);
    }

    const scalar_action = ScalarAction({
        grouplikes,
        scalar_add: 'add',
        scalar_multiply: 'mul',
        vector_add: 'mul',
        act,
    });

    const action_expressions = ScalarActionExpressions({
        scalar_action,
        expression_shape,
        action_type: 'pow',
        decompose: expression => {
            if (expression.type === 'pow') {
                const base = expression.contents[0];
                return Object.freeze({
                    scalar: expression.contents[1],
                    vector: base,
                    key: expression_shape.encode(base),
                });
            }
            return Object.freeze({
                scalar: grouplikes.constant(1),
                vector: expression,
                key: expression_shape.encode(expression),
            });
        },
        // Exponentiation is directional: left is vector/base, right is scalar/exponent.
        pair_interpretations: (left, right) => Object.freeze([
            Object.freeze({ scalar:right, vector:left }),
        ]),
    });

    function inverse(expression) {
        if (expression.type === 'constant' && expression.contents === 0) return null;
        if (expression.type === 'constant' && expression.contents === 1) return expression;
        return powers.to_expression(
            powers.invert(
                powers.from_expression(expression)));
    }

    function is_inverse(expression) {
        const power = powers.from_expression(expression);
        return power.power === -1;
    }

    function combine_candidates(parent_type, left, right) {
        return action_expressions.combine_candidates(parent_type, left, right);
    }

    function combine(left, right) {
        const candidates = combine_candidates('mul', left, right);
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
