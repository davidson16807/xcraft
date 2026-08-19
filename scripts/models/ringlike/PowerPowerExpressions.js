'use strict';

/*
Binary relationship between nested power Expressions.

For now this handles the invertible nested-power case directly:
    (a^b)^(1/b) -> a
    (a^(1/b))^b -> a

General exponent composition (a^b)^c -> a^(bc) remains a separate roadmap step.
*/
const PowerPowerExpressions = (powers, expression_shape) => {
    const shape = expression_shape;

    function combine(parent, source, target) {
        if (parent.type !== 'pow') return null;
        if (parent.contents[0].type !== 'pow') return null;

        const inner = powers.from_expression(parent.contents[0]);
        const inverse = powers.to_expression(
            powers.invert(
                powers.from_expression(inner.power)));
        const outer = parent.contents[1];

        return shape.encode(outer) === shape.encode(inverse)? inner.base : null;
    }

    return Object.freeze({
        combine,
    });
};
