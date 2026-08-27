'use strict';
// HUMAN VETTED

/*
Operates on grouplikes that can be expressed as powers.
*/
const PowerExpressions = (grouplikes, powers) => {

    function inverse(expression) {
        if (expression.type === 'constant' && expression.contents === 1) return expression;

        const inverse = powers.invert(powers.from_expression(expression));
        const result = powers.to_expression(inverse);
        if (result == null || inverse.power >= 0) return result;

        return result.caveat(new Relation('neq', inverse.base, grouplikes.constant(0)));
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
        return grouplikes.mul(left.contents.map(term => grouplikes.pow(term, right)));
    }

    return Object.freeze({
        inverse,
        is_inverse,
        combine,
        left_distribute,
        right_distribute,
    });
};
