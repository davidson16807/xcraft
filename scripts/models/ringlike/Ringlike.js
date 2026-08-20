'use strict';

/*
Operates on grouplikes through the group associated with a ringlikes operation.
*/
const Ringlike = ringlikes_expressions_for_tag => {

    const laws = Object.freeze(
        Object.values(ringlikes_expressions_for_tag)
            .flatMap(expressions => expressions.laws || [])
    );

    function combine(type, left, right) {
        const group_expression_for_type = ringlikes_expressions_for_tag[type];
        return group_expression_for_type == null || group_expression_for_type.combine == null? null :
            group_expression_for_type.combine(left, right);
    }

    function inverse(type, expression) {
        const group_expression_for_type = ringlikes_expressions_for_tag[type];
        return group_expression_for_type == null || group_expression_for_type.inverse == null? null :
            group_expression_for_type.inverse(expression);
    }

    function is_inverse(type, expression) {
        const group_expression_for_type = ringlikes_expressions_for_tag[type];
        return group_expression_for_type != null &&
            group_expression_for_type.is_inverse != null &&
            group_expression_for_type.is_inverse(expression);
    }

    function absolute(type, expression) {
        return is_inverse(type, expression)? inverse(type, expression) : expression;
    }

    function left_distribute(type, parent, left, right) {
        const group_expression_for_type = ringlikes_expressions_for_tag[type];
        return group_expression_for_type == null || group_expression_for_type.left_distribute == null? null :
            group_expression_for_type.left_distribute(parent, left, right);
    }

    function right_distribute(type, parent, left, right) {
        const group_expression_for_type = ringlikes_expressions_for_tag[type];
        return group_expression_for_type == null || group_expression_for_type.right_distribute == null? null :
            group_expression_for_type.right_distribute(parent, left, right);
    }

    return Object.freeze({
        combine,
        inverse,
        is_inverse,
        absolute,
        left_distribute,
        right_distribute,
        laws,
    });
};
