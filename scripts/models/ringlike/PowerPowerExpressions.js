'use strict';

/*
Binary relationship between nested power Expressions.

Combines nested exponents:
    (a^b)^c -> a^(bc)

Reciprocal exponent pairs are recognized first so symbolic inverse cases reduce
exactly rather than leaving products such as b*b^-1 for a later simplifier:
    (a^b)^(1/b) -> a
    (a^(1/b))^b -> a
*/
const PowerPowerExpressions = (grouplikes, powers, expression_shape) => {
    const shape = expression_shape;

    function combine(parent, source, target) {
        if (parent.type !== 'pow') return null;
        if (parent.contents[0].type !== 'pow') return null;
        if (source !== parent.contents[1] || target !== parent.contents[0]) return null;

        const inner = powers.from_expression(parent.contents[0]);
        const outer = parent.contents[1];
        const inverse = powers.to_expression(
            powers.invert(
                powers.from_expression(inner.power)));

        if (shape.encode(outer) === shape.encode(inverse)) return inner.base;

        return grouplikes.pow(
            inner.base,
            grouplikes.mul([inner.power, outer])
        );
    }

    return Object.freeze({
        combine,
    });
};
