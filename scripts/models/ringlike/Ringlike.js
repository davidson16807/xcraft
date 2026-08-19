'use strict';

/*
Coordinates unary ring-like behavior by operation and binary relationships by
an operation-pair key. Combination keys use the highest-precedence source/target expression;
distribution keys use the child being distributed across.
*/
const Ringlike = dependencies => {
    const unary_expressions_for_tag = dependencies.unary;
    const binary_expressions_for_tag = dependencies.binary;
    const precedence_for_tag = dependencies.precedence_for_tag;


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


    function binary(parent, child) {
        return binary_expressions_for_tag[parent.type + child.type];
    }

    function combine(parent, source, target) {
        const child = precedence_for_tag(source.type) >= precedence_for_tag(target.type)? source : target;
        const expressions = binary(parent, child);
        return expressions == null || expressions.combine == null? null :
            expressions.combine(parent, source, target);
    }

    function left_distribute(parent, left, right) {
        const expressions = binary(parent, right);
        return expressions == null || expressions.left_distribute == null? null :
            expressions.left_distribute(parent, left, right);
    }

    function right_distribute(parent, left, right) {
        const expressions = binary(parent, left);
        return expressions == null || expressions.right_distribute == null? null :
            expressions.right_distribute(parent, left, right);
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
