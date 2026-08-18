'use strict';

/*
Coordinates unary ring-like behavior by operation and binary relationships by
parent/child precedence.  Dispatch belongs here; individual relationship
implementations may assume they were called in the algebraic context named by
their registry key.
*/
const Ringlike = dependencies => {
    const unary_expressions_for_tag = dependencies.unary;
    const binary_expressions_for_tag = dependencies.binary;
    const demote = dependencies.demote;
    const precedence_for_tag = dependencies.precedence_for_tag;

    function combine(parent, left, right) {
        const prefix = parent.type;
        const direct = [left.type, right.type]
            .filter((type, index, types) =>
                types.indexOf(type) === index &&
                binary_expressions_for_tag[prefix + type] != null)
            .sort((a, b) => precedence_for_tag(b) - precedence_for_tag(a));

        let tag = direct.length === 0? null : prefix + direct[0];
        if (tag == null) {
            const promoted = Object.keys(binary_expressions_for_tag)
                .filter(tag => tag.startsWith(prefix))
                .sort((a, b) =>
                    precedence_for_tag(b.slice(prefix.length)) -
                    precedence_for_tag(a.slice(prefix.length)));
            tag = promoted.length === 0? null : promoted[0];
        }

        const expressions = tag == null? null : binary_expressions_for_tag[tag];
        if (expressions == null || expressions.combine == null) return null;
        const combined = expressions.combine(left, right);
        return combined == null? null : demote(combined);
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
        const expressions = binary_expressions_for_tag[parent.type + right.type];
        if (expressions == null || expressions.left_distribute == null) return null;
        const distributed = expressions.left_distribute(left, right);
        return distributed == null? null : demote(distributed);
    }

    function right_distribute(parent, left, right) {
        const expressions = binary_expressions_for_tag[parent.type + left.type];
        if (expressions == null || expressions.right_distribute == null) return null;
        const distributed = expressions.right_distribute(left, right);
        return distributed == null? null : demote(distributed);
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
