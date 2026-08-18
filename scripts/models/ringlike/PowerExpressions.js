'use strict';

/*
Operates on grouplikes that can be expressed as powers.
*/
const PowerExpressions = (grouplikes, powers) => {

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
        if (parent.type !== 'mul') return null;
        if (right.type !== 'pow') return null;
        const base = right.contents[0];
        const exponent = right.contents[1];
        if (base.type !== 'add') return null;

        const inverted_exponent = inverse(exponent);
        if (inverted_exponent == null) return null;
        const inverse_exponent = grouplikes.simplify(inverted_exponent);
        const factor = grouplikes.pow(left, inverse_exponent);
        return grouplikes.pow(
            grouplikes.add(base.contents.map(term => grouplikes.mul([factor, term]))),
            exponent
        );
    }

    function right_distribute(parent, left, right) {
        if (parent.type === 'pow') {
            if (left.type !== 'mul') return null;
            return grouplikes.mul(left.contents.map(term => grouplikes.pow(term, right)));
        }

        if (parent.type !== 'mul') return null;
        if (left.type !== 'pow') return null;
        const base = left.contents[0];
        const exponent = left.contents[1];
        if (base.type !== 'add') return null;

        const inverted_exponent = inverse(exponent);
        if (inverted_exponent == null) return null;
        const inverse_exponent = grouplikes.simplify(inverted_exponent);
        const factor = grouplikes.pow(right, inverse_exponent);
        return grouplikes.pow(
            grouplikes.add(base.contents.map(term => grouplikes.mul([term, factor]))),
            exponent
        );
    }

    return Object.freeze({
        inverse,
        is_inverse,
        combine,
        left_distribute,
        right_distribute,
    });
};
