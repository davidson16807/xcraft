'use strict';

/*
Unary inverse behavior for Expressions represented as powers.
*/
const PowerExpressions = (powers) => {

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

    return Object.freeze({
        inverse,
        is_inverse,
    });
};
