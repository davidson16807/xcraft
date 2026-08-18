'use strict';

/*
Binary pow/mul relationship.  Currently implements the base-product direction
of (ab)^c -> a^c * b^c.  Other powmul laws can be added here without parent
operation guards because Ringlike owns contextual dispatch.
*/
const PowerMultiplyExpressions = grouplikes => {

    function right_distribute(left, right) {
        return grouplikes.mul(
            left.contents.map(term => grouplikes.pow(term, right)));
    }

    return Object.freeze({ right_distribute });
};
