'use strict';
// HUMAN VETTED

/*
Coordinates unary ring-like behavior by operation and binary relationships
polymorphically. Unsupported binary rules return null; a result is accepted
only when exactly one registered relationship applies.
*/
const Ringlike = dependencies => {
    const unary_expressions_for_tag = dependencies.unary;
    const binary_expressions = dependencies.binary;

    function combine(parent, left, right) {
        const combined = binary_expressions
            .map(expressions => expressions.combine == null? null :
                expressions.combine(parent, left, right))
            .filter(expression => expression != null);
        return combined.length === 1? combined[0] : null;
    }

    function inverse(type, expression) {
        const expressions = unary_expressions_for_tag[type];
        return expressions == null? null : expressions.inverse(expression);
    }

    function is_inverse(type, expression) {
        const expressions = unary_expressions_for_tag[type];
        return expressions != null && expressions.is_inverse(expression);
    }

    function absolute(type, expression) {
        return is_inverse(type, expression)? inverse(type, expression) : expression;
    }

    function left_distribute(parent, left, right) {
        const distributed = binary_expressions
            .map(expressions => expressions.left_distribute == null? null :
                expressions.left_distribute(parent, left, right))
            .filter(expression => expression != null);
        return distributed.length === 1? distributed[0] : null;
    }

    function right_distribute(parent, left, right) {
        const distributed = binary_expressions
            .map(expressions => expressions.right_distribute == null? null :
                expressions.right_distribute(parent, left, right))
            .filter(expression => expression != null);
        return distributed.length === 1? distributed[0] : null;
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
