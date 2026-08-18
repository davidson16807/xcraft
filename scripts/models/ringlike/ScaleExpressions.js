'use strict';

/*
Unary additive inverse behavior for Expressions that can be expressed as
scales.  Binary add/multiply relationships live in their key-specific
*Expressions categories.
*/
const ScaleExpressions = (scales) => {

    function inverse(expression) {
        return scales.to_expression(
            scales.invert(
                scales.from_expression(expression)));
    }

    function is_inverse(expression) {
        return scales.from_expression(expression).coefficient < 0;
    }

    return Object.freeze({
        inverse,
        is_inverse,
    });
};
