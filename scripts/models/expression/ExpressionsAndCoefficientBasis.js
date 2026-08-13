'use strict';

/*
Decomposes expressions into a numeric coefficient and algebraic basis.
Operations in this namespace preserve that representation without making it
part of the Expression value itself.
*/
const ExpressionsAndCoefficientBasis = (expressions, expression_shape) => {
    const shape = expression_shape;

    function coefficient_and_basis(expression) {
        if (expression.type === 'constant') {
            return { coefficient: expression.contents, basis: null, key: '1' };
        }
        if (expression.type === 'variable') {
            return { coefficient: 1, basis: expression, key: `v:${expression.contents}` };
        }
        if (expression.type === 'mul') {
            let coefficient = 1;
            const basis_factors = [];
            expression.contents.forEach(factor => {
                if (factor.type === 'constant') coefficient *= factor.contents;
                else basis_factors.push(factor);
            });
            if (basis_factors.length === 0) {
                return { coefficient: coefficient, basis: null, key: '1' };
            }
            const basis = expressions.mul(basis_factors);
            return { coefficient: coefficient, basis: basis, key: shape.encode(basis) };
        }
        return { coefficient: 1, basis: expression, key: shape.encode(expression) };
    }

    function from_coefficient_and_basis(coefficient, basis) {
        if (basis == null) return expressions.constant(coefficient);
        if (coefficient === 0) return expressions.constant(0);
        if (coefficient === 1) return basis;
        return expressions.mul([expressions.constant(coefficient), basis]);
    }

    function negate(expression) {
        const monomial = coefficient_and_basis(expression);
        return from_coefficient_and_basis(-monomial.coefficient, monomial.basis);
    }

    function scale_term(scale, expression) {
        if (scale.type !== 'constant') return expressions.mul([scale, expression]);
        const monomial = coefficient_and_basis(expression);
        return from_coefficient_and_basis(
            scale.contents * monomial.coefficient,
            monomial.basis
        );
    }

    function combine_like(left, right) {
        const a = coefficient_and_basis(left);
        const b = coefficient_and_basis(right);
        if (a.key !== b.key) return null;
        return from_coefficient_and_basis(a.coefficient + b.coefficient, a.basis);
    }

    return Object.freeze({
        coefficient_and_basis,
        from_coefficient_and_basis,
        negate,
        scale_term,
        combine_like,
    });
};
