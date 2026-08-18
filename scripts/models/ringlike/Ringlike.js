'use strict';

/*
Coordinates unary group behavior and binary relationships between operations.
Unary implementations are keyed by one operation (`add`, `mul`). Binary
implementations are keyed by parent.type + child.type (`mulpow`, `powmul`, ...).
*/
const Ringlike = (group_expressions_for_tag, ringlikes_expressions_for_tag) => {


    function combine(type, left, right) {
        const group_expressions = group_expressions_for_tag[type];
        if (group_expressions != null && group_expressions.combine != null) {
            const combined = group_expressions.combine(left, right);
            if (combined != null) return combined;
        }

        for (const [tag, ring_expressions] of Object.entries(ringlikes_expressions_for_tag)) {
            if (!tag.startsWith(type) || ring_expressions.combine == null) continue;
            const combined = ring_expressions.combine(left, right);
            if (combined != null) return combined;
        }
        return null;
    }

    function inverse(type, expression) {
        const group_expressions = group_expressions_for_tag[type];
        return group_expressions == null || group_expressions.inverse == null? undefined :
            group_expressions.inverse(expression);
    }

    function is_inverse(type, expression) {
        const group_expressions = group_expressions_for_tag[type];
        return group_expressions != null &&
            group_expressions.is_inverse != null &&
            group_expressions.is_inverse(expression);
    }

    function absolute(type, expression) {
        return is_inverse(type, expression)? inverse(type, expression) : expression;
    }

    function left_distribute(type, parent, left, right) {
        const tag = parent.type + type;
        const ring_expressions = ringlikes_expressions_for_tag[tag];
        if (ring_expressions != null && ring_expressions.left_distribute != null) {
            const distributed = ring_expressions.left_distribute(parent, left, right);
            if (distributed != null) return distributed;
        }

        const group_expressions = group_expressions_for_tag[type];
        return group_expressions == null || group_expressions.left_distribute == null? null :
            group_expressions.left_distribute(parent, left, right);
    }

    function right_distribute(type, parent, left, right) {
        const tag = parent.type + type;
        const ring_expressions = ringlikes_expressions_for_tag[tag];
        if (ring_expressions != null && ring_expressions.right_distribute != null) {
            const distributed = ring_expressions.right_distribute(parent, left, right);
            if (distributed != null) return distributed;
        }

        const group_expressions = group_expressions_for_tag[type];
        return group_expressions == null || group_expressions.right_distribute == null? null :
            group_expressions.right_distribute(parent, left, right);
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
