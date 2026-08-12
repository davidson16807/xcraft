'use strict';

/*
`Expression` is the immutable model for algebraic expressions.
Constructors return deeply immutable values.  Transformations never modify
an input expression; they return either the original reference or a new tree.
*/
const Expressions = (expression_hash) => {
    const freeze = Object.freeze;

    const hash = expression_hash

    const constant = value => freeze({ type: 'constant', value: Number(value) });
    const variable = name => freeze({ type: 'variable', name: String(name) });

    function add(terms) {
        const flat = [];
        terms.forEach(term => {
            if (term.type === 'add') {
                term.terms.forEach(x => flat.push(x));
            } else {
                flat.push(term);
            }
        });
        if (flat.length === 0) return constant(0);
        if (flat.length === 1) return flat[0];
        return freeze({ type: 'add', terms: freeze(flat) });
    }

    function mul(factors) {
        const flat = [];
        factors.forEach(factor => {
            if (factor.type === 'mul') {
                factor.factors.forEach(x => flat.push(x));
            } else {
                flat.push(factor);
            }
        });
        if (flat.length === 0) return constant(1);
        if (flat.length === 1) return flat[0];
        return freeze({ type: 'mul', factors: freeze(flat) });
    }

    const div = (numerator, denominator) =>
        freeze({ type: 'div', numerator: numerator, denominator: denominator });

    const group = expression => freeze({ type: 'group', expression: expression });

    function children(expression) {
        switch (expression.type) {
            case 'add': return expression.terms.map((_, i) => String(i));
            case 'mul': return expression.factors.map((_, i) => String(i));
            case 'div': return ['n', 'd'];
            case 'group': return ['g'];
            default: return [];
        }
    }

    function child(expression, segment) {
        switch (expression.type) {
            case 'add': return expression.terms[Number(segment)];
            case 'mul': return expression.factors[Number(segment)];
            case 'div': return segment === 'n'? expression.numerator : expression.denominator;
            case 'group': return expression.expression;
            default: return undefined;
        }
    }

    function replace_child(expression, segment, replacement) {
        switch (expression.type) {
            case 'add': {
                const terms = expression.terms.slice();
                terms[Number(segment)] = replacement;
                return add(terms);
            }
            case 'mul': {
                const factors = expression.factors.slice();
                factors[Number(segment)] = replacement;
                return mul(factors);
            }
            case 'div':
                return segment === 'n'?
                    div(replacement, expression.denominator) :
                    div(expression.numerator, replacement);
            case 'group':
                return group(replacement);
            default:
                return expression;
        }
    }

    function at(expression, segments) {
        return segments.reduce((node, segment) => child(node, segment), expression);
    }

    function replace(expression, segments, replacement) {
        if (segments.length === 0) return replacement;
        const head = segments[0];
        const tail = segments.slice(1);
        const current_child = child(expression, head);
        if (current_child == null) return expression;
        const next_child = replace(current_child, tail, replacement);
        if (next_child === current_child) return expression;
        return replace_child(expression, head, next_child);
    }

    function append_add(left, right) {
        return left.type === 'add'? add([...left.terms, right]) : add([left, right]);
    }

    function append_mul(left, right) {
        return left.type === 'mul'? mul([...left.factors, right]) : mul([left, right]);
    }

    function remove_indexed(expression, index) {
        if (expression.type === 'add') {
            return add(expression.terms.filter((_, i) => i !== index));
        }
        if (expression.type === 'mul') {
            return mul(expression.factors.filter((_, i) => i !== index));
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
            expression.factors.forEach(factor => {
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
            case 'add': return expression.terms.reduce((sum, term) => sum + evaluate(term, variables), 0);
            case 'mul': return expression.factors.reduce((product, factor) => product * evaluate(factor, variables), 1);
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
        children,
        child,
        at,
        replace,
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
