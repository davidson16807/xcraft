'use strict';

/*
Operates on expressions through the group associated with a ring operation.
*/
const RingExpressions = group_expressions_for_tag => {

    function combine(type, left, right) {
        const group_expressions = group_expressions_for_tag[type];
        return group_expressions == null? null :
            group_expressions.combine(left, right);
    }

    function inverse(type, expression) {
        const group_expressions = group_expressions_for_tag[type];
        return group_expressions == null? null :
            group_expressions.inverse(expression);
    }

    function is_inverse(type, expression) {
        const group_expressions = group_expressions_for_tag[type];
        return group_expressions != null &&
            group_expressions.is_inverse(expression);
    }

    return Object.freeze({
        combine,
        inverse,
        is_inverse,
    });
};
