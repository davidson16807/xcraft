'use strict';
// HUMAN VETTED

/*
Operates on grouplikes through the group associated with a ringlikes operation.
*/
const Ringlikes = ringlike_for_tag => {

    const laws = Object.freeze(
        Object.values(ringlike_for_tag)
            .flatMap(expressions => expressions.laws || [])
    );

    function inverse(type, expression) {
        const ringlike = ringlike_for_tag[type];
        return ringlike && ringlike.inverse(expression);
    }

    function is_inverse(type, expression) {
        const ringlike = ringlike_for_tag[type];
        return ringlike && ringlike.is_inverse(expression);
    }

    function absolute(type, expression) {
        return is_inverse(type, expression)? inverse(type, expression) : expression;
    }

    function combine(type, left, right) {
        const ringlike = ringlike_for_tag[type];
        return ringlike && ringlike.combine(left, right);
    }

    function left_distribute(type, parent, left, right) {
        const ringlike = ringlike_for_tag[type];
        return ringlike && ringlike.left_distribute(parent, left, right);
    }

    function right_distribute(type, parent, left, right) {
        const ringlike = ringlike_for_tag[type];
        return ringlike && ringlike.right_distribute(parent, left, right);
    }

    return Object.freeze({
        inverse,
        is_inverse,
        absolute,
        combine,
        left_distribute,
        right_distribute,
        laws,
    });
};
