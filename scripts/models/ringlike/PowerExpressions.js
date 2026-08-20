'use strict';

/*
Operates on grouplikes that can be expressed as powers.
*/
const PowerExpressions = (
    grouplikes, powers, same_base, same_exponent, same_base_exponent,
    same_result_exponent, composition, log_composition
) => {

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

    function combine(left, right) {
        return same_base.combine(left, right);
    }

    function left_distribute(parent, left, right) {
        return null;
    }

    function right_distribute(parent, left, right) {
        return same_exponent.distribute(parent, right, left);
    }

    return Object.freeze({
        inverse,
        is_inverse,
        combine,
        left_distribute,
        right_distribute,
        laws: Object.freeze([
            same_base, same_exponent, same_base_exponent, same_result_exponent,
            composition, log_composition
        ]),
    });
};
