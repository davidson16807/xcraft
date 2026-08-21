'use strict';

/*
Decomposes grouplikes into a numeric coefficient and algebraic basis.
Operations in this namespace preserve that representation without making it
part of the Expression value itself.
*/
const Scales = (grouplikes, expression_shape) => {
    const shape = expression_shape;

    function from_expression(expression) {
        switch(expression.type){
        case 'constant':
            return new Scale(expression.contents, null, '1');
        case 'variable':
            return new Scale(1, expression, shape.encode(expression));
        case 'mul': {
            const coefficient = expression.contents.reduce(
                (product, factor) => factor.type === 'constant'? product * factor.contents : product,
                1
            );
            const basis_factors = expression.contents.filter(factor => factor.type !== 'constant');
            const basis = grouplikes.mul(basis_factors);
            return basis_factors.length === 0?
                new Scale(coefficient, null, '1')
              : new Scale(coefficient, basis, shape.encode(basis));
        }
        default:
            return new Scale(1, expression, shape.encode(expression));
        }
    }

    function to_expression(scale) {
        if (scale.basis == null) return grouplikes.constant(scale.coefficient);
        if (scale.coefficient === 0) return grouplikes.constant(0);
        if (scale.coefficient === 1) return scale.basis;
        else return grouplikes.mul([
            grouplikes.constant(scale.coefficient),
            scale.basis
        ]);
    }

    function invert(scale) {
        return new Scale(-scale.coefficient, scale.basis, scale.key);
    }

    function inverse(expression) {
        return to_expression(invert(from_expression(expression)));
    }

    function is_inverse(expression) {
        return from_expression(expression).coefficient < 0;
    }

    return Object.freeze({
        from_expression,
        to_expression,
        invert,
        inverse,
        is_inverse,
    });

};
