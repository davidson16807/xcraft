'use strict';

/*
Operates on grouplikes that can be expressed as powers.
*/
const PowerExpressions = (grouplikes, powers, orderlikes) => {

    function _nonzero_caveat(expression) {
        const caveat = new Relation('neq', expression, grouplikes.constant(0));
        return orderlikes.evaluate(caveat, {}) === true? null : caveat;
    }

    function _with_nonzero_caveat(result, expression) {
        const caveat = _nonzero_caveat(expression);
        return caveat == null? result : ExpressionCaveats.add(result, [caveat]);
    }

    function inverse(expression) {
        const value = grouplikes.evaluate(expression, {});
        if (Number.isFinite(value) && value === 0) return null;
        if (expression.type === 'constant' && expression.contents === 1) return expression;
        const inverse = powers.to_expression(
            powers.invert(
                powers.from_expression(expression)));
        return _with_nonzero_caveat(ExpressionCaveats.inherit(inverse, expression), expression);
    }

    function is_inverse(expression) {
        const power = powers.from_expression(expression);
        return power.power === -1;
    }

    function combine(left, right) {
        const a = powers.from_expression(left);
        const b = powers.from_expression(right);
        const combined = powers.combine(a, b);
        if (combined == null) return null;

        let result = ExpressionCaveats.inherit(powers.to_expression(combined), left, right);
        if (a.power < 0 || b.power < 0) {
            result = _with_nonzero_caveat(result, a.base);
        }
        return result;
    }

    function left_distribute(parent, left, right) {
        return null;
    }

    function right_distribute(parent, left, right) {
        if (parent.type !== 'pow') return null;
        if (left.type !== 'mul') return null;
        return ExpressionCaveats.inherit(
            grouplikes.mul(left.contents.map(term => grouplikes.pow(term, right))),
            parent, left, right
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
