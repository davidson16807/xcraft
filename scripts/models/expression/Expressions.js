'use strict';
// HUMAN VETTED

/*
`Expression` is the immutable model for algebraic expressions.
Constructors return deeply immutable values.  Transformations never modify
an input expression; they return either the original reference or a new tree.
*/
const Expressions = () => {
    const freeze = Object.freeze;

    const constant = value => new Expression('constant', Number(value));
    const variable = name => new Expression('variable', String(name));

    const group = (label, identity) => (terms) => {
        const flat = [];
        terms.forEach(term => {
            if (term.type === label) {
                term.contents.forEach(x => flat.push(x));
            } else {
                flat.push(term);
            }
        });
        if (flat.length === 0) return constant(identity);
        if (flat.length === 1) return flat[0];
        else return new Expression(label, freeze(flat));
    }

    const add = group('add', 0);
    const mul = group('mul', 1);

    function pow(base, exponent) {
        const exponent_expression = exponent instanceof Expression? exponent : constant(exponent);
        return new Expression('pow', freeze([base, exponent_expression]));
    }

    function reciprocal(expression) {
        return is_reciprocal(expression)? expression.contents[0] : pow(expression, constant(-1));
    }

    const div = (numerator, denominator) => mul([numerator, reciprocal(denominator)]);

    function append_add(left, right) {
        return left.type === 'add'? add([...left.contents, right]) : add([left, right]);
    }

    function append_mul(left, right) {
        return left.type === 'mul'? mul([...left.contents, right]) : mul([left, right]);
    }

    function remove_indexed(expression, index) {
        if (expression.type === 'add') {
            return add(expression.contents.filter((_, i) => i !== index));
        }
        if (expression.type === 'mul') {
            return mul(expression.contents.filter((_, i) => i !== index));
        }
        return expression;
    }

    function evaluate(expression, variables) {
        switch (expression.type) {
            case 'constant': return expression.contents;
            case 'variable': return variables[expression.contents];
            case 'add': return expression.contents.reduce((sum, term) => sum + evaluate(term, variables), 0);
            case 'mul': return expression.contents.reduce((product, factor) => product * evaluate(factor, variables), 1);
            case 'pow': return Math.pow(
                evaluate(expression.contents[0], variables),
                evaluate(expression.contents[1], variables)
            );
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

    return freeze({
        constant,
        variable,
        add,
        mul,
        pow,
        reciprocal,
        is_reciprocal,
        div,
        append_add,
        append_mul,
        remove_indexed,
        evaluate,
        precedence,
    });
};
