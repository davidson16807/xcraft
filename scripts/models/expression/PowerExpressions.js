'use strict';

/*
Operates on expressions that can be expressed as powers.
*/
const PowerExpressions = (expressions, powers) => {

    function inverse(expression) {
        if (expression.type === 'constant' && expression.contents === 0) return null;
        if (expression.type === 'constant' && expression.contents === 1) return expression;
        return powers.to_expression(
            powers.reciprocal(
                powers.from_expression(expression)));
    }

    function is_reciprocal(expression) {
        const power = powers.from_expression(expression);
        return power.power === -1;
    }

    function is_inverse(expression) {
        return is_reciprocal(expression);
    }

    function combine(left, right) {
        const a = powers.from_expression(left);
        const b = powers.from_expression(right);
        const combined = powers.combine(a, b);
        return combined == null? null : powers.to_expression(combined);
    }

    return Object.freeze({
        inverse,
        is_inverse,
        combine,
    });
};
