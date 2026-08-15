'use strict';
// HUMAN WRITTEN

const PowerStructure = (label) => {
    function create(base, exponent) {
        const exponent_expression = exponent instanceof Expression? exponent : new Expression('constant', exponent);
        return new Expression(label, Object.freeze([base, exponent_expression]));
    }

    function evaluator(subevaluate) {
        return expression => Math.pow(
            subevaluate(expression.contents[0]),
            subevaluate(expression.contents[1])
        );
    }

    function swap(expression, index1, index2) {
        return expression
    }

    function append(left, right) {
        return create([left, right]);
    }

    function remove(expression, index) {
        return expression;
    }

    function replace(expression, index, replacement) {
        return create(expression.contents.with(index, replacement));
    }

    function collapse(expression, index1, index2, replacement) {
        return expression;
    }

    return Object.freeze({
        label,
        create,
        swap,
        append,
        remove,
        collapse,
        evaluator, 
    });
}
