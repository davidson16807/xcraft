'use strict';

/*
Operates on expressions that can be expressed as powers.
*/
const PowerExpressions = (expressions, powers) => {

    function combine(left, right) {
        const left_value = expressions.evaluate(left, {});
        const right_value = expressions.evaluate(right, {});

        // Constant arithmetic, including products involving reciprocal
        // constants such as 28 * 4^-1 -> 7.
        if (Number.isFinite(left_value) && Number.isFinite(right_value)) {
            return expressions.constant(left_value * right_value);
        }

        const a = powers.from_expression(left);
        const b = powers.from_expression(right);
        const combined = powers.combine(a, b);
        return combined == null? null : powers.to_expression(combined);
    }

    return Object.freeze({combine});
};
