'use strict';

/*
In math, a "monoid" is a structure featuring an operation that has an identity and is everywhere associative.
`Monoid` manages expressions that only require awareness of a single operation with these properties.
so `Monoid` can swap, append, and remove but not invert, combine, or distribute,
since expressing those either requires other properties or knowledge of operations outside the monoid.

label           String
is_commutative  Boolean
identity        Expression
evaluator       (Expression->T) -> (Expression->T)
                e.g. subevaluate => expression => expression.contents.reduce((accumulator, item) => accumulator + subevaluate(item, variables), 0)
*/
const MonoidStructure = (label, identity, is_commutative, evaluator) => {
    function create(contents) {
        const flat = [];
        contents.forEach(term => {
            if (term.type === label) {
                term.contents.forEach(x => flat.push(x));
            } else {
                flat.push(term);
            }
        });
        if (flat.length === 0) return identity;
        if (flat.length === 1) return flat[0];
        else return new Expression(label, Object.freeze(flat));
    }

    function is_identity(expression) {
        return expression.type === identity.type && expression.contents === identity.contents;
    }

    function swap(expression, index1, index2) {
        if (!is_commutative) { return expression; }
        const contents = expression.contents.slice();
        [contents[index1], contents[index2]] = [contents[index2], contents[index1]];
        return create(contents);
    }

    function append(left, right) {
        return left.type === label? create([...left.contents, right]) : create([left, right]);
    }

    function remove(expression, index) {
        const contents = expression.contents.slice();
        contents.splice(index, 1);
        return expression.type !== label? expression : create(contents);
    }

    function collapse(expression, index1, index2, replacement) {
        const low = Math.min(index1, index2);
        const high = Math.max(index1, index2);
        const contents = expression.contents.slice();
        contents[low] = replacement;
        contents.splice(high, 1);
        return create(contents);
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

    const evaluator = variables => expression => {
        const subevaluate = expression => evaluator(variables)(expression);
        const structure = structures[expression.type];
        if (structure != null) { return structure.evaluator(subevaluate)(expression); }
        switch (expression.type) {
            case 'constant': return expression.contents;
            case 'variable': return variables[expression.contents];
            default: return NaN;
        }
    }

    const evaluate = (expression, variables) => evaluator(variables)(expression);

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
        remove,
        collapse,
        precedence,
        evaluate,
    });
};
