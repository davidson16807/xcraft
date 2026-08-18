'use strict';

/*
Binary mul/pow relationship.  Operands are interpreted as powers, so lower
structures are promoted by Powers.from_expression(): a -> a^1.
*/
const MultiplyPowerExpressions = powers => {

    function combine(left, right) {
        const a = powers.from_expression(left);
        const b = powers.from_expression(right);
        const combined = powers.combine(a, b);
        return combined == null? null : powers.to_expression(combined);
    }

    return Object.freeze({ combine });
};
