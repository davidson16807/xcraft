'use strict';

/*
Binary relationship for multiplication of power-like expressions (`mulpow`).
Lower-ranked expressions are promoted by Powers.from_expression as exponent 1.
*/
const MultiplyPowerExpressions = powers => {

    function combine(left, right) {
        const a = powers.from_expression(left);
        const b = powers.from_expression(right);
        const combined = powers.combine(a, b);
        return combined == null? null : powers.to_expression(combined);
    }

    return Object.freeze({
        combine,
    });
};
