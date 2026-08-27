'use strict';

/*
`Ringlikes` manages operations for a set of ringlike structures.

Operations here are unambiguously defined by the structure. 
Unsupported operations are represented by returning the original expression 
(if the operation is unary) or null (if the operation is binary).
Return types are deeply immutable expressions. 
All functions are pure. 
*/
const Ringlikes = ringlike_for_tag => {

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
    });

};
