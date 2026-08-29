'use strict';
// HUMAN VETTED

/*
Operates on grouplikes that can be expressed as powers.
*/
const PowerExpressions = (grouplikes, powers) => {

    function is_inverse(expression) {
        typecheck(expression, 'Expression');
        const power = powers.from_expression(expression);
        return power.power === -1;
    }

    function absolute(expression) {
        typecheck(expression, 'Expression');
        if (!is_inverse(expression)) return expression;
        return powers.to_expression(
            powers.invert(
                powers.from_expression(expression)));
    }

    function combine(left, right) {
        typecheck(left, 'Expression');
        typecheck(right, 'Expression');
        const a = powers.from_expression(left);
        const b = powers.from_expression(right);
        const combined = powers.combine(a, b);
        return combined == null? null : powers.to_expression(combined);
    }

    function left_distribute(parent, left, right) {
        typecheck(parent, 'Expression');
        typecheck(left, 'Expression');
        typecheck(right, 'Expression');
        return null;
    }

    function right_distribute(parent, left, right) {
        typecheck(parent, 'Expression');
        typecheck(left, 'Expression');
        typecheck(right, 'Expression');
        if (parent.type !== 'pow') return null;
        if (left.type !== 'mul') return null;
        return grouplikes.mul(left.contents.map(term => grouplikes.pow(term, right)));
    }

    return Object.freeze({
        is_inverse,
        absolute,
        combine,
        left_distribute,
        right_distribute,
    });
};
