'use strict';

/*
Decomposes expressions into a numeric power and algebraic base.
Operations in this namespace preserve that representation without making it
part of the Expression value itself.
*/
const Powers = (expressions, expression_shape) => {
    const shape = expression_shape;

    function from_expression(expression) {
        if (
            expression.type === 'pow' &&
            expression.contents[1].type === 'constant'
        ) {
            const base = expression.contents[0];
            return new Power(
                base,
                expression.contents[1].contents,
                shape.encode(base)
            );
        }

        return new Power(
            expression,
            1,
            shape.encode(expression)
        );
    }

    function to_expression(power) {
        if (power.power === 0) return expressions.constant(1);
        if (power.power === 1) return power.base;
        return expressions.pow(power.base, power.power);
    }

    function combine(power1, power2) {
        if (power1.key !== power2.key) return null;
        return new Power(
            power1.base,
            power1.power + power2.power,
            power1.key
        );
    }

    return Object.freeze({
        from_expression,
        to_expression,
        combine,
    });
};
