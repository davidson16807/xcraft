'use strict';
// HUMAN VETTED

/*
Binary relationship between power and addition Expressions.
Distributes a base across an additive exponent: a^(b+c) -> a^b * a^c.
*/
const PowerAddExpressions = (grouplikes) => {

    function left_distribute(parent, left, right) {
        if (parent.type !== 'pow') return null;
        if (right.type !== 'add') return null;
        return grouplikes.mul(
            right.contents.map(exponent => grouplikes.pow(left, exponent)));
    }

    return Object.freeze({
        left_distribute,
    });
};
