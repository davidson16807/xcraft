'use strict';
// HUMAN VETTED

/*
Operates on expressions that can be expressed as scales.
*/
const ScaleExpressions = (expressions, scales) => {

    function inverse(expression) {
        return scales.to_expression(
            scales.negate(
                scales.from_expression(expression)));
    }

    function is_inverse(expression) {
        return sign(expression) < 0;
    }

    function scale(scale, expression) {
        if (scale.type !== 'constant') return expressions.mul([scale, expression]);
        return scales.to_expression(
            scales.scale(
                scale,
                scales.from_expression(expression)));
    }

    function sign(expression) {
        return scales.sign(scales.from_expression(expression));
    }

    function absolute(expression) {
        return scales.to_expression(
            scales.absolute(
                scales.from_expression(expression)));
    }

    function combine(left, right) {
        const a = scales.from_expression(left);
        const b = scales.from_expression(right);
        const combined = scales.combine(a, b);
        return combined == null? null : scales.to_expression(combined);
    }

    return Object.freeze({
        inverse,
        is_inverse,
        scale,
        sign,
        absolute,
        combine,
    });
};
