'use strict';
// HUMAN VETTED

/*
Decomposes grouplikes into a numeric power and algebraic base.
Operations in this namespace preserve that representation without making it
part of the Expression value itself.
*/
const Powers = (grouplikes, expression_shape) => {
    const shape = expression_shape;

    function from_expression(expression) {
        typecheck(expression, 'Expression');
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
        typecheck(power, 'Power');
        if (power.power === 0) return grouplikes.constant(1);
        if (power.power === 1) return power.base;
        return grouplikes.pow(power.base, power.power);
    }

    function invert(power) {
        typecheck(power, 'Power');
        return new Power(power.base, -power.power, power.key);
    }

    function combine(left, right) {
        typecheck(left, 'Power');
        typecheck(right, 'Power');
        if (left.key !== right.key) return null;
        return new Power(left.base, left.power + right.power, left.key);
    }

    function inverse(expression) {
        typecheck(expression, 'Expression');
        if (expression.type === 'constant' && expression.contents === 0) return null;
        if (expression.type === 'constant' && expression.contents === 1) return expression;
        return to_expression(invert(from_expression(expression)));
    }

    function is_inverse(expression) {
        typecheck(expression, 'Expression');
        return from_expression(expression).power === -1;
    }

    return Object.freeze({
        from_expression,
        to_expression,
        invert,
        combine,
        inverse,
        is_inverse,
    });
};
