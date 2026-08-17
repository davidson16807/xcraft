'use strict';
// HUMAN VETTED

/*
Operates on grouplikes that can be expressed as scales.
*/
const ScaleExpressions = (grouplikes, scales) => {

    function inverse(expression) {
        return scales.to_expression(
            scales.invert(
                scales.from_expression(expression)));
    }

    function is_inverse(expression) {
        return scales.from_expression(expression).coefficient < 0;
    }

    function combine(left, right) {
        const a = scales.from_expression(left);
        const b = scales.from_expression(right);
        const combined = scales.combine(a, b);
        return combined == null? null : scales.to_expression(combined);
    }

    function left_distribute(parent, left, right) {
        if (parent.type !== 'mul') return null;
        if (right.type !== 'add') return null;
        return grouplikes.add(right.contents.map(term => grouplikes.mul([left, term])));
    }

    function right_distribute(parent, left, right) {
        if (parent.type !== 'mul') return null;
        if (left.type !== 'add') return null;
        return grouplikes.add(left.contents.map(term => grouplikes.mul([term, right])));
    }

    return Object.freeze({
        inverse,
        is_inverse,
        combine,
        left_distribute,
        right_distribute,
    });
};
