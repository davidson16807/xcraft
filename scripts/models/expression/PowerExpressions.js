'use strict';

/*
Operates on expressions that can be expressed as powers.
*/
const PowerExpressions = (expressions, powers) => {

    function combine(left, right) {
        // Constant arithmetic, including products involving reciprocal
        // constants such as 28 * 4^-1 -> 7.  Non-integral quotients stay in
        // exact reciprocal form rather than becoming decimal approximations.
        const constant = expressions.constant_result(
            expressions.mul([left, right])
        );
        if (constant != null) return constant;

        const a = powers.from_expression(left);
        const b = powers.from_expression(right);
        const combined = powers.combine(a, b);
        return combined == null? null : powers.to_expression(combined);
    }

    return Object.freeze({combine});
};
