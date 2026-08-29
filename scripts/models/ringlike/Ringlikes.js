'use strict';
// HUMAN VETTED

/*
`Ringlikes` manages operations for a set of ringlike structures.

Operations here are unambiguously defined by the structure. 
Unsupported operations are represented by returning the original expression 
(if the operation is unary) or null (if the operation is binary).
Return types are deeply immutable expressions. 
All functions are pure. 
*/
const Ringlikes = ringlike_for_tag => {

    function is_inverse(type, expression) {
        typecheck(type, 'String');
        typecheck(expression, 'Expression');
        const ringlike = ringlike_for_tag[type];
        return ringlike && ringlike.is_inverse(expression);
    }

    function absolute(type, expression) {
        typecheck(type, 'String');
        typecheck(expression, 'Expression');
        const ringlike = ringlike_for_tag[type];
        return ringlike? ringlike.absolute(expression) : expression;
    }

    function combine(type, left, right) {
        typecheck(type, 'String');
        typecheck(left, 'Expression');
        typecheck(right, 'Expression');
        const ringlike = ringlike_for_tag[type];
        return ringlike && ringlike.combine(left, right);
    }

    function left_distribute(type, parent, left, right) {
        typecheck(type, 'String');
        typecheck(parent, 'Expression');
        typecheck(left, 'Expression');
        typecheck(right, 'Expression');
        const ringlike = ringlike_for_tag[type];
        return ringlike && ringlike.left_distribute(parent, left, right);
    }

    function right_distribute(type, parent, left, right) {
        typecheck(type, 'String');
        typecheck(parent, 'Expression');
        typecheck(left, 'Expression');
        typecheck(right, 'Expression');
        const ringlike = ringlike_for_tag[type];
        return ringlike && ringlike.right_distribute(parent, left, right);
    }

    return Object.freeze({
        is_inverse,
        absolute,
        combine,
        left_distribute,
        right_distribute,
    });

};
