'use strict';

/*
Binary relationship between power and multiplication Expressions.

Multiplication in the base distributes the exponent:
    (ab)^c -> a^c * b^c

Multiplication in the exponent factors into nested powers:
    a^(bc) -> (a^b)^c
*/
const PowerMultiplyExpressions = (grouplikes) => {

    function left_distribute(parent, left, right) {
        if (parent.type !== 'pow') return null;
        if (right.type !== 'mul') return null;
        return right.contents.reduce(
            (base, exponent) => grouplikes.pow(base, exponent),
            left
        );
    }

    function right_distribute(parent, left, right) {
        if (parent.type !== 'pow') return null;
        if (left.type !== 'mul') return null;
        return grouplikes.mul(
            left.contents.map(term => grouplikes.pow(term, right)));
    }

    return Object.freeze({
        left_distribute,
        right_distribute,
    });
};
