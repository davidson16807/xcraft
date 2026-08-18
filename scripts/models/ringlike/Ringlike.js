'use strict';

/*
Operates on grouplikes through the group associated with a ringlikes operation.
*/
const Ringlike = ringlikes_expressions_for_tag => {

    function combine(type, left, right) {
        const group_expression_for_type = ringlikes_expressions_for_tag[type];
        return group_expression_for_type == null? null :
            group_expression_for_type.combine(left, right);
    }

    function inverse(type, expression) {
        const group_expression_for_type = ringlikes_expressions_for_tag[type];
        return group_expression_for_type == null? null :
            group_expression_for_type.inverse(expression);
    }

    function is_inverse(type, expression) {
        const group_expression_for_type = ringlikes_expressions_for_tag[type];
        return group_expression_for_type != null &&
            group_expression_for_type.is_inverse(expression);
    }

    function absolute(type, expression) {
        return is_inverse(type, expression)? inverse(type, expression) : expression;
    }

    function left_distribute(type, parent, left, right) {
        const preferred = ringlikes_expressions_for_tag[type];
        if (preferred != null) return preferred.left_distribute(parent, left, right);
        for (const ringlike of new Set(Object.values(ringlikes_expressions_for_tag))) {
            const distributed = ringlike.left_distribute(parent, left, right);
            if (distributed != null) return distributed;
        }
        return null;
    }

    function right_distribute(type, parent, left, right) {
        const preferred = ringlikes_expressions_for_tag[type];
        if (preferred != null) return preferred.right_distribute(parent, left, right);
        for (const ringlike of new Set(Object.values(ringlikes_expressions_for_tag))) {
            const distributed = ringlike.right_distribute(parent, left, right);
            if (distributed != null) return distributed;
        }
        return null;
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
