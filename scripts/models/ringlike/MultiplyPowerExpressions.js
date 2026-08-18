'use strict';

/*
Binary relationship between multiplication and power Expressions.
Combines multiplicative factors that can be expressed as powers with a common
base: a^b * a^c -> a^(b+c).
*/
const MultiplyPowerExpressions = (powers) => {

    function combine(parent, left, right) {
        if (parent.type !== 'mul') return null;
        const a = powers.from_expression(left);
        const b = powers.from_expression(right);
        const combined = powers.combine(a, b);
        return combined == null? null : powers.to_expression(combined);
    }

    return Object.freeze({
        combine,
    });
};
