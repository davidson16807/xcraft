'use strict';

/*
Decomposes expressions into a numeric coefficient and algebraic basis.
Operations in this namespace preserve that representation without making it
part of the Expression value itself.
*/
const ExpressionsAndCoefficientBasis = (expressions, expression_shape) => {
    const shape = expression_shape;

    function from_expression(expression) {
        switch(expression.type){
        case 'constant':
            return { coefficient: expression.contents, basis: null, key: '1' };
        case 'variable':
            return { coefficient: 1, basis: expression, key: shape.encode(expression) };
        case 'mul':
            const coefficient = expression.contents.reduce((product, factor) => factor.type==='constant'? product *= factor.contents : 0, 1);
            const basis_factors = expression.contents.filter((coefficient, factor) => factor.type!=='constant');
            const basis = expressions.mul(basis_factors);
            return (basis_factors.length === 0)? 
                { coefficient: coefficient, basis: null, key: '1' }
              : { coefficient: coefficient, basis: basis, key: shape.encode(basis) };
        default:
            return { coefficient: 1, basis: expression, key: shape.encode(expression) };
        }
    }

    function to_expression(coefficient, basis) {
        if (basis == null) return expressions.constant(coefficient);
        if (coefficient === 0) return expressions.constant(0);
        if (coefficient === 1) return basis;
        return expressions.mul([expressions.constant(coefficient), basis]);
    }

    function negate(expression) {
        const monomial = from_expression(expression);
        return to_expression(-monomial.coefficient, monomial.basis);
    }

    function scale_term(scale, expression) {
        if (scale.type !== 'constant') return expressions.mul([scale, expression]);
        const monomial = from_expression(expression);
        return to_expression(
            scale.contents * monomial.coefficient,
            monomial.basis
        );
    }

    function combine_like(left, right) {
        const a = from_expression(left);
        const b = from_expression(right);
        if (a.key !== b.key) return null;
        return to_expression(a.coefficient + b.coefficient, a.basis);
    }

    return Object.freeze({
        from_expression,
        to_expression,
        negate,
        scale_term,
        combine_like,
    });
};
