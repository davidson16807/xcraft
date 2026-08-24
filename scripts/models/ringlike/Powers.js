'use strict';

/*
Decomposes grouplikes into a numeric power and algebraic base.
Operations in this namespace preserve that representation without making it
part of the Expression value itself.
*/
const Powers = (grouplikes, expression_shape) => {
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
        if (power.power === 0) return grouplikes.constant(1);
        if (power.power === 1) return power.base;
        return grouplikes.pow(power.base, power.power);
    }

    function invert(power) {
        return new Power(power.base, -power.power, power.key);
    }

    function inverse(expression) {
        if (expression.type === 'constant' && expression.contents === 0) return null;
        if (expression.type === 'constant' && expression.contents === 1) return expression;
        return to_expression(invert(from_expression(expression)));
    }

    function is_inverse(expression) {
        return from_expression(expression).power === -1;
    }

    return Object.freeze({
        from_expression,
        to_expression,
        invert,
        inverse,
        is_inverse,
    });
};
