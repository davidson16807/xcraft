'use strict';

/*
Decomposes Expressions into an algebraic base and exponent, keyed by exponent.
Ordinary Expressions are promoted to the degenerate power a^1.
*/
const Exponents = (grouplikes, expression_shape) => {
    const shape = expression_shape;
    const one = grouplikes.constant(1);
    const one_key = shape.encode(one);

    function from_expression(expression) {
        if (expression.type === 'pow') {
            return new Exponent(
                expression.contents[0],
                expression.contents[1],
                shape.encode(expression.contents[1])
            );
        }
        return new Exponent(expression, one, one_key);
    }

    function to_expression(exponent) {
        if (exponent.key === one_key) return exponent.base;
        return grouplikes.pow(exponent.base, exponent.exponent);
    }

    function combine(exponent1, exponent2) {
        if (exponent1.key !== exponent2.key) return null;
        return new Exponent(
            grouplikes.mul([exponent1.base, exponent2.base]),
            exponent1.exponent,
            exponent1.key
        );
    }

    function align(exponent, target) {
        if (
            target.exponent.type === 'constant' &&
            target.exponent.contents === 0
        ) return null;

        return new Exponent(
            grouplikes.pow(
                exponent.base,
                grouplikes.div(exponent.exponent, target.exponent)
            ),
            target.exponent,
            target.key
        );
    }

    return Object.freeze({
        from_expression,
        to_expression,
        combine,
        align,
    });
};
