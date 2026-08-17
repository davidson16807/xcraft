'use strict';
// HUMAN VETTED

/*
`Expression` is the immutable model for algebraic expressions.
Constructors return deeply immutable values.  Transformations never modify
an input expression; they return either the original reference or a new tree.
*/
const MonoidlikeExpressions = (monoidlike_expressions_for_tag) => {

    const constant = value => new Expression('constant', Number(value));
    const variable = name => new Expression('variable', String(name));

    const add = monoidlike_expressions_for_tag['add'].create;
    const mul = monoidlike_expressions_for_tag['mul'].create;
    const pow = (base, exponent) => monoidlike_expressions_for_tag['pow'].create([base, exponent]);

    // provided only as a convenience
    const div = (numerator, denominator) => mul([numerator, pow(denominator, constant(-1))]);

    const whole_threshold = 1e-10;

    function is_whole(value) {
        return Math.abs(value - Math.round(value)) <= whole_threshold;
    }

    function is_reciprocal(expression) {
        return expression.type === 'pow' &&
            expression.contents[1].type === 'constant' &&
            expression.contents[1].contents === -1;
    }

    function contains_reciprocal(expression) {
        if (is_reciprocal(expression)) return true;
        return Array.isArray(expression.contents) &&
            expression.contents.some(contains_reciprocal);
    }

    /*
    Constant arithmetic may collapse to a Number unless doing so would turn an
    exact reciprocal expression into a non-integral decimal approximation.
    */
    function constant_result(expression) {
        const value = evaluate(expression, {});
        if (!Number.isFinite(value)) return null;
        if (contains_reciprocal(expression) && !is_whole(value)) return null;
        return constant(is_whole(value)? Math.round(value) : value);
    }

    function simplify(expression) {
        const simplified_constant = constant_result(expression);
        if (simplified_constant != null) return simplified_constant;
        if (!Array.isArray(expression.contents)) return expression;

        let contents = expression.contents.map(simplify);

        // Addition and multiplication are associative, so constant-valued
        // siblings can be folded even when the entire expression still
        // depends on a variable: e.g. x + 7 - 1 -> x + 6.
        // TODO: This hardcodes expression types and should be replaced 
        // when a suitable replacement becomes available
        if (expression.type === 'add' || expression.type === 'mul') {
            const constants = contents
                .map((item, index) => ({ item:item, index:index, value:evaluate(item, {}) }))
                .filter(item => Number.isFinite(item.value));

            if (constants.length > 1) {
                const constant_expression = expression.with({
                    contents: Object.freeze(constants.map(item => item.item)),
                });
                const combined = constant_result(constant_expression);
                if (combined != null) {
                    const first = constants[0].index;
                    const constant_indexes = new Set(constants.map(item => item.index));
                    contents = contents.flatMap((item, index) =>
                        index === first? [combined] :
                        constant_indexes.has(index)? [] : [item]
                    );
                }
            }
        }

        if (
            contents.length === expression.contents.length &&
            contents.every((item, i) => item === expression.contents[i])
        ) return expression;
        return expression.with({ contents: Object.freeze(contents) });
    }

    function append(type, left, right) {
        const structure = monoidlike_expressions_for_tag[type];
        if (structure == null) return left;
        return structure.append(left, right);
    }

    function combine(type, left, right) {
        const structure = monoidlike_expressions_for_tag[type];
        if (structure == null) return null;

        const combined = structure.combine(left, right);
        if (combined != null) return combined;

        return constant_result(
            new Expression(type, Object.freeze([left, right]))
        );
    }

    function swap(expression, index1, index2) {
        const structure = monoidlike_expressions_for_tag[expression.type];
        if (structure == null) return expression;
        return structure.swap(expression, index1, index2);
    }

    function cancel(expression, index) {
        const structure = monoidlike_expressions_for_tag[expression.type];
        if (structure == null) return expression;
        return structure.cancel(expression, index);
    }

    function collapse(expression, index1, index2, replacement) {
        const structure = monoidlike_expressions_for_tag[expression.type];
        if (structure == null) return expression;
        const lo = Math.min(index1, index2);
        const hi = Math.max(index1, index2);
        const contents = expression.contents.slice();
        contents[lo] = replacement;
        contents.splice(hi, 1);
        return structure.create(contents);
    }

    const evaluator = variables => expression => {
        const subevaluate = expression => evaluator(variables)(expression);
        const structure = monoidlike_expressions_for_tag[expression.type];
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

    return Object.freeze({
        constant,
        variable,
        add,
        mul,
        pow,
        div,
        append,
        combine,
        swap,
        cancel,
        collapse,
        simplify,
        evaluate,
        precedence,
    });
};
