'use strict';
// HUMAN VETTED

class Equation {
    constructor(left, right) {
        this.left = left;
        this.right = right;
        Object.freeze(this);
    }

    with(attributes) {
        return new Equation(
            attributes.left  != null? attributes.left  : this.left,
            attributes.right != null? attributes.right : this.right,
        );
    }
}
