'use strict';

/*
Binary relationship between power and multiplication Expressions.
Distributes a power across a multiplicative base: (ab)^c -> a^c * b^c.
*/
const PowerMultiplyExpressions = (grouplikes) => {

    function right_distribute(parent, left, right) {
        if (parent.type !== 'pow') return null;
        if (left.type !== 'mul') return null;
        return grouplikes.mul(
            left.contents.map(term => grouplikes.pow(term, right)));
    }

    return Object.freeze({
        right_distribute,
    });
};
