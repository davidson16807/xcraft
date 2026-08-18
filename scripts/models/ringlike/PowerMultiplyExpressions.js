'use strict';

/*
Binary relationship between powers and multiplication (`powmul`).
*/
const PowerMultiplyExpressions = grouplikes => {

    function right_distribute(parent, left, right) {
        if (parent.type !== 'pow') return null;
        if (left.type !== 'mul') return null;
        return grouplikes.mul(left.contents.map(term => grouplikes.pow(term, right)));
    }

    return Object.freeze({
        right_distribute,
    });
};
