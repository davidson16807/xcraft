'use strict';
// HUMAN VETTED

/*
Operates on expressions through the group associated with a ring operation.
*/
const RingExpressions = ring_expressions_for_tag => {

    function combine(type, left, right) {
        const group_expression_for_type = ring_expressions_for_tag[type];
        return group_expression_for_type == null? null :
            group_expression_for_type.combine(left, right);
    }

    function inverse(type, expression) {
        const group_expression_for_type = ring_expressions_for_tag[type];
        return group_expression_for_type == null? null :
            group_expression_for_type.inverse(expression);
    }

    function is_inverse(type, expression) {
        const group_expression_for_type = ring_expressions_for_tag[type];
        return group_expression_for_type != null &&
            group_expression_for_type.is_inverse(expression);
    }

    function absolute(type, expression) {
        return is_inverse(type, expression)? inverse(type, expression) : expression;
    }

    function left_distribute(type, parent, left, right) {
        const group_expression_for_type = ring_expressions_for_tag[type];
        return group_expression_for_type == null? null :
            group_expression_for_type.left_distribute(parent, left, right);
    }

    function right_distribute(type, parent, left, right) {
        const group_expression_for_type = ring_expressions_for_tag[type];
        return group_expression_for_type == null? null :
            group_expression_for_type.right_distribute(parent, left, right);
    }

    return Object.freeze({
        combine,
        inverse,
        is_inverse,
        absolute,
        left_distribute,
        right_distribute,
    });
};
