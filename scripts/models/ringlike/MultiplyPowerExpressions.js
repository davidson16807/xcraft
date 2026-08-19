'use strict';

/*
Binary relationship between multiplication and power Expressions.

Priority:
1. common base:     a^b * a^c -> a^(b+c)
2. common exponent: a^c * b^c -> (ab)^c
3. align exponent:  a^d * b^c -> (a^(d/c)b)^c
*/
const MultiplyPowerExpressions = (powers, exponents) => {

    function combine(parent, source, target) {
        if (parent.type !== 'mul') return null;

        const a = powers.from_expression(source);
        const b = powers.from_expression(target);
        const combined_power = powers.combine(a, b);
        if (combined_power != null) return powers.to_expression(combined_power);

        // a*b is already the degenerate c=1 form, so treating two ordinary
        // factors as equal-exponent powers would only recreate the parent.
        if (source.type !== 'pow' && target.type !== 'pow') return null;

        const x = exponents.from_expression(source);
        const y = exponents.from_expression(target);
        const combined_exponent = exponents.combine(x, y);
        if (combined_exponent != null)
            return exponents.to_expression(combined_exponent);

        // The drop target supplies the exponent to align to.
        if (target.type !== 'pow') return null;
        const aligned = exponents.align(x, y);
        if (aligned == null) return null;
        const combined_aligned = exponents.combine(aligned, y);
        return combined_aligned == null? null :
            exponents.to_expression(combined_aligned);
    }

    return Object.freeze({
        combine,
    });
};
