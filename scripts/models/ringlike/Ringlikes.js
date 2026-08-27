'use strict';

/*
`Ringlikes` manages operations for a set of ringlike structures.

Operations here are unambiguously defined by the structure. 
Unsupported operations are represented by returning the original expression 
(if the operation is unary) or null (if the operation is binary).
Return types are deeply immutable expressions. 
All functions are pure. 
*/
const Ringlikes = (ringlike_for_tag, expression_caveats) => {

    function inverse(type, expression) {
        const ringlike = ringlike_for_tag[type];
        const inverse = ringlike && ringlike.inverse(expression);
        return inverse == null || inverse === expression? inverse : expression_caveats.inherit(inverse, expression);
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
        const combined = ringlike && ringlike.combine(left, right);
        return combined == null? combined : expression_caveats.inherit(combined, left, right);
    }

    function left_distribute(type, parent, left, right) {
        const ringlike = ringlike_for_tag[type];
        const distributed = ringlike && ringlike.left_distribute(parent, left, right);
        return distributed == null? distributed : expression_caveats.inherit(distributed, parent, left, right);
    }

    function right_distribute(type, parent, left, right) {
        const ringlike = ringlike_for_tag[type];
        const distributed = ringlike && ringlike.right_distribute(parent, left, right);
        return distributed == null? distributed : expression_caveats.inherit(distributed, parent, left, right);
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
