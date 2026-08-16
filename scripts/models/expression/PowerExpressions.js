'use strict';

/*
Operates on expressions that can be expressed as powers.
*/
const PowerExpressions = (expressions, powers) => {

    function combine(left, right) {
        const a = powers.from_expression(left);
        const b = powers.from_expression(right);
        const combined = powers.combine(a, b);
        return combined == null? null : powers.to_expression(combined);
    }

    return Object.freeze({combine});
};
