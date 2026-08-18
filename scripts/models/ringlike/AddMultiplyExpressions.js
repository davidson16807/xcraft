'use strict';

/*
Binary add/multiply relationship.  Operands are interpreted as multiplicative
scales, so lower structures are promoted by Scales.from_expression().
*/
const AddMultiplyExpressions = scales => {

    function combine(left, right) {
        const a = scales.from_expression(left);
        const b = scales.from_expression(right);
        const combined = scales.combine(a, b);
        return combined == null? null : scales.to_expression(combined);
    }

    return Object.freeze({ combine });
};
