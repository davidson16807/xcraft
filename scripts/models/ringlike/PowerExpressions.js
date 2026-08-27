'use strict';
// HUMAN VETTED

/*
Operates on grouplikes that can be expressed as powers.
*/
const PowerExpressions = (grouplikes, powers) => {

    function inverse(expression) {
        typecheck(expression, 'Expression');
        if (expression.type === 'constant' && expression.contents === 1) return expression;

        const inverse = powers.invert(powers.from_expression(expression));
        const result = powers.to_expression(inverse);
        if (result == null || inverse.power >= 0) return result;

        return result.caveat(new Relation('neq', inverse.base, grouplikes.constant(0)));
    }

    function is_inverse(expression) {
        typecheck(expression, 'Expression');
        const power = powers.from_expression(expression);
        return power.power === -1;
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
        inverse,
        is_inverse,
        combine,
        left_distribute,
        right_distribute,
    });
};
