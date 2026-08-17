'use strict';
// HUMAN VETTED

/*
Operates on expressions that can be expressed as powers.
*/
const PowerExpressions = (expressions, powers) => {

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
        const a = powers.from_expression(left);
        const b = powers.from_expression(right);
        const combined = powers.combine(a, b);
        return combined == null? null : powers.to_expression(combined);
    }

    function left_distribute(parent, left, right) {
        return null;
    }

    function right_distribute(parent, left, right) {
        if (parent.type !== 'pow') return null;
        if (left.type !== 'mul') return null;
        return expressions.mul(left.contents.map(term => expressions.pow(term, right)));
    }

    return Object.freeze({
        inverse,
        is_inverse,
        combine,
        left_distribute,
        right_distribute,
    });
};
