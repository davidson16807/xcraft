'use strict';

/*
Binary multiply/add relationship: multiplication distributes over addition.
The registry key guarantees that the additive operand is present; direction is
specified by the distribution method selected by the drag.
*/
const MultiplyAddExpressions = grouplikes => {

    function left_distribute(left, right) {
        return grouplikes.add(right.contents.map(term => grouplikes.mul([left, term])));
    }

    function right_distribute(left, right) {
        return grouplikes.add(left.contents.map(term => grouplikes.mul([term, right])));
    }

    return Object.freeze({ left_distribute, right_distribute });
};
