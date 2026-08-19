'use strict';

/*
Decomposes Expressions into an algebraic base and exponent, keyed by base.
Ordinary Expressions are promoted to the degenerate power a^1.

The exponent remains an Expression.  Combining powers therefore constructs
b+c structurally; auto-simplification may subsequently reduce numeric sums.
*/
const Powers = (grouplikes, expression_shape) => {
    const shape = expression_shape;
    const one = grouplikes.constant(1);
    const negative_one = grouplikes.constant(-1);

    function is_constant(expression, value) {
        return expression.type === 'constant' && expression.contents === value;
    }

    function from_expression(expression) {
        if (expression.type === 'pow') {
            const base = expression.contents[0];
            return new Power(
                base,
                expression.contents[1],
                shape.encode(base)
            );
        }

        return new Power(
            expression,
            one,
            shape.encode(expression)
        );
    }

    function to_expression(power) {
        if (is_constant(power.power, 0)) return one;
        if (is_constant(power.power, 1)) return power.base;
        return grouplikes.pow(power.base, power.power);
    }

    function invert(power) {
        return new Power(
            power.base,
            grouplikes.simplify(grouplikes.mul([negative_one, power.power])),
            power.key
        );
    }

    function combine(power1, power2) {
        if (power1.key !== power2.key) return null;
        return new Power(
            power1.base,
            grouplikes.add([power1.power, power2.power]),
            power1.key
        );
    }

    return Object.freeze({
        from_expression,
        to_expression,
        invert,
        combine,
    });
};
