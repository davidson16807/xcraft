'use strict';

/*
`Expression` is the immutable model for algebraic expressions.
Constructors return deeply immutable values.  Transformations never modify
an input expression; they return either the original reference or a new tree.
*/
const Expressions = (structures) => {

    const constant = value => new Expression('constant', Number(value));
    const variable = name => new Expression('variable', String(name));

    const add = structures['add'].create;
    const mul = structures['mul'].create;
    const pow = structures['pow'].create;

    function reciprocal(expression) {
        return is_reciprocal(expression)? expression.contents[0] : pow(expression, constant(-1));
    }

    const div = (numerator, denominator) => mul([numerator, reciprocal(denominator)]);

    function append(type, left, right) {
        const structure = structures[type];
        if (structure == null) return left;
        return structure.append(left, right);
    }

    function swap(expression, index1, index2) {
        const structure = structures[expression.type];
        if (structure == null) return expression;
        return structure.swap(expression, index1, index2);
    }

    function remove(expression, index) {
        const structure = structures[expression.type];
        if (structure == null) return expression;
        return structure.remove(expression, index);
    }

    function collapse(expression, index1, index2, replacement) {
        const structure = structures[expression.type];
        if (structure == null) return expression;
        return structure.collapse(expression, index1, index2, replacement);
    }

    function evaluate(expression, variables) {
        const subevaluate = child => evaluate(child, variables);
        const structure = structures[expression.type];
        if (structure != null) return structure.evaluator(subevaluate)(expression);
        switch (expression.type) {
            case 'constant': return expression.contents;
            case 'variable': return variables[expression.contents];
            default: return NaN;
        }
    }

    function precedence(expression) {
        switch (expression.type) {
            case 'add': return 1;
            case 'mul': return 2;
            case 'pow': return 3;
            default: return 4;
        }
    }

    function is_reciprocal(expression) {
        return expression.type === 'pow' &&
            expression.contents[1].type === 'constant' &&
            expression.contents[1].contents === -1;
    }

    return Object.freeze({
        constant,
        variable,
        add,
        mul,
        pow,
        reciprocal,
        is_reciprocal,
        div,
        append,
        swap,
        remove,
        collapse,
        precedence,
        evaluate,
    });
};
