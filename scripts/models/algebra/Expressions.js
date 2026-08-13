'use strict';

/*
`Expression` is the immutable model for algebraic expressions.
Constructors return deeply immutable values.  Transformations never modify
an input expression; they return either the original reference or a new tree.
*/
const Expressions = (expression_hash) => {
    const freeze = Object.freeze;

    const hash = expression_hash;

    const constant = value => freeze({ type: 'constant', value: Number(value) });
    const variable = name => freeze({ type: 'variable', name: String(name) });

    function add(terms) {
        const flat = [];
        terms.forEach(term => {
            if (term.type === 'add') {
                term.contents.forEach(x => flat.push(x));
            } else {
                flat.push(term);
            }
        });
        if (flat.length === 0) return constant(0);
        if (flat.length === 1) return flat[0];
        return new Expression('add', freeze(flat));
    }

    function mul(factors) {
        const flat = [];
        factors.forEach(factor => {
            if (factor.type === 'mul') {
                factor.contents.forEach(x => flat.push(x));
            } else {
                flat.push(factor);
            }
        });
        if (flat.length === 0) return constant(1);
        if (flat.length === 1) return flat[0];
        return new Expression('mul', freeze(flat));
    }

    const div = (numerator, denominator) =>
        freeze({ type: 'div', numerator: numerator, denominator: denominator });

    const group = expression => freeze({ type: 'group', expression: expression });

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

    function coefficient_and_basis(expression) {
        if (expression.type === 'constant') {
            return { coefficient: expression.value, basis: null, key: '1' };
        }
        if (expression.type === 'variable') {
            return { coefficient: 1, basis: expression, key: `v:${expression.name}` };
        }
        if (expression.type === 'mul') {
            let coefficient = 1;
            const basis_factors = [];
            expression.contents.forEach(factor => {
                if (factor.type === 'constant') coefficient *= factor.value;
                else basis_factors.push(factor);
            });
            if (basis_factors.length === 0) {
                return { coefficient: coefficient, basis: null, key: '1' };
            }
            const basis = mul(basis_factors);
            return { coefficient: coefficient, basis: basis, key: hash.encode(basis) };
        }
        return { coefficient: 1, basis: expression, key: hash.encode(expression) };
    }

    function from_coefficient_and_basis(coefficient, basis) {
        if (basis == null) return constant(coefficient);
        if (coefficient === 0) return constant(0);
        if (coefficient === 1) return basis;
        return mul([constant(coefficient), basis]);
    }

    function negate(expression) {
        const monomial = coefficient_and_basis(expression);
        return from_coefficient_and_basis(-monomial.coefficient, monomial.basis);
    }

    function scale_term(scale, expression) {
        if (scale.type !== 'constant') return mul([scale, expression]);
        const monomial = coefficient_and_basis(expression);
        return from_coefficient_and_basis(
            scale.value * monomial.coefficient,
            monomial.basis
        );
    }

    function combine_like(left, right) {
        const a = coefficient_and_basis(left);
        const b = coefficient_and_basis(right);
        if (a.key !== b.key) return null;
        return from_coefficient_and_basis(a.coefficient + b.coefficient, a.basis);
    }

    function evaluate(expression, variables) {
        switch (expression.type) {
            case 'constant': return expression.value;
            case 'variable': return variables[expression.name];
            case 'add': return expression.contents.reduce((sum, term) => sum + evaluate(term, variables), 0);
            case 'mul': return expression.contents.reduce((product, factor) => product * evaluate(factor, variables), 1);
            case 'div': return evaluate(expression.numerator, variables) / evaluate(expression.denominator, variables);
            case 'group': return evaluate(expression.expression, variables);
            default: return NaN;
        }
    }

    function ungroup(expression) {
        return expression.type === 'group'? expression.expression : expression;
    }

    return freeze({
        constant,
        variable,
        add,
        mul,
        div,
        group,
        append_add,
        append_mul,
        remove_indexed,
        coefficient_and_basis,
        from_coefficient_and_basis,
        negate,
        scale_term,
        combine_like,
        evaluate,
        ungroup,
    });
};
