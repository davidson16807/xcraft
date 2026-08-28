'use strict';
// HUMAN VETTED

/*
`Grouplikes` manages operations for a set of grouplike structures.
Each operation follows from the properties of a group.

Operations here are unambiguously defined by the structure. 
Unsupported operations are represented by returning the original expression 
(if the operation is unary) or null (if the operation is binary).
Return types are deeply immutable expressions. 
All functions are pure. 
*/
const Grouplikes = (grouplike_expressions_for_tag) => {

    const types = Object.freeze(Object.keys(grouplike_expressions_for_tag));
    const structures = Object.freeze(Object.values(grouplike_expressions_for_tag));

    const constant = value => new Expression('constant', Number(value));
    const variable = name => new Expression('variable', String(name));

    const add = grouplike_expressions_for_tag['add'].create;
    const mul = grouplike_expressions_for_tag['mul'].create;
    const pow = (base, exponent) => grouplike_expressions_for_tag['pow'].create([base, exponent]);
    const log = (base, result) => grouplike_expressions_for_tag['log'].create([base, result]);
    const root = (exponent, result) => grouplike_expressions_for_tag['root'].create([exponent, result]);
    const harmonic = contents => grouplike_expressions_for_tag['harmonic'].create(contents);

    // provided only as a convenience
    const div = (numerator, denominator) => mul([numerator, pow(denominator, constant(-1))]);

    const whole_threshold = 1e-10;

    function _is_whole(value) {
        return Math.abs(value - Math.round(value)) <= whole_threshold;
    }

    function _is_reciprocal(expression) {
        return expression.type === 'pow' &&
            expression.contents[1].type === 'constant' &&
            expression.contents[1].contents === -1;
    }

    function _contains_reciprocal(expression) {
        if (_is_reciprocal(expression)) return true;
        return Array.isArray(expression.contents) &&
            expression.contents.some(_contains_reciprocal);
    }

    /*
    Constant arithmetic may collapse to a Number unless doing so would turn an
    exact reciprocal expression into a non-integral decimal approximation.
    */
    function _constant_result(expression) {
        const value = evaluate(expression, {});
        if (!Number.isFinite(value)) return null;
        if (_contains_reciprocal(expression) && !_is_whole(value)) return null;
        return constant(_is_whole(value)? Math.round(value) : value);
    }

    function simplify(expression) {
        typecheck(expression, 'Expression');
        const structure = grouplike_expressions_for_tag[expression.type];
        if (structure == null) return expression;
        return structure.simplify(expression, simplify, evaluate, _constant_result);
    }

    function append(type, left, right) {
        typecheck(type, 'String');
        typecheck(left, 'Expression');
        typecheck(right, 'Expression');
        const structure = grouplike_expressions_for_tag[type];
        if (structure == null) return left;
        return structure.append(left, right);
    }

    function combine(type, left, right) {
        typecheck(type, 'String');
        typecheck(left, 'Expression');
        typecheck(right, 'Expression');
        const structure = grouplike_expressions_for_tag[type];
        if (structure == null) return null;

        const combined = structure.combine(left, right);
        if (combined != null) return combined;

        return _constant_result(
            new Expression(type, Object.freeze([left, right]))
        );
    }

    function commute(expression, index1, index2) {
        typecheck(expression, 'Expression');
        typecheck(index1, 'Number');
        typecheck(index2, 'Number');
        const structure = grouplike_expressions_for_tag[expression.type];
        if (structure == null) return expression;
        return structure.commute(expression, index1, index2);
    }

    function _divide(parent, source, direction) {
        typecheck(parent, 'Expression+1');
        typecheck(source, 'Expression');
        if (parent == null) return null;
        const structure = grouplike_expressions_for_tag[parent.type];
        return structure == null? null : structure[direction](parent, source);
    }

    function left_divide(parent, source) {
        return _divide(parent, source, 'left_divide');
    }

    function right_divide(parent, source) {
        return _divide(parent, source, 'right_divide');
    }

    function collapse(expression, index1, index2, replacement) {
        typecheck(expression, 'Expression');
        typecheck(index1, 'Number');
        typecheck(index2, 'Number');
        typecheck(replacement, 'Expression');
        const structure = grouplike_expressions_for_tag[expression.type];
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
        const structure = grouplike_expressions_for_tag[expression.type];
        if (structure != null) { return structure.evaluator(subevaluate)(expression); }
        switch (expression.type) {
            case 'constant': return expression.contents;
            case 'variable': return variables[expression.contents];
            default: return NaN;
        }
    }

    const evaluate = (expression, variables) => {
        typecheck(expression, 'Expression+Relation');
        return evaluator(variables)(expression);
    };

    return Object.freeze({
        types,
        structures,
        constant,
        variable,
        add,
        mul,
        pow,
        log,
        root,
        harmonic,
        div,
        append,
        combine,
        commute,
        left_divide,
        right_divide,
        collapse,
        simplify,
        evaluate,
    });
};
